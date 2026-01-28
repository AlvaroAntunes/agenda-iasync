import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.payment_service import (
    criar_checkout_assinatura_mensal, 
    criar_cliente_asaas, 
    buscar_fatura_pendente,
    atualizar_assinatura_asaas,      
    buscar_link_pagamento_existente ,
    criar_checkout_anual
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
        
        # Verifica se já existe assinatura
        assinatura_existente = supabase.table('assinaturas')\
            .select('*')\
            .eq('clinic_id', dados.clinic_id)\
            .maybe_single()\
            .execute()

        checkout_url = None
        asaas_id = None
        data_vencimento = None
        
        pode_atualizar = False
        
        if assinatura_existente.data:
            id_atual = assinatura_existente.data.get('asaas_id', '')
            
            if id_atual and id_atual.startswith('sub_') and dados.periodo == 'mensal':
                pode_atualizar = True

        if pode_atualizar:
            # --- CENÁRIO A: ATUALIZAR NO ASAAS (Upgrade/Troca de Ciclo) ---
            print(f"🔄 Atualizando assinatura existente no Asaas: {assinatura_existente.data['asaas_id']}")
            asaas_id = assinatura_existente.data['asaas_id']
            
            if atualizar_assinatura_asaas(asaas_id, valor, ciclo_asaas):
                dados_fatura = buscar_link_pagamento_existente(asaas_id)
                
                if dados_fatura:
                    checkout_url = dados_fatura['checkout_url']
                    data_vencimento = dados_fatura['due_date']

        else:
            # --- CENÁRIO B: CRIAR NOVA NO ASAAS ---
            print(f"✨ Criando nova assinatura no Asaas...")
            
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