import os
import requests
from dotenv import load_dotenv

load_dotenv()

UAZAPI_URL = os.getenv("UAZAPI_URL")

def get_headers(token_instancia):
    return {
        "Content-Type": "application/json",
        "token": token_instancia
    }

def enviar_mensagem_whatsapp(token_instancia, numero_telefone, text):
    """
    Função centralizada para envio de mensagens com uazapi.
    Usada tanto pelo Webhook (erros) quanto pelo Celery (IA).
    """
    url = f"{UAZAPI_URL}/send/text"
    
    body = {
        "number": numero_telefone,
        "text": text,
        "readmessages": True,
        "delay": 1500,
        "presence": "composing",
        "linkPreview": False
    }
    
    try:
        response = requests.post(url, json=body, headers=get_headers(token_instancia))
        
        if response.status_code not in [200, 201]:
            print(f"⚠️ Erro envio Whats: {response.text}")
    except Exception as e:
        print(f"⚠️ Erro conexão Whats: {e}")