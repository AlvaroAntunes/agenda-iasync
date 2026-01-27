import os
import requests
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

ASAAS_API_URL = os.getenv("ASAAS_API_URL")
ASAAS_API_KEY = os.getenv("ASAAS_API_KEY")

def get_headers():
    # Debug de segurança para garantir que a chave foi carregada
    if not ASAAS_API_KEY:
        print("❌ ASAAS_API_KEY não está sendo carregada corretamente." )
    
    return {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json"
    }

def buscar_cliente_por_email(email):
    """
    Busca cliente existente pelo email para evitar duplicidade.
    """
    url = f"{ASAAS_API_URL}/customers"
    params = {"email": email, "limit": 1}
    
    try:
        res = requests.get(url, params=params, headers=get_headers())
        if res.status_code == 200:
            data = res.json()
            if data.get('data'):
                return data['data'][0]['id']
    except Exception as e:
        print(f"⚠️ Erro ao buscar cliente por email: {e}")
    return None

def criar_cliente_asaas(nome, email, cpf_cnpj, telefone):
    """
    Cria ou recupera um cliente no Asaas.
    """
    url = f"{ASAAS_API_URL}/customers"
    
    # Limpeza de dados
    mobile = str(telefone).replace("@s.whatsapp.net", "").replace("+", "").replace(" ", "").replace("-", "")
    cpf_clean = "".join(filter(str.isdigit, str(cpf_cnpj))) if cpf_cnpj else None

    body = {
        "name": nome,
        "email": email,
        "cpfCnpj": cpf_clean,
        "mobilePhone": mobile,
        "notificationDisabled": False
    }
    
    try:
        response = requests.post(url, json=body, headers=get_headers())
        
        if response.status_code == 200:
            return response.json()['id']
        elif response.status_code == 400:
            # Tenta recuperar se for erro de duplicidade
            if "PROBABLY_DUPLICATE" in response.text or "já existe" in response.text:
                print(f"⚠️ Cliente duplicado. Buscando existente...")
                return buscar_cliente_por_email(email)
            else:
                print(f"❌ Erro criar cliente Asaas (400): {response.text}")
                return None
        else:
            print(f"❌ Erro criar cliente Asaas ({response.status_code}): {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro conexão Asaas (Cliente): {e}")
        return None

def criar_checkout_assinatura(customer_asaas_id, valor, ciclo="MONTHLY"):
    """
    Cria a assinatura e retorna o link da primeira fatura (Checkout).
    """
    url_sub = f"{ASAAS_API_URL}/subscriptions"
    
    # Data de vencimento: +1 dia para dar tempo do cliente pagar
    vencimento = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    body_sub = {
        "customer": customer_asaas_id,
        "billingType": "UNDEFINED", 
        "value": float(valor),
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
        
        # 2. Busca o Link da Fatura
        url_payments = f"{ASAAS_API_URL}/subscriptions/{sub_id}/payments"        
        res_pay = requests.get(url_payments, headers=get_headers())
        
        if res_pay.status_code == 200:
            payments = res_pay.json().get('data', [])
            
            if payments:
                return {
                    "subscription_id": sub_id,
                    "checkout_url": payments[0]['invoiceUrl'],
                    "due_date": payments[0]['dueDate'] 
                }
        
        return None
    except Exception as e:
        print(f"❌ Erro conexão Asaas (Assinatura): {e}")
        return None

def atualizar_assinatura_asaas(subscription_id, novo_valor, novo_ciclo):
    """
    Atualiza uma assinatura existente e FORÇA uma nova cobrança imediata.
    """
    url = f"{ASAAS_API_URL}/subscriptions/{subscription_id}"
    
    # Define o vencimento para AMANHÃ para gerar cobrança imediata do novo valor
    vencimento_imediato = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    body = {
        "value": float(novo_valor),
        "cycle": novo_ciclo,
        "nextDueDate": vencimento_imediato, 
        "updatePendingPayments": True 
    }
    
    try:
        response = requests.post(url, json=body, headers=get_headers())
        
        if response.status_code == 200:
            return True
        else:
            print(f"❌ Erro Atualizar Assinatura Asaas: {response.text}")
            return False
        
    except Exception as e:
        print(f"❌ Erro conexão Asaas (Update): {e}")
        return False

def buscar_link_pagamento_existente(subscription_id):
    """
    Busca o link da fatura pendente de uma assinatura existente.
    """
    url = f"{ASAAS_API_URL}/subscriptions/{subscription_id}/payments"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            if data.get('data') and len(data['data']) > 0:
                # Retorna a primeira fatura pendente ou vencida
                for fatura in data['data']:
                    if fatura['status'] in ['PENDING', 'OVERDUE']:
                        return {
                            "checkout_url": fatura['invoiceUrl'],
                            "due_date": fatura['dueDate']
                        }
        return None
    except Exception as e:
        print(f"❌ Erro buscar link existente: {e}")
        return None

def buscar_fatura_pendente(customer_asaas_id):
    """
    Busca a fatura pendente ou vencida mais recente do cliente.
    """
    url = f"{ASAAS_API_URL}/payments"
    
    params = {
        "customer": customer_asaas_id,
        "status": "PENDING,OVERDUE", 
        "limit": 1,
        "sort": "dueDate",
        "order": "asc"
    }
    
    try:
        response = requests.get(url, params=params, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            if data.get('data'):
                return data['data'][0]['invoiceUrl']
                
        return None
    except Exception as e:
        print(f"❌ Erro ao buscar fatura: {e}")
        return None