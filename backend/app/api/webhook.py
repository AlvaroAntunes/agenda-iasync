"""
    Webhook para receber mensagens da Evolution API (WhatsApp) e responder via IA.
"""

import json
import os
import requests
from fastapi import APIRouter, Request, HTTPException
from app.services.agente_service import AgenteClinica
from app.services.history_service import HistoryService, mensagens_contexto
from dotenv import load_dotenv

from app.services.audio_service import AudioService

load_dotenv()  # Carrega variáveis do .env

router = APIRouter()

# Configuração da Evolution API (Gateway)
EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
AUTHENTICATION_API_KEY = os.getenv("AUTHENTICATION_API_KEY")

@router.post("/webhook/evolution")
async def evolution_webhook(request: Request):
    """
    Recebe eventos da Evolution API (WhatsApp).
    """
    try:
        payload = await request.json()
        
        # 1. Filtrar eventos (Só queremos mensagens novas)
        event_type = payload.get("event")

        if event_type != "messages.upsert":
            return {"status": "ignored"}

        data = payload.get("data", {})
        key = data.get("key", {})
        
        print("\n--- DEBUG PAYLOAD COMPLETO ---")
        print(json.dumps(payload, indent=2, default=str))
        
        # Ignorar mensagens enviadas por MIM mesmo (pelo bot)
        if key.get("fromMe"):
            return {"status": "ignored_from_me"}

        # 2. Extrair dados cruciais
        # Na Evolution, o nome da instância PODE ser o ID da clínica (Estratégia Multi-tenant)
        clinic_id = payload.get("instance") 
        
        # O 'remoteJid' é o número do cliente (ex: 5511999998888@s.whatsapp.net). O campo "sender" também pode trazer o número.
        raw_id = data.get("sender") or key.get("remoteJid")
        
        if "@" in raw_id:
            telefone_cliente = raw_id.split("@")[0]
        else:
            telefone_cliente = raw_id
            
        remote_jid = raw_id
        
        # Extrair Texto
        message_content = data.get("message", {})
        texto_usuario = ""
        
        # Lógica para pegar texto de iPhone, Android ou Web (varia a estrutura)
        if "conversation" in message_content:
            texto_usuario = message_content["conversation"]
        elif "extendedTextMessage" in message_content:
            texto_usuario = message_content["extendedTextMessage"]["text"]
        elif "audioMessage" in message_content:
            audio_service = AudioService()
            texto_usuario = audio_service.transcrever_audio_evolution(clinic_id=clinic_id, message_object=data) or ""
            
            if not texto_usuario:
                enviar_mensagem_whatsapp(
                    clinic_id, 
                    remote_jid, 
                    "Desculpe, não consegui ouvir seu áudio. Pode mandar novamente ou escrever?"
                )
                
                return {"status": "audio_error_handled"}
        
        if not texto_usuario:
            return {"status": "no_text"}

        print(f"📩 Webhook: Clínica {clinic_id} | Cliente {telefone_cliente}: {texto_usuario}")

        # 3. Chamar o Cérebro (Seu Agente)
        # Nota: Aqui assumimos que o nome da instância na Evolution É o UUID da clínica
        
        # --- Histórico ---
        history_service = HistoryService(clinic_id=clinic_id, session_id=telefone_cliente)
        history_service.add_user_message(texto_usuario)
        historico = history_service.get_langchain_history(limit=mensagens_contexto)
        
        # --- Agente ---
        agente = AgenteClinica(clinic_id=clinic_id, session_id=telefone_cliente)
        resposta_ia = agente.executar(
            mensagem_usuario=texto_usuario,
            historico_conversa=historico
        )
        
        # --- Salvar Resposta ---
        history_service.add_ai_message(resposta_ia)

        # 4. Responder no WhatsApp (Enviar de volta para a Evolution API)
        enviar_mensagem_whatsapp(clinic_id, remote_jid, resposta_ia)

        return {"status": "processed"}

    except Exception as e:
        print(f"❌ Erro no Webhook: {e}")
        # Retornamos 200 OK mesmo com erro para a Evolution não ficar tentando reenviar infinitamente
        return {"status": "error", "detail": str(e)}

def enviar_mensagem_whatsapp(instance_name, remote_jid, text):
    """
    Envia a resposta de volta via HTTP para a Evolution API
    """
    url = f"{EVOLUTION_API_URL}/message/sendText/{instance_name}"
    
    headers = {
        "apikey": AUTHENTICATION_API_KEY,
        "Content-Type": "application/json"
    }
    
    body = {
        "number": remote_jid,
        "options": {
            "delay": 2000, # Simula digitação (2s)
            "presence": "composing"
        },
        "textMessage": {
            "text": text
        }
    }
    
    requests.post(url, json=body, headers=headers)