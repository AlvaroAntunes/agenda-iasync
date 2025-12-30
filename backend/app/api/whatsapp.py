"""
    API para integração com Evolution WhatsApp API.
    Permite conectar instâncias do WhatsApp, verificar status e receber mensagens via webhook.
"""

import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()  # Carrega variáveis do .env

router = APIRouter()

EVOLUTION_URL = os.getenv("EVOLUTION_API_URL") 
EVOLUTION_KEY = os.getenv("AUTHENTICATION_API_KEY")
WEBHOOK_URL = "http://backend:8000/webhook/evolution" # URL do seu webhook

def get_headers():
    return {
        "apikey": EVOLUTION_KEY,
        "Content-Type": "application/json"
    }

@router.get("/whatsapp/status/{clinic_id}")
def get_status(clinic_id: str):
    """Verifica se está conectado"""
    url = f"{EVOLUTION_URL}/instance/connectionState/{clinic_id}"
    try:
        # Tenta buscar status
        response = requests.get(url, headers=get_headers())
        if response.status_code == 404:
            return {"status": "not_created"} # Instância não existe
        
        data = response.json()
        # Retorna: open (conectado), close (desconectado), connecting (lendo qr)
        return {"status": data.get("instance", {}).get("state", "close")}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.post("/whatsapp/connect/{clinic_id}")
def connect_whatsapp(clinic_id: str):
    """
    Cria a instância (se não existir) e retorna o QR Code em Base64
    """
    headers = get_headers()
    
    # 1. Tenta criar a instância (se já existir, a API retorna erro 403, que tratamos)
    create_url = f"{EVOLUTION_URL}/instance/create"
    create_body = {
        "instanceName": clinic_id,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS"
    }
    
    # Tenta criar. Se der erro, assumimos que já existe e seguimos.
    requests.post(create_url, json=create_body, headers=headers)

    # 2. Garante que o Webhook está configurado (Auto-Healing)
    webhook_url = f"{EVOLUTION_URL}/webhook/set/{clinic_id}"
    webhook_body = {
        "enabled": True,
        "url": WEBHOOK_URL,
        "webhookByEvents": True,
        "events": ["MESSAGES_UPSERT"]
    }
    requests.post(webhook_url, json=webhook_body, headers=headers)

    # 3. Pede o QR Code
    connect_url = f"{EVOLUTION_URL}/instance/connect/{clinic_id}"
    resp = requests.get(connect_url, headers=headers)
    
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Falha ao gerar QR Code na Evolution")
    
    data = resp.json()
    
    # O Base64 vem dentro de 'base64' ou 'code' dependendo da versão
    base64_img = data.get("base64") or data.get("code")
    
    if not base64_img:
        # Se não veio imagem, pode ser que já esteja conectado!
        return {"status": "connected", "qrcode": None}

    return {"status": "qrcode", "qrcode": base64_img}