import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.payment_service import (
    criar_checkout_assinatura_mensal, 
    criar_cliente_asaas, 
    buscar_fatura_pendente,
    criar_checkout_anual,
    cancelar_assinatura_asaas,
    criar_cobranca_avulsa
)
from dotenv import load_dotenv
from app.core.database import get_supabase

load_dotenv()

# Configuração do Supabase
supabase = get_supabase()

router = APIRouter()

class CheckoutInput(BaseModel):
    clinic_id: str   
    plan_id: str     
    periodo: str = "mensal" 
    parcelas_cartao: int = 1

class CancelRequest(BaseModel):
    asaas_id: str
    clinic_id: str

@router.post("/checkout/create")
def create_checkout(dados: CheckoutInput):
    """
    Gera um link de pagamento (Fatura) do Asaas.
    Salva a intenção na tabela 'checkout_sessions'.
    """
    try:
        print(f"💳 Iniciando checkout: Clínica {dados.clinic_id} | Plano {dados.plan_id}")

        # 1. Buscar dados da Clínica
        clinica = supabase.table('clinicas').select('*').eq('id', dados.clinic_id).single().execute()
        
        if not clinica.data:
            raise HTTPException(status_code=404, detail="Clínica não encontrada")
        
        dados_clinica = clinica.data
        asaas_customer_id = dados_clinica.get('asaas_customer_id')

        # 2. Se não tem ID no Asaas, cria o cliente agora
        if not asaas_customer_id:
            print("🆕 Criando cliente no Asaas...")
            
            cpf_cnpj = dados_clinica.get('cnpj')
            
            asaas_customer_id = criar_cliente_asaas(
                nome=dados_clinica['nome'],
                email=dados_clinica['email'],
                cpf_cnpj=cpf_cnpj,
                telefone=dados_clinica['telefone']
            )
            
            if not asaas_customer_id:
                raise HTTPException(status_code=500, detail="Falha ao criar cliente no Asaas.")
            
            supabase.table('clinicas').update({'asaas_customer_id': asaas_customer_id}).eq('id', dados.clinic_id).execute()

        # 3. Buscar Preço do Plano no Banco e UUID
        # Usamos maybe_single para não quebrar se não achar
        plano_db = supabase.table('planos').select('*').eq('nome', dados.plan_id).maybe_single().execute()
        
        plano_uuid = None
        
        # Mapeamento do ciclo para a API do Asaas
        ciclo_asaas = "YEARLY" if dados.periodo == 'anual' else "MONTHLY"

        if not plano_db.data:
            print(f"⚠️ Plano '{dados.plan_id}' não achado no banco. Usando fallback.")
            
            if dados.plan_id == 'consultorio': 
                valor = 267.00 if ciclo_asaas == "YEARLY" else 297.00
            elif dados.plan_id == 'clinica_pro': 
                valor = 447.00 if ciclo_asaas == "YEARLY" else 497.00
            else: 
                valor = 897.00 if ciclo_asaas == "YEARLY" else 997.00
        else:
            plano_data = plano_db.data
            plano_uuid = plano_data.get('id') # UUID do plano para a FK
            valor = plano_data['preco_anual'] if ciclo_asaas == "YEARLY" else plano_data['preco_mensal']

        # 4. Decisão: Criar Nova ou Atualizar Existente?
        
        # 4. SWAP STRATEGY: Sempre criar NOVA assinatura/cobrança
        # Não atualizamos a existente para não quebrar a cobrança atual se o usuário desistir.
        # A troca (cancelar velha -> ativar nova) será feita no Webhook após pagamento.
        
        print(f"✨ Criando NOVA intenção de assinatura no Asaas (Swap Strategy)...")
        
        if dados.periodo == 'mensal':
            checkout = criar_checkout_assinatura_mensal(asaas_customer_id, valor)
        else:
            checkout = criar_checkout_anual(valor, dados.parcelas_cartao)
        
        if not checkout:
            raise HTTPException(status_code=500, detail="Erro ao gerar assinatura.")
        
        asaas_id = checkout['asaas_id']
        checkout_url = checkout['checkout_url']
        data_vencimento = checkout['due_date']
            
        if not checkout_url:
            raise HTTPException(status_code=500, detail="Link de pagamento não encontrado.")

        # 5. Salvar na Tabela de INTENÇÃO (CHECKOUT SESSIONS)
        if plano_uuid:
            print(f"💾 Registrando intenção de compra para {asaas_id}...")
            
            supabase.table('checkout_sessions').insert({
                "clinic_id": dados.clinic_id,
                "plan_id": plano_uuid,
                "asaas_id": asaas_id,
                "ciclo": dados.periodo,
                "status": "pendente",
                "data_vencimento": data_vencimento 
            }).execute()

        print(f"✅ Checkout gerado: {checkout_url}")
        
        return {"url": checkout_url}

    except Exception as e:
        print(f"❌ Erro crítico na rota checkout: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/checkout/pending/{clinic_id}")
