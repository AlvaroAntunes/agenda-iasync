import os
import datetime as dt
from dateutil.relativedelta import relativedelta
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
        installment_id = payment.get("installment")
        payment_id = payment.get("paymentLink")
        asaas_id_referencia = subscription_id or installment_id or payment_id
        
        print(f"💰 Webhook Asaas: {event} | Asaas id: {asaas_id_referencia}")

        if not asaas_id_referencia:
            return {"status": "ignored_no_subscription_id"}

        # 2. Lógica de Pagamento Recebido (Ativação/Renovação)
        if event in ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]:
            
            # A. Verificar se existe uma intenção de compra (Checkout Session) pendente
            # Isso indica uma Nova Assinatura ou um Upgrade/Troca de Plano
            sessao_query = supabase.table('checkout_sessions')\
                .select('*')\
                .eq('asaas_id', asaas_id_referencia)\
                .eq('status', 'pendente')\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if sessao_query.data:
                sessao = sessao_query.data[0]
                print(f"🚀 Efetivando compra da sessão: {sessao['id']}")
                
                # Calcular datas
                data_inicio = dt.datetime.now()
                
                if sessao.get('ciclo') in ['anual', 'annual', 'YEARLY']:
                    data_fim = data_inicio + relativedelta(years=1)
                else:
                    data_fim = data_inicio + relativedelta(months=1)
                
                # Dados para a tabela oficial de assinaturas
                dados_assinatura = {
                    "clinic_id": sessao['clinic_id'],
                    "plan_id": sessao['plan_id'],
                    "asaas_id": asaas_id_referencia,
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

                # Reativar IA da clínica quando assinatura é ativada
                supabase.table('clinicas')\
                    .update({'ia_ativa': True})\
                    .eq('id', sessao['clinic_id'])\
                    .execute()

                # Marcar a sessão como PAGO
                supabase.table('checkout_sessions').update({'status': 'pago'}).eq('id', sessao['id']).execute()
                
                print("✅ Assinatura ativada e sessão concluída com sucesso!")

            else:
                # B. Nenhuma sessão pendente = Renovação Recorrente (Mês 2, Mês 3...)
                print("🔄 Renovação recorrente automática.")
                
                sub_atual = supabase.table('assinaturas').select('*').eq('asaas_id', asaas_id_referencia).maybe_single().execute()
                
                if sub_atual.data:                    
                    # Calcular datas
                    data_inicio = dt.datetime.now()
                    
                    if sub_atual.data.get('ciclo', 'mensal') in ['anual', 'annual', 'YEARLY']:
                        nova_data_fim = data_inicio + relativedelta(years=1)
                    else:
                        nova_data_fim = data_inicio + relativedelta(months=1)
                
                    clinic_id = sub_atual.data.get('clinic_id')
                    
                    supabase.table('assinaturas').update({
                        'status': 'ativa',
                        'data_fim': nova_data_fim.isoformat(),
                        'updated_at': dt.datetime.now().isoformat()
                    }).eq('id', sub_atual.data['id']).execute()
                    
                    # Garantir que IA está ativa quando assinatura é renovada
                    if clinic_id:
                        supabase.table('clinicas')\
                            .update({'ia_ativa': True})\
                            .eq('id', clinic_id)\
                            .execute()
                    
                    print(f"📅 Assinatura renovada até {nova_data_fim}")

        # 3. Lógica de Problemas (Inadimplência/Cancelamento)
        elif event in ["PAYMENT_OVERDUE", "PAYMENT_REFUNDED"]:
            print(f"⚠️ Pagamento com problemas: {event}")
            # Buscar clinic_id da assinatura para desativar IA
            assinatura_data = supabase.table('assinaturas')\
                .select('clinic_id')\
                .eq('asaas_id', asaas_id_referencia)\
                .single()\
                .execute()
            
            if assinatura_data.data:
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
            
            if assinatura_data.data:
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