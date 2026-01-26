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
    Recebe notificações de pagamento do Asaas e atualiza a tabela de ASSINATURAS.
    Calcula data_fim baseado no ciclo (Mensal/Anual).
    """
    # 1. Validação de Segurança
    # if ASAAS_WEBHOOK_TOKEN and asaas_access_token != ASAAS_WEBHOOK_TOKEN:
    #     print(f"⚠️ Tentativa de webhook inválida. Token recebido: {asaas_access_token}")
        # raise HTTPException(status_code=401, detail="Token inválido") 

    try:
        payload = await request.json()
        event = payload.get("event")
        payment = payload.get("payment", {})
        
        # ID da assinatura no Asaas
        subscription_id = payment.get("subscription")
        
        print(f"💰 Webhook Asaas: {event} | Sub: {subscription_id}")

        if not subscription_id:
            return {"status": "ignored_no_subscription_id"}

        novo_status = None
        
        # 2. Mapeamento de Eventos
        if event == "PAYMENT_RECEIVED":
            novo_status = "ativa"
        elif event in ["PAYMENT_OVERDUE", "PAYMENT_REFUNDED"]:
            novo_status = "inativa"
        elif event == "SUBSCRIPTION_DELETED":
            novo_status = "cancelada"

        # 3. Atualização na Tabela ASSINATURAS
        if novo_status:
            update_data = {
                'status': novo_status,
                'updated_at': dt.datetime.now().isoformat()
            }

            # --- CÁLCULO DE DATA DE FIM (Se ativou/pagou) ---
            if novo_status == "ativa":
                try:
                    # 1. Busca o ciclo atual dessa assinatura no banco
                    sub_data = supabase.table('assinaturas')\
                        .select('ciclo')\
                        .eq('asaas_subscription_id', subscription_id)\
                        .single()\
                        .execute()
                    
                    if sub_data.data:
                        ciclo = sub_data.data.get('ciclo', 'mensal') # Padrão Mensal
                        data_inicio = dt.datetime.now()
                        
                        # 2. Calcula data fim
                        if ciclo == 'anual' or ciclo == 'annual': # Garante compatibilidade
                            # Adiciona 365 dias
                            data_fim = data_inicio + dt.timedelta(days=365)
                        else:
                            # Adiciona 30 dias (Mensal)
                            data_fim = data_inicio + dt.timedelta(days=30)
                        
                        # 3. Adiciona campos de data ao update
                        update_data['data_inicio'] = data_inicio.isoformat()
                        update_data['data_fim'] = data_fim.isoformat()
                        
                        print(f"📅 Renovando assinatura {subscription_id} ({ciclo}). Vence em: {data_fim}")

                except Exception as erro_data:
                    print(f"⚠️ Erro ao calcular datas: {erro_data}")

            # Executa o Update no Supabase
            response = supabase.table('assinaturas')\
                .update(update_data)\
                .eq('asaas_subscription_id', subscription_id)\
                .execute()
                
            if response.data:
                print(f"✅ Assinatura {subscription_id} atualizada para: {novo_status}")
            else:
                print(f"⚠️ Assinatura {subscription_id} não encontrada no banco.")

        return {"status": "processed"}

    except Exception as e:
        print(f"❌ Erro Webhook Asaas: {e}")
        return {"status": "error", "detail": str(e)}