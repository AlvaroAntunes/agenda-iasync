import os
import datetime as dt
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Request, Header, HTTPException, Body
from dotenv import load_dotenv
from app.core.database import get_supabase
from app.services.payment_service import cancelar_assinatura_asaas

load_dotenv()

router = APIRouter()

# Configuração do Supabase
supabase = get_supabase()

# Token de segurança definido no Painel do Asaas
ASAAS_WEBHOOK_TOKEN = os.getenv("ASAAS_WEBHOOK_TOKEN")

PLAN_HIERARCHY = {
    'trial': 0,
    'consultorio': 1,
    'clinica_pro': 2,
    'corporate': 3
}

@router.post("/webhook/asaas")
def asaas_webhook(payload: dict = Body(...), asaas_access_token: str = Header(None)):
    """
    Recebe notificações de pagamento do Asaas.
    Gerencia o ciclo de vida via tabela checkout_sessions e assinaturas.
    Status usados: ativa, inativa, cancelada, pendente, pago.
    
    NOTA: Definido como 'def' (síncrono) para que o FastAPI execute em threadpool,
    já que as chamadas de DB e Requests são bloqueantes.
    """
    
    # 1. Validação de Segurança
    if ASAAS_WEBHOOK_TOKEN and asaas_access_token != ASAAS_WEBHOOK_TOKEN:
        print(f"⛔ Webhook Bloqueado: Token inválido: {asaas_access_token}")
        raise HTTPException(status_code=401, detail="Invalid Access Token")

    try:
        # payload já vem parseado pelo FastAPI (Body)
        event = payload.get("event")
        payment = payload.get("payment", {})
        
        # ID da assinatura no Asaas
        subscription_id = payment.get("subscription")
        installment_id = payment.get("installment")
        payment_id = payment.get("paymentLink")
        id = payment.get("id")
        asaas_id_referencia = subscription_id or installment_id or payment_id or id
        
        print(f"💰 Webhook Asaas: {event} | Asaas id: {asaas_id_referencia}")

        if not asaas_id_referencia:
            return {"status": "ignored_no_subscription_id"}

        # 2. Lógica de Pagamento Recebido (Ativação/Renovação)
        if event in ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]:
            
            # --- CHECK FOR TOKEN PURCHASE ---
            token_purchase = supabase.table('compra_tokens')\
                .select('*')\
                .eq('asaas_id', asaas_id_referencia)\
                .eq('status', 'pendente')\
                .maybe_single()\
                .execute()

            if token_purchase and token_purchase.data:
                purchase = token_purchase.data
                print(f"🪙 Pagamento de Tokens Recebido: {purchase['id']} - {purchase['quantidade_tokens']} tokens")
                
                # 1. Marcar como pago
                supabase.table('compra_tokens').update({
                    'status': 'pago', 
                    'pagamento_at': dt.datetime.now().isoformat()
                }).eq('id', purchase['id']).execute()
                
                # 2. Adicionar saldo à clínica (Incremento)
                # Precisamos ler o saldo atual primeiro para incrementar com segurança (concorrência é rara aqui)
                # Ou usar uma RPC se tivesse, mas vamos de read-modify-write
                
                clinic_res = supabase.table('clinicas').select('tokens_comprados').eq('id', purchase['clinic_id']).single().execute()

                if clinic_res and clinic_res.data:
                    current_balance = clinic_res.data.get('tokens_comprados', 0) or 0
                    new_balance = current_balance + purchase['quantidade_tokens']
                    
                    supabase.table('clinicas').update({
                        'tokens_comprados': new_balance,
                        'ia_ativa': True # Reativar IA se estava pausada
                    }).eq('id', purchase['clinic_id']).execute()
                    
                    print(f"✅ Saldo de tokens atualizado para {new_balance}")
                
                return {"status": "processed_token_purchase"}

            # A. Verificar se existe uma intenção de compra (Checkout Session) pendente
            # Isso indica uma Nova Assinatura ou um Upgrade/Troca de Plano
            sessao_query = supabase.table('checkout_sessions')\
                .select('*')\
                .eq('asaas_id', asaas_id_referencia)\
                .eq('status', 'pendente')\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if sessao_query and sessao_query.data:
                sessao = sessao_query.data[0]
                print(f"🚀 Efetivando compra da sessão: {sessao['id']}")
                
                # Buscar detalhes do novo plano (para pegar o nome e limites)
                p_new_query = supabase.table('planos').select('nome, max_tokens').eq('id', sessao['plan_id']).maybe_single().execute()
                new_plan_name = p_new_query.data['nome'] if p_new_query and p_new_query.data else 'unknown'
                tokens_liberados = p_new_query.data['max_tokens'] if p_new_query and p_new_query.data else 0

                # Calcular datas
                data_inicio = dt.datetime.now()
                
                if sessao.get('ciclo') in ['anual', 'annual', 'YEARLY']:
                    data_fim = data_inicio + relativedelta(years=1)
                else:
                    data_fim = data_inicio + relativedelta(months=1)
                
                # UPSERT: Se já existe assinatura para a clínica, atualiza. Se não, cria.
                existing_sub = supabase.table('assinaturas').select('*').eq('clinic_id', sessao['clinic_id']).execute()
                
                is_delayed_downgrade = False
                
                if existing_sub and existing_sub.data:
                    old_sub = existing_sub.data[0]
                    old_asaas_id = old_sub.get('asaas_id')
                    old_plan_id = old_sub.get('plan_id')
                    
                    # Checagem de Downgrade (DELAYED DOWNGRADE)
                    if old_plan_id and sessao['plan_id'] and old_plan_id != sessao['plan_id']:
                        try:
                            # Buscar nomes dos planos para comparar hierarquia
                            p_old = supabase.table('planos').select('nome').eq('id', old_plan_id).maybe_single().execute()
                            
                            if p_old and p_old.data:
                                level_old = PLAN_HIERARCHY.get(p_old.data['nome'], 0)
                                level_new = PLAN_HIERARCHY.get(new_plan_name, 0)
                                
                                if level_new < level_old:
                                    print(f"📉 Downgrade detectado ({p_old.data['nome']} -> {new_plan_name}). Agendando troca.")
                                    is_delayed_downgrade = True
                                    
                                    # 1. Marcar sessão como 'esperando_troca' (aguardando troca)
                                    supabase.table('checkout_sessions').update({'status': 'esperando_troca'}).eq('id', sessao['id']).execute()
                                    
                                    # 2. Cancelar renovação da antiga no Asaas (mas MANTEMOS ela ativa no banco até vencer)
                                    if old_asaas_id and old_asaas_id != asaas_id_referencia:
                                        cancelar_assinatura_asaas(old_asaas_id)
                                         
                        except Exception as e:
                            print(f"⚠️ Erro ao verificar hierarquia de planos: {e}")

                    if not is_delayed_downgrade:
                        # --- SWAP LOGIC Padrão (Upgrade ou mesmo nível) ---
                        if old_asaas_id and old_asaas_id != asaas_id_referencia:
                            print(f"🔀 Swap: Cancelando assinatura antiga {old_asaas_id} para ativar a nova {asaas_id_referencia}...")
                            cancelar_assinatura_asaas(old_asaas_id)

                if not is_delayed_downgrade:
                    # Dados para a tabela oficial de assinaturas
                    hoje = dt.datetime.now().isoformat()
                    dados_assinatura = {
                        "clinic_id": sessao['clinic_id'],
                        "plan_id": sessao['plan_id'],
                        "asaas_id": asaas_id_referencia,
                        "status": "ativa", 
                        "ciclo": sessao.get('ciclo', 'mensal'),
                        "data_inicio": data_inicio.isoformat(),
                        "data_fim": data_fim.isoformat(),
                        "updated_at": hoje,
                        "ultima_recarga_tokens": hoje
                    }

                    if existing_sub and existing_sub.data:
                        # Update
                        supabase.table('assinaturas').update(dados_assinatura).eq('id', existing_sub.data[0]['id']).execute()
                    else:
                        # Insert
                        supabase.table('assinaturas').insert(dados_assinatura).execute()

                    # Reativar IA da clínica quando assinatura é ativada
                    supabase.table('clinicas')\
                        .update({'ia_ativa': True, 'saldo_tokens': tokens_liberados})\
                        .eq('id', sessao['clinic_id'])\
                        .execute()

                    # Marcar a sessão como PAGO
                    supabase.table('checkout_sessions').update({'status': 'pago'}).eq('id', sessao['id']).execute()
                    
                    print(f"✅ Assinatura {new_plan_name} ativada e sessão concluída com sucesso!")
                else:
                    print(f"⏳ Downgrade agendado para {new_plan_name}. Assinatura antiga mantida até o fim do ciclo.")

            else:
                # B. Nenhuma sessão pendente = Renovação Recorrente (Mês 2, Mês 3...)
                print("🔄 Renovação recorrente automática.")
                
                sub_atual = supabase.table('assinaturas').select('*').eq('asaas_id', asaas_id_referencia).maybe_single().execute()
                
                if sub_atual and sub_atual.data:                    
                    # Calcular datas
                    data_inicio = dt.datetime.now()
                    
                    if sub_atual.data.get('ciclo', 'mensal') in ['anual', 'annual', 'YEARLY']:
                        nova_data_fim = data_inicio + relativedelta(years=1)
                    else:
                        nova_data_fim = data_inicio + relativedelta(months=1)
                
                    clinic_id = sub_atual.data.get('clinic_id')
                    hoje = dt.datetime.now().isoformat()
                    
                    supabase.table('assinaturas').update({
                        'status': 'ativa',
                        'data_fim': nova_data_fim.isoformat(),
                        'updated_at': hoje,
                        'ultima_recarga_tokens': hoje
                    }).eq('id', sub_atual.data['id']).execute()
                    
                    # Garantir que IA está ativa quando assinatura é renovada
                    if clinic_id:
                        supabase.table('clinicas')\
                            .update({'ia_ativa': True, 'saldo_tokens': tokens_liberados})\
                            .eq('id', clinic_id)\
                            .execute()
                    
                    print(f"📅 Assinatura renovada até {nova_data_fim}")

        # 3. Lógica de Problemas (Inadimplência/Cancelamento)
        elif event in ["PAYMENT_OVERDUE", "PAYMENT_REFUNDED"]:
            print(f"⚠️ Pagamento com problemas: {event}")

            # --- OVERDUE SWAP GUARD: Cancelar assinatura pendente se não for paga ---
            # Se for uma tentativa de troca de plano (Swap) que venceu, cancelamos para não cobrar.
            sessao_pendente = supabase.table('checkout_sessions')\
                .select('*')\
                .eq('asaas_id', asaas_id_referencia)\
                .eq('status', 'pendente')\
                .maybe_single()\
                .execute()

            if sessao_pendente and sessao_pendente.data:
                print(f"🚫 Swap Overdue: Cancelando assinatura pendente {asaas_id_referencia} por falta de pagamento.")
                cancelar_assinatura_asaas(asaas_id_referencia)
                supabase.table('checkout_sessions').update({'status': 'cancelado'}).eq('id', sessao_pendente.data['id']).execute()
            
            # --- Lógica Existente: Desativar IA se for a assinatura ATIVA ---
            # Buscar clinic_id da assinatura para desativar IA
            assinatura_data = supabase.table('assinaturas')\
                .select('clinic_id')\
                .eq('asaas_id', asaas_id_referencia)\
                .maybe_single()\
                .execute()
            
            if assinatura_data and assinatura_data.data:
                clinic_id = assinatura_data.data['clinic_id']
                # Atualizar status da assinatura
                supabase.table('assinaturas')\
                    .update({'status': 'inativa', 'updated_at': dt.datetime.now().isoformat()})\
                    .eq('asaas_id', asaas_id_referencia)\
                    .execute()
                # Desativar IA da clínica
                supabase.table('clinicas')\
                    .update({'ia_ativa': False})\
                    .eq('id', clinic_id)\
                    .execute()
                print(f"🔒 IA desativada para clínica {clinic_id}")
                
        elif event == "SUBSCRIPTION_DELETED":
            print(f"🛑 Assinatura cancelada no Asaas.")
            # Buscar clinic_id da assinatura para desativar IA
            assinatura_data = supabase.table('assinaturas')\
                .select('clinic_id')\
                .eq('asaas_id', asaas_id_referencia)\
                .single()\
                .execute()
            
            if assinatura_data and assinatura_data.data:
                clinic_id = assinatura_data.data['clinic_id']
                # Atualizar status da assinatura
                supabase.table('assinaturas')\
                    .update({'status': 'cancelada', 'updated_at': dt.datetime.now().isoformat()})\
                    .eq('asaas_id', asaas_id_referencia)\
                    .execute()
                # Desativar IA da clínica
                supabase.table('clinicas')\
                    .update({'ia_ativa': False})\
                    .eq('id', clinic_id)\
                    .execute()
                print(f"🔒 IA desativada para clínica {clinic_id}")

        return {"status": "processed"}

    except Exception as e:
        print(f"❌ Erro Webhook Asaas: {e}")
        return {"status": "error", "detail": str(e)}