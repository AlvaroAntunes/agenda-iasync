import os
import requests
from dotenv import load_dotenv

load_dotenv()

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
AUTHENTICATION_API_KEY = os.getenv("AUTHENTICATION_API_KEY")

def enviar_mensagem_whatsapp(instance_name, remote_jid, text):
    """
    Função centralizada para envio de mensagens (Evolution v2).
    Usada tanto pelo Webhook (erros) quanto pelo Celery (IA).
    """
    url = f"{EVOLUTION_API_URL}/message/send/text/{instance_name}"
    
    headers = {
        "apikey": AUTHENTICATION_API_KEY,
        "Content-Type": "application/json"
    }
    
    # Garante formato JID
    telefone = str(remote_jid)
    
    if "@" not in telefone:
        telefone = f"{telefone}@s.whatsapp.net"
    
    body = {
        "instance": instance_name,
        "number": telefone,
        "text": text,
        "delay": 1000,
        "presence": "composing",
        "linkPreview": False
    }
    
    try:
        response = requests.post(url, json=body, headers=headers)
        if response.status_code not in [200, 201]:
            print(f"⚠️ Erro envio Whats: {response.text}")
    except Exception as e:
        print(f"⚠️ Erro conexão Whats: {e}")