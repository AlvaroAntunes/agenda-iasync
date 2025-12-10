"""
    Webhook para Evolution API v2.3.7+
    Compatível com novos endpoints (/message/send/text) e tratamento de LIDs.
"""

import json
import os
import requests
from fastapi import APIRouter, Request
from app.services.agente_service import AgenteClinica
from app.services.history_service import HistoryService, mensagens_contexto
from dotenv import load_dotenv
from app.services.audio_service import AudioService

load_dotenv()

router = APIRouter()

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
AUTHENTICATION_API_KEY = os.getenv("AUTHENTICATION_API_KEY")

@router.post("/webhook/evolution")
async def evolution_webhook(request: Request):
    """
    Recebe eventos da Evolution API v2.
    """
    try:
        payload = await request.json()
        print("\n--- DEBUG PAYLOAD COMPLETO ---")
        print(json.dumps(payload, indent=2, default=str))
        
        # 1. Filtro de Evento
        event_type = payload.get("event")
        if event_type != "messages.upsert":
            return {"status": "ignored"}

        # Na v2, dados principais estão em 'data'
        data = payload.get("data", {})
        key = data.get("key", {})
        
        # Ignorar mensagens enviadas pelo próprio bot
        if key.get("fromMe"):
            return {"status": "ignored_from_me"}

        clinic_id = payload.get("instance")
        
        # --- 2. IDENTIFICAÇÃO DO CLIENTE (Lógica V2) ---
        
        remote_jid = key.get("remoteJid") # ID da conversa (onde vamos responder)
        sender_root = key.get("senderPn") # Quem enviou 
        
        telefone_cliente = "unknown"
        target_response_jid = remote_jid

        # Prioridade 1: Sender da Raiz (Se for número válido)
        if sender_root and "@s.whatsapp.net" in sender_root:
            telefone_cliente = sender_root.split("@")[0]
            
        # Prioridade 2: RemoteJid (Se for número válido)
        elif remote_jid and "@s.whatsapp.net" in remote_jid:
            telefone_cliente = remote_jid.split("@")[0]
            
        # Prioridade 3: LID (Se só tivermos isso)
        else:
            # Se for LID, usamos o número do LID mesmo para não perder o histórico
            telefone_cliente = remote_jid.split("@")[0] if remote_jid else "unknown"

        print(f"📩 Webhook V2: Instância {clinic_id} | Cliente: {telefone_cliente}")

        # --- 3. CONTEÚDO DA MENSAGEM ---
        
        message_content = data.get("message", {})
        texto_usuario = ""
        
        if "conversation" in message_content:
            texto_usuario = message_content["conversation"]
        elif "extendedTextMessage" in message_content:
            texto_usuario = message_content["extendedTextMessage"]["text"]
        elif "audioMessage" in message_content:
            print("🎧 Áudio detectado (V2)...")
            audio_service = AudioService()
            
            # Passamos o objeto 'data' completo para descriptografar
            texto_transcrito = audio_service.transcrever_audio_evolution(clinic_id, data)
            
            if not texto_transcrito or texto_transcrito.startswith("[Erro"):
                enviar_mensagem_v2(
                    clinic_id, 
                    target_response_jid, 
                    "Desculpe, tive um problema técnico para ouvir o áudio. Pode escrever?"
                )
                return {"status": "audio_error"}
            
            texto_usuario = texto_transcrito

        if not texto_usuario:
            return {"status": "no_text"}

        print(f"💬 Mensagem Processada: {texto_usuario}")

        # --- 4. EXECUTAR AGENTE ---
        
        # Histórico (Baseado no telefone real)
        history_service = HistoryService(clinic_id=clinic_id, session_id=telefone_cliente)
        history_service.add_user_message(texto_usuario)
        historico = history_service.get_langchain_history(limit=mensagens_contexto)
        
        # Agente
        agente = AgenteClinica(clinic_id=clinic_id, session_id=telefone_cliente)
        resposta_ia = agente.executar(texto_usuario, historico)
        
        # Salvar resposta
        history_service.add_ai_message(resposta_ia)

        # --- 5. ENVIAR RESPOSTA (Endpoint V2) ---
        # Enviamos para o target_response_jid (que pode ser LID ou Phone) para manter a thread
        enviar_mensagem_v2(clinic_id, target_response_jid, resposta_ia)

        return {"status": "processed"}

    except Exception as e:
        print(f"❌ Erro no Webhook V2: {e}")
        return {"status": "error", "detail": str(e)}

def enviar_mensagem_v2(instance_name, remote_jid, text):
    """
    Envia mensagem usando os endpoints da Evolution API v2.
    Endpoint: POST /message/send/text
    """
    # NOVA URL DA V2
    url = f"{EVOLUTION_API_URL}/message/send/text"
    
    headers = {
        "apikey": AUTHENTICATION_API_KEY,
        "Content-Type": "application/json"
    }
    
    # NOVO PAYLOAD DA V2
    # 'instance' agora vai no corpo da requisição
    body = {
        "instance": instance_name,
        "number": remote_jid,
        "text": text,
        "options": {
            "delay": 2000,
            "presence": "composing"
        }
    }
    
    try:
        response = requests.post(url, json=body, headers=headers)
        if response.status_code != 201: # 201 Created é o sucesso na v2
            print(f"⚠️ Erro ao enviar (V2): {response.text}")
    except Exception as e:
        print(f"⚠️ Erro de conexão envio (V2): {e}")
