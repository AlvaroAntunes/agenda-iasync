import os
import datetime as dt
from fastapi import APIRouter, Request, Header, HTTPException
from dotenv import load_dotenv
from app.core.database import get_supabase

load_dotenv()

router = APIRouter()

# Configuração do Supabase
supabase = get_supabase()

# Token de segurança definido no Painel do Asaas
ASAAS_WEBHOOK_TOKEN = os.getenv("ASAAS_WEBHOOK_TOKEN")

@router.post("/webhook/asaas")
async def asaas_webhook(request: Request, asaas_access_token: str = Header(None)):
    """
    Recebe notificações de pagamento do Asaas.
    Gerencia o ciclo de vida via tabela checkout_sessions e assinaturas.
    Status usados: ativa, inativa, cancelada, pendente, pago.
    """
    
    # 1. Validação de Segurança
    if ASAAS_WEBHOOK_TOKEN and asaas_access_token != ASAAS_WEBHOOK_TOKEN:
        print(f"⚠️ Tentativa de webhook inválida. Token recebido: {asaas_access_token}")

    try:
        payload = await request.json()
        event = payload.get("event")
        payment = payload.get("payment", {})
        
        # ID da assinatura no Asaas
        subscription_id = payment.get("subscription")
        
        print(f"💰 Webhook Asaas: {event} | Sub: {subscription_id}")

        if not subscription_id:
            return {"status": "ignored_no_subscription_id"}

        # 2. Lógica de Pagamento Recebido (Ativação/Renovação)
        if event == "PAYMENT_RECEIVED":
            
            # A. Verificar se existe uma intenção de compra (Checkout Session) pendente
            # Isso indica uma Nova Assinatura ou um Upgrade/Troca de Plano
            sessao_query = supabase.table('checkout_sessions')\
                .select('*')\
                .eq('asaas_subscription_id', subscription_id)\
                .eq('status', 'pendente')\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if sessao_query.data:
                sessao = sessao_query.data[0]
                print(f"🚀 Efetivando compra da sessão: {sessao['id']}")
                
                # Calcular datas
                data_inicio = dt.datetime.now()
                # Se ciclo for anual, soma 365 dias, senão 30 dias
                dias_adicionar = 365 if sessao.get('ciclo') in ['anual', 'annual', 'YEARLY'] else 30
                data_fim = data_inicio + dt.timedelta(days=dias_adicionar)
                
                # Dados para a tabela oficial de assinaturas
                dados_assinatura = {
                    "clinic_id": sessao['clinic_id'],
                    "plan_id": sessao['plan_id'],
                    "asaas_subscription_id": subscription_id,
                    "status": "ativa", 
                    "ciclo": sessao.get('ciclo', 'mensal'),
                    "data_inicio": data_inicio.isoformat(),
                    "data_fim": data_fim.isoformat(),
                    "updated_at": dt.datetime.now().isoformat()
                }

                # UPSERT: Se já existe assinatura para a clínica, atualiza. Se não, cria.
                # Primeiro buscamos o ID da assinatura existente (se houver) para fazer update
                existing_sub = supabase.table('assinaturas').select('id').eq('clinic_id', sessao['clinic_id']).execute()
                
                if existing_sub.data:
                    # Update
                    supabase.table('assinaturas').update(dados_assinatura).eq('id', existing_sub.data[0]['id']).execute()
                else:
                    # Insert
                    supabase.table('assinaturas').insert(dados_assinatura).execute()

                # Marcar a sessão como PAGO
                supabase.table('checkout_sessions').update({'status': 'pago'}).eq('id', sessao['id']).execute()
                
                print("✅ Assinatura ativada e sessão concluída com sucesso!")

            else:
                # B. Nenhuma sessão pendente = Renovação Recorrente (Mês 2, Mês 3...)
                print("🔄 Renovação recorrente automática.")
                
                sub_atual = supabase.table('assinaturas').select('*').eq('asaas_subscription_id', subscription_id).maybe_single().execute()
                
                if sub_atual.data:
                    # Apenas estendemos a data baseada no ciclo atual
                    ciclo_atual = sub_atual.data.get('ciclo', 'mensal')
                    dias_adicionar = 365 if ciclo_atual in ['anual', 'annual', 'YEARLY'] else 30
                    
                    # Usando agora garante que a conta fique ativa a partir do pagamento
                    nova_data_fim = dt.datetime.now() + dt.timedelta(days=dias_adicionar)
                    
                    supabase.table('assinaturas').update({
                        'status': 'ativa',
                        'data_fim': nova_data_fim.isoformat(),
                        'updated_at': dt.datetime.now().isoformat()
                    }).eq('id', sub_atual.data['id']).execute()
                    
                    print(f"📅 Assinatura renovada até {nova_data_fim}")

        # 3. Lógica de Problemas (Inadimplência/Cancelamento)
        elif event in ["PAYMENT_OVERDUE", "PAYMENT_REFUNDED"]:
            print(f"⚠️ Pagamento com problemas: {event}")
            supabase.table('assinaturas')\
                .update({'status': 'inativa', 'updated_at': dt.datetime.now().isoformat()})\
                .eq('asaas_subscription_id', subscription_id)\
                .execute()
                
        elif event == "SUBSCRIPTION_DELETED":
            print(f"🛑 Assinatura cancelada no Asaas.")
            supabase.table('assinaturas')\
                .update({'status': 'cancelada', 'updated_at': dt.datetime.now().isoformat()})\
                .eq('asaas_subscription_id', subscription_id)\
                .execute()

        return {"status": "processed"}

    except Exception as e:
        print(f"❌ Erro Webhook Asaas: {e}")
        return {"status": "error", "detail": str(e)}