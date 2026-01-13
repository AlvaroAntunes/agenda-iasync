import os
import requests
from dotenv import load_dotenv

load_dotenv()

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
AUTHENTICATION_API_KEY = os.getenv("AUTHENTICATION_API_KEY")

def get_headers():
    return {
        "apikey": AUTHENTICATION_API_KEY,
        "Content-Type": "application/json"
    }
    
def marcar_como_lida(instance_name, remote_jid, message_id):
    """
    Marca uma mensagem específica como lida (Tiques Azuis).
    Endpoint V2: /chat/markMessageAsRead/{instance}
    """
    if not message_id:
        return

    url = f"{EVOLUTION_API_URL}/chat/markMessageAsRead/{instance_name}"
    
    # Payload específico da Evolution v2 para ler mensagens
    body = {
        "readMessages": [
            {
                "remoteJid": remote_jid,
                "fromMe": False,
                "id": message_id
            }
        ]
    }
    
    try:
        # Timeout curto (2s) para não travar recursos se a API demorar
        requests.post(url, json=body, headers=get_headers(), timeout=2)
    except Exception as e:
        print(f"⚠️ Erro ao marcar como lida: {e}")

def enviar_mensagem_whatsapp(instance_name, remote_jid, text):
    """
    Função centralizada para envio de mensagens (Evolution v2).
    Usada tanto pelo Webhook (erros) quanto pelo Celery (IA).
    """
    url = f"{EVOLUTION_API_URL}/message/sendText/{instance_name}"

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
        response = requests.post(url, json=body, headers=get_headers())
        if response.status_code not in [200, 201]:
            print(f"⚠️ Erro envio Whats: {response.text}")
    except Exception as e:
        print(f"⚠️ Erro conexão Whats: {e}")