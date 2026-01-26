import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

ASAAS_API_URL = os.getenv("ASAAS_API_URL")
ASAAS_API_KEY = os.getenv("ASAAS_API_KEY")

def get_headers():
    return {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json"
    }

def criar_cliente_asaas(nome, email, cpf_cnpj, telefone):
    """
    Cria ou recupera um cliente no Asaas.
    """
    url = f"{ASAAS_API_URL}/customers"
    
    # Limpeza de dados
    mobile = str(telefone).replace("@s.whatsapp.net", "").replace("+", "").replace(" ", "").replace("-", "")
    cpf_clean = "".join(filter(str.isdigit, str(cpf_cnpj))) if cpf_cnpj else None
    
    # Sandbox Fallback para CPF
    if "sandbox" in ASAAS_API_URL and (not cpf_clean or len(cpf_clean) < 11):
        cpf_clean = "64736341053" # CPF válido para teste

    body = {
        "name": nome,
        "email": email,
        "cpfCnpj": cpf_clean,
        "mobilePhone": mobile,
        "notificationDisabled": False
    }
    
    try:
        # Primeiro, tenta buscar se já existe pelo email (evita duplicidade no Asaas)
        # (Opcional, mas boa prática. O POST direto também retorna erro com ID se já existir)
        response = requests.post(url, json=body, headers=get_headers())
        
        if response.status_code == 200:
            return response.json()['id']
        elif response.status_code == 400 and "PROBABLY_DUPLICATE" in response.text:
            # Em alguns casos o Asaas avisa que já existe.
            # Aqui simplificamos retornando o ID se vier na mensagem, ou tratamos o erro.
            # Para MVP, vamos assumir sucesso ou erro.
            print(f"⚠️ Cliente Asaas possivelmente duplicado: {response.text}")
            return None
        else:
            print(f"❌ Erro criar cliente Asaas: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro conexão Asaas (Cliente): {e}")
        return None

def criar_checkout_assinatura(customer_asaas_id, valor, ciclo="mensal"):
    """
    Cria a assinatura e retorna o link da primeira fatura (Checkout).
    """
    url_sub = f"{ASAAS_API_URL}/subscriptions"
    
    # Data de vencimento: +1 dia para dar tempo do cliente pagar
    from datetime import datetime, timedelta
    vencimento = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    body_sub = {
        "customer": customer_asaas_id,
        "billingType": "UNDEFINED", # Cliente escolhe Pix/Cartão
        "value": valor,
        "nextDueDate": vencimento,
        "cycle": ciclo,
        "description": "Assinatura Agenda IASync"
    }
    
    try:
        # 1. Cria Assinatura
        response = requests.post(url_sub, json=body_sub, headers=get_headers())
        if response.status_code != 200:
            print(f"❌ Erro Criar Assinatura: {response.text}")
            return None
            
        sub_data = response.json()
        sub_id = sub_data['id']
        
        # 2. Busca o Link da Fatura (Delay necessário para o Asaas gerar)
        url_payments = f"{ASAAS_API_URL}/subscriptions/{sub_id}/payments"
        time.sleep(2) # Delay para o Asaas processar
        
        res_pay = requests.get(url_payments, headers=get_headers())
        
        if res_pay.status_code == 200:
            payments = res_pay.json().get('data', [])
            if payments:
                return {
                    "subscription_id": sub_id,
                    "checkout_url": payments[0]['invoiceUrl']
                }
        
        return None
    except Exception as e:
        print(f"❌ Erro conexão Asaas (Assinatura): {e}")
        return None

def buscar_fatura_pendente(customer_asaas_id):
    """
    Busca a fatura pendente ou vencida mais recente do cliente.
    """
    url = f"{ASAAS_API_URL}/payments"
    
    # Filtramos por status que impedem o uso
    params = {
        "customer": customer_asaas_id,
        "status": "PENDING,OVERDUE", 
        "limit": 1,
        "sort": "dueDate",
        "order": "asc" # Pega a mais antiga (que venceu primeiro)
    }
    
    try:
        response = requests.get(url, params=params, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            if data.get('data'):
                # Retorna o link direto da fatura
                return data['data'][0]['invoiceUrl']
                
        return None
    except Exception as e:
        print(f"❌ Erro ao buscar fatura: {e}")
        return None