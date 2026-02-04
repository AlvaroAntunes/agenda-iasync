import datetime as dt
import time
from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase
from dateutil.relativedelta import relativedelta
from app.services.payment_service import atualizar_vencimento_assinatura_asaas

router = APIRouter()
supabase = get_supabase()

@router.post("/subscriptions/sync/{clinic_id}")
def sync_subscription(clinic_id: str):
    """
    Sincroniza o estado da assinatura, aplicando downgrades agendados
    se o ciclo atual já tiver finalizado.
    """
    MAX_RETRIES = 3
    retry_delay = 0.5

    for attempt in range(MAX_RETRIES):
        try:
            # 1. Buscar Sessão Agendada (esperando_troca ou processando_troca para recuperação)
            sessao_query = supabase.table('checkout_sessions')\
                .select('*')\
                .eq('clinic_id', clinic_id)\
                .in_('status', ['esperando_troca', 'processando_troca'])\
                .order('created_at', desc=True)\
                .limit(1)\
                .maybe_single()\
                .execute()

            # Se a query falhou
            if not sessao_query or not sessao_query.data:
                return {"status": "no_pending_switch"}
                
            sessao = sessao_query.data
            
            # 2. Buscar Assinatura Ativa (A mais recente)
            sub_atual_query = supabase.table('assinaturas')\
                .select('*')\
                .eq('clinic_id', clinic_id)\
                .order('created_at', desc=True)\
                .limit(1)\
                .maybe_single()\
                .execute()
                
            should_switch = False
            sub = None
            
            if not sub_atual_query.data:
                should_switch = True
            else:
                sub = sub_atual_query.data
                
                # Validação segura da data fim
                if not sub.get('data_fim'):
                     should_switch = True 
                     print("⚠️ Assinatura atual sem data_fim. Forçando troca.")
                else:
                     try:
                        # Tenta parsear com suporte a timezone (Z) e milissegundos
                        try:
                            data_fim = dt.datetime.fromisoformat(sub['data_fim'].replace('Z', '+00:00'))
                        except ValueError:
                             data_fim = dt.datetime.fromisoformat(sub['data_fim'].split('.')[0])
                             
                        agora = dt.datetime.now(dt.timezone.utc) if data_fim.tzinfo else dt.datetime.now()
                        
                        if agora > data_fim:
                            should_switch = True
                            print(f"🔄 Ciclo da assinatura antiga encerrou em {data_fim}. Aplicando troca.")
                        else:
                            print(f"⏳ Aguardando fim do ciclo em {data_fim} para aplicar troca.")
                     except Exception as e:
                        print(f"⚠️ Erro ao parsear data_fim da assinatura: {e}. Forçando troca.")
                        should_switch = True

            if should_switch:
                # --- OPTIMISTIC LOCKING / RECOVERY LOGIC ---
                if sessao['status'] == 'esperando_troca':
                    # Tentamos "travar" a sessão mudando status para 'processando_troca'
                    # REMOVIDO: 'updated_at': dt.datetime.now().isoformat() pois coluna não existe
                    update_lock = supabase.table('checkout_sessions')\
                        .update({'status': 'processando_troca'})\
                        .eq('id', sessao['id'])\
                        .eq('status', 'esperando_troca')\
                        .execute()
                        
                    if not update_lock.data:
                         # Se falhou em travar, pode ser concorrência
                         print(f"🔒 Lock Miss: Sessão {sessao['id']} disputada.")
                         return {"status": "processing_or_done"}
                         
                    # Atualizamos a variável local
                    sessao = update_lock.data[0]
                    print(f"🔑 Lock Acquired: Iniciando troca de plano para sessão {sessao['id']}...")
                    
                elif sessao['status'] == 'processando_troca':
                    print(f"🔄 Recuperando sessão {sessao['id']} interrumpida (processando_troca)...")
                    # Se já está processando, seguimos em frente (Retry logic)
                    
                    
                # --- CYCLE SHIFT LOGIC ---
                # O início do novo ciclo deve ser o fim do anterior para manter continuidade
                data_inicio_real = dt.datetime.now()
                
                if sub and sub.get('data_fim'):
                    try:
                        # Tenta usar a data fim da assinatura anterior
                        d_fim = dt.datetime.fromisoformat(sub['data_fim'].replace('Z', '+00:00'))
                        # Se tem timezone, garante que o fallback now também tenha (embora aqui já tenhamos d_fim)
                        data_inicio_real = d_fim
                    except Exception as e:
                        print(f"⚠️ Erro ao usar data_fim antiga como inicio: {e}")
                
                if sessao.get('ciclo') in ['anual', 'annual', 'YEARLY']:
                    data_fim_nova = data_inicio_real + relativedelta(years=1)
                    proximo_vencimento = data_fim_nova 
                else:
                    data_fim_nova = data_inicio_real + relativedelta(months=1)
                    proximo_vencimento = data_fim_nova 
                    
                # Dados para atualização
                dados_assinatura = {
                    "clinic_id": clinic_id,
                    "plan_id": sessao['plan_id'],
                    "asaas_id": sessao['asaas_id'],
                    "status": "ativa",
                    "ciclo": sessao.get('ciclo', 'mensal'),
                    "data_inicio": data_inicio_real.isoformat(),
                    "data_fim": data_fim_nova.isoformat(),
                    "updated_at": dt.datetime.now().isoformat()
                }
                
                # VERIFICAÇÃO DE IDEMPOTÊNCIA DA ASSINATURA (Sem checkout_sessions.updated_at)
                should_update_db = True
                if sub:
                    # Se a assinatura mais recente JÁ É do plano novo e está ativa,
                    # e estamos recuperando uma sessão 'processando_troca',
                    # é muito provável que já tenhamos feito a troca antes de cair a conexão.
                    if sub.get('plan_id') == sessao['plan_id'] and sub.get('status') == 'ativa':
                         print("✅ Assinatura já parece atualizada (Plano já é o novo). Pulando escrita no DB.")
                         should_update_db = False

                # Upsert
                if should_update_db:
                    if sub_atual_query.data:
                        # Se já existe assinatura, atualizamos. 
                        # IMPORTANTE: Se o check de idempotência acima falhou (não detectou duplicidade),
                        # este update sobrescreve. Isso é "seguro" no sentido de que o cliente não fica sem assinatura,
                        # apenas reseta a data de inicio/fim para "agora".
                        supabase.table('assinaturas').update(dados_assinatura).eq('id', sub_atual_query.data['id']).execute()
                    else:
                        supabase.table('assinaturas').insert(dados_assinatura).execute()
                     
                # 3. Atualizar vencimento no Asaas
                # Essa operação é segura de repetir (idempotente por natureza se a data for a mesma)
                try:
                    atualizar_vencimento_assinatura_asaas(sessao['asaas_id'], proximo_vencimento.strftime("%Y-%m-%d"))
                except Exception as e:
                    print(f"⚠️ Erro não-crítico ao atualizar Asaas (pode já ter ido): {e}")

                # Marcar sessão como concluída
                supabase.table('checkout_sessions').update({'status': 'concluido'}).eq('id', sessao['id']).execute()
                
                return {"status": "switched", "new_plan": sessao['plan_id']}
            
            # --- Retornar info para o frontend se estiver esperando ---
            # Buscar nome do novo plano
            plano_novo_query = supabase.table('planos').select('nome').eq('id', sessao['plan_id']).maybe_single().execute()
            nome_plano_novo = plano_novo_query.data['nome'] if plano_novo_query.data else "Novo Plano"

            # Se chegamos aqui e status é 'processando_troca', significa que should_switch foi False.
            # Isso é estranho (sessão presa em processando mas data ainda não chegou?).
            # Nesse caso, retornamos waiting normal. (Pode ter ficado presa de um teste anterior)
            
            switch_date = sub_atual_query.data['data_fim'] if sub_atual_query and sub_atual_query.data else None
            return {
                "status": "waiting", 
                "switch_date": switch_date,
                "new_plan_name": nome_plano_novo
            }
            
        except Exception as e:
            msg = str(e)
            print(f"⚠️ [Tentativa {attempt+1}/{MAX_RETRIES}] Erro sync: {msg}")
            
            # Se for erro de conexão ou desconexão do servidor, tentamos novamente
            if "Server disconnected" in msg or "Connection refused" in msg or "RemoteProtocolError" in msg:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(retry_delay)
                    continue
            
            # Se não for erro de conexão ou última tentativa falhou, lança o erro
            raise HTTPException(status_code=500, detail=msg)
