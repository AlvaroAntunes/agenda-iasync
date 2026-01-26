import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.payment_service import criar_checkout_assinatura, criar_cliente_asaas, buscar_fatura_pendente
from dotenv import load_dotenv
from app.core.database import get_supabase

load_dotenv()

# Configuração do Supabase
supabase = get_supabase()

router = APIRouter()

class CheckoutInput(BaseModel):
    clinic_id: str   # UUID da clínica no Supabase
    plan_id: str     # Nome do plano (ex: 'consultorio', 'clinica_pro')
    periodo: str = "mensal" # 'mensal' ou 'anual'

@router.post("/checkout/create")
def create_checkout(dados: CheckoutInput):
    """
    Gera um link de pagamento (Fatura) do Asaas e registra a intenção de assinatura.
    """
    try:
        print(f"💳 Iniciando checkout: Clínica {dados.clinic_id} | Plano {dados.plan_id}")

        # 1. Buscar dados da Clínica
        clinica = supabase.table('clinicas').select('*').eq('id', dados.clinic_id).single().execute()
        
        if not clinica.data:
            raise HTTPException(status_code=404, detail="Clínica não encontrada")
        
        dados_clinica = clinica.data
        asaas_id = dados_clinica.get('asaas_customer_id')

        # 2. Se não tem ID no Asaas, cria o cliente agora
        if not asaas_id:
            print("🆕 Criando cliente no Asaas...")

            cpf_cnpj = dados_clinica.get('cnpj')
            
            asaas_id = criar_cliente_asaas(
                nome=dados_clinica['nome'],
                email=dados_clinica['email'],
                cpf_cnpj=cpf_cnpj,
                telefone=dados_clinica['telefone']
            )
            
            if not asaas_id:
                raise HTTPException(status_code=500, detail="Falha ao criar cliente no Asaas. Verifique os dados da clínica.")
            
            # Salva o ID no Supabase para uso futuro
            supabase.table('clinicas').update({'asaas_customer_id': asaas_id}).eq('id', dados.clinic_id).execute()

        # 3. Buscar Preço do Plano no Banco
        # Buscamos pelo NOME (que vem do front), mas precisamos do ID (UUID) para a tabela assinaturas
        plano_db = supabase.table('planos').select('*').eq('nome', dados.plan_id).maybe_single().execute()
        
        # Lógica de Preço e UUID
        plano_uuid = None
        
        if not plano_db.data:
            print(f"⚠️ Plano '{dados.plan_id}' não achado no banco. Usando fallback.")
            # Fallback apenas para não travar testes se a tabela estiver vazia
             
            if dados.plan_id == 'consultorio': 
                valor = 267.00 if dados.periodo == 'anual' else 297.00
            elif dados.plan_id == 'clinica_pro': 
                valor = 447.00 if dados.periodo == 'anual' else 497.00
            else: 
                valor = 897.00 if dados.periodo == 'anual' else 997.00
                
        else:
            # Caminho Feliz: Pegamos os dados do banco
            plano_data = plano_db.data
            plano_uuid = plano_data.get('id') # O UUID do plano
            valor = plano_data['preco_anual'] if dados.periodo == 'anual' else plano_data['preco_mensal']
            
        ciclo = "YEARLY" if dados.periodo == 'anual' else "MONTHLY"

        # 4. Criar Assinatura e Pegar Link
        checkout = criar_checkout_assinatura(asaas_id, valor, ciclo)
        
        if not checkout:
            raise HTTPException(status_code=500, detail="Erro ao gerar link de pagamento no Asaas.")
        
        # 5. Salvar/Atualizar na Tabela ASSINATURAS
        if plano_uuid:
            print(f"💾 Atualizando assinatura no banco para {checkout['subscription_id']}...")
            
            # Verifica se já existe assinatura para esta clínica
            existing_sub = supabase.table('assinaturas').select('id').eq('clinic_id', dados.clinic_id).execute()
            
            payload_assinatura = {
                "clinic_id": dados.clinic_id,
                "plan_id": plano_uuid,
                "asaas_subscription_id": checkout['subscription_id'],
                "status": "inativa", # Inicialmente inativa até o pagamento
                "ciclo": ciclo
            }

            if existing_sub.data and len(existing_sub.data) > 0:
                # UPDATE: Atualiza a existente
                sub_id = existing_sub.data[0]['id']
                supabase.table('assinaturas').update(payload_assinatura).eq('id', sub_id).execute()
            else:
                # INSERT: Cria nova se não existir
                supabase.table('assinaturas').insert(payload_assinatura).execute()

        print(f"✅ Checkout gerado: {checkout['checkout_url']}")
        
        return {"url": checkout['checkout_url']}

    except Exception as e:
        print(f"❌ Erro crítico na rota checkout: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/checkout/pending/{clinic_id}")
def get_pending_checkout(clinic_id: str):
    """
    Retorna o link da fatura em aberto para a clínica.
    """
    try:
        # 1. Pegar o ID do Asaas no Banco
        clinica = supabase.table('clinicas').select('asaas_customer_id').eq('id', clinic_id).single().execute()
        
        if not clinica.data or not clinica.data.get('asaas_customer_id'):
            raise HTTPException(status_code=404, detail="Clínica sem cadastro financeiro")
            
        asaas_id = clinica.data['asaas_customer_id']
        
        # 2. Buscar link no Asaas
        link_fatura = buscar_fatura_pendente(asaas_id)
        
        if not link_fatura:
            return {"url": "https://www.asaas.com/customerPortal", "status": "no_pending_invoice"}
            
        return {"url": link_fatura, "status": "found"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))