def get_pending_checkout(clinic_id: str):
    """
    Retorna o link da fatura em aberto para a clínica.
    """
    try:
        clinica = supabase.table('clinicas').select('asaas_customer_id').eq('id', clinic_id).single().execute()
        
        if not clinica.data or not clinica.data.get('asaas_customer_id'):
            raise HTTPException(status_code=404, detail="Clínica sem cadastro financeiro")
            
        asaas_customer_id = clinica.data['asaas_customer_id']
        
        # 2. Buscar link no Asaas
        link_fatura = buscar_fatura_pendente(asaas_customer_id)
        
        if not link_fatura:
            return {"url": "https://www.asaas.com/customerPortal", "status": "no_pending_invoice"}
            
        return {"url": link_fatura, "status": "found"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/checkout/status/{clinic_id}")
def check_subscription_status(clinic_id: str):
    """
    Verifica o status da intenção de compra (checkout) mais recente.
    Usado pelo Frontend para polling.
    """
    try:
        # Busca o checkout mais recente na tabela checkout_sessions
        result = supabase.table('checkout_sessions')\
            .select('status')\
            .eq('clinic_id', clinic_id)\
            .order('created_at', desc=True)\
            .limit(1)\
            .maybe_single()\
            .execute()
            
        if result.data:
            status = result.data['status']
            
            if status == 'pago':
                return {"status": "ativa"}
            
            return {"status": status}
            
        return {"status": "none"}
        
    except Exception as e:
        return {"status": "error"}
    
@router.post("/cancel-subscription")
async def cancel_subscription(data: CancelRequest):
    """
    Cancela a assinatura no Asaas e atualiza o status no Supabase.
    Recebe: asaas_id (id da assinatura no Asaas) e clinic_id
    """
    try:
        # 1. Validações básicas
        if not data.asaas_id or not data.clinic_id:
            raise HTTPException(status_code=400, detail="Dados incompletos.")

        
        # 2. Cancelar no Asaas usando o Serviço
        # Se tiver ID do Asaas, tenta cancelar lá primeiro
        if data.asaas_id:
            sucesso_asaas = cancelar_assinatura_asaas(data.asaas_id)
            
            if not sucesso_asaas:
                raise HTTPException(status_code=502, detail="Erro ao processar cancelamento no gateway de pagamento (Asaas).")
        
        # 3. Atualizar status no Supabase para 'cancelada'
        # Isso garante que o usuário não seja mais cobrado no seu sistema
        update_resp = supabase.table("assinaturas")\
            .update({"status": "cancelada", "asaas_id": None})\
            .eq("asaas_id", data.asaas_id)\
            .execute()

        return {
            "message": "Assinatura cancelada com sucesso.", 
            "details": "Acesso mantido até o fim do ciclo atual.",
            "status": "canceled"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Erro interno no cancelamento: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao cancelar assinatura.")

class TokenPurchaseInput(BaseModel):
    clinic_id: str
    amount_tokens: int

@router.post("/checkout/tokens")
def create_token_checkout(dados: TokenPurchaseInput):
    """
    Gera cobrança avulsa para compra de tokens.
    Preço: R$ 5,00 por 1 milhão de tokens.
    """
    try:
        # 1. Validar e Calcular
        if dados.amount_tokens < 1000000:
            raise HTTPException(status_code=400, detail="Mínimo de 1 milhão de tokens.")
        
        milhoes = dados.amount_tokens / 1000000
        valor = milhoes * 5.00
        
        # 2. Buscar Cliente Asaas
        clinica = supabase.table('clinicas').select('asaas_customer_id, nome').eq('id', dados.clinic_id).single().execute()
        
        if not clinica.data or not clinica.data.get('asaas_customer_id'):
            raise HTTPException(status_code=404, detail="Clínica não configurada para pagamentos.")
             
        asaas_customer_id = clinica.data['asaas_customer_id']
        descricao = f"Compra de {int(milhoes)} Milhões de Tokens IA"
        
        # 3. Criar Cobrança
        cobranca = criar_cobranca_avulsa(asaas_customer_id, valor, descricao)
        
        if not cobranca:
             raise HTTPException(status_code=500, detail="Erro ao gerar cobrança no Asaas.")
             
        # 4. Salvar Intenção de Compra
        try:
            supabase.table('compra_tokens').insert({
                "clinic_id": dados.clinic_id,
                "asaas_id": cobranca['asaas_id'],
                "quantidade_tokens": dados.amount_tokens,
                "valor": valor,
                "status": "pendente"
            }).execute()
        except Exception as e:
            print(f"⚠️ Erro ao salvar intenção de compra de tokens: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao registrar compra (Tabela compra_tokens existe?).")

        return {"url": cobranca['checkout_url']}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Erro Checkout Tokens: {e}")
        raise HTTPException(status_code=500, detail=str(e))