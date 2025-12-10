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
from supabase import create_client

load_dotenv()

# Config Supabase (Service quem_enviou para ter acesso total)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

router = APIRouter()

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
AUTHENTICATION_API_KEY = os.getenv("AUTHENTICATION_API_KEY")

def salvar_lid_cache(clinic_id: str, lid: str, phone: str):
    """
    Salva o mapeamento LID -> Telefone no banco para consultas futuras rápidas.
    Tabela: public.lids (lid text, phone_number text, clinic_id uuid)
    """
    try:
        # Upsert garante que se já existir, atualiza/ignora
        supabase.table('lids').upsert({
            'clinic_id': clinic_id,
            'lid': lid,
            'phone_number': phone
        }, on_conflict='clinic_id,lid').execute()
        print(f"💾 LID cacheado com sucesso: {lid} -> {phone}")
    except Exception as e:
        print(f"⚠️ Erro ao salvar cache LID (Tabela 'lids' existe?): {e}")
        
def resolver_jid_cliente(clinic_id: str, remote_jid: str, sender_pn: str, lid: str) -> str:
    """
    Descobre o número real do cliente (JID).
    Fluxo: SenderPn -> SenderRoot -> RemoteJid -> Cache(LIDs) -> API
    """

    # 1. Prioridade Máxima: O WhatsApp já mandou o número no senderPn (v2.3+)
    if sender_pn and "@s.whatsapp.net" in sender_pn:
        numero = sender_pn.split("@")[0]
        salvar_lid_cache(clinic_id, lid, numero)
        return numero

    # 2. Prioridade Média: remoteJid já é número
    if remote_jid and "@s.whatsapp.net" in remote_jid:
        numero = remote_jid.split("@")[0]
        salvar_lid_cache(clinic_id, lid, numero)
        return numero

    # 3. Caso LID: Tentar Cache Local -> API
    if lid and "@lid" in lid:        
        # --- BUSCA NO CACHE (Tabela 'lids') ---
        try:
            # print(f"🕵️ Buscando LID {lid} no banco...")
            lid_supabase = supabase.table('lids')\
                .select('phone_number')\
                .eq('clinic_id', clinic_id)\
                .eq('lid', lid)\
                .limit(1)\
                .execute()
                
            if lid_supabase.data and len(lid_supabase.data) > 0:
                phone_found = lid_supabase.data[0]['phone_number']
                print(f"✅ LID encontrado no Cache (DB): {phone_found}")
                return phone_found
        except Exception as e:
            # Se der erro (ex: tabela não existe), logamos mas não travamos
            print(f"⚠️ Erro leitura cache LID: {e}")

    # Fallback: Se tudo falhar, retorna o remoteJid para não perder a msg
    return remote_jid if remote_jid else "unknown"

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
            return {"status": "ignored_event"}

        # Na v2, dados principais estão em 'data'
        data = payload.get("data", {})
        key = data.get("key", {})
        
        # Filtros básicos de mensagens
        if key.get("fromMe"):
            return {"status": "ignored_from_me"}
        
        stub = data.get("messageStubType")
        if stub and stub not in [2]:  # ignore tudo exceto o 2
            return {"status": "ignored_stub"}

        if not data.get("message"):
            return {"status": "ignored_empty"}

        clinic_id = payload.get("instance")
        
        # --- 2. IDENTIFICAÇÃO DO CLIENTE (Lógica V2) ---
        
        remote_jid = key.get("remoteJid") # ID da conversa (onde vamos responder)
        sender_pn = key.get("senderPn") # Quem enviou 
        lid = key.get("previousRemoteJid")
        
        telefone_cliente = resolver_jid_cliente(clinic_id=clinic_id, remote_jid=remote_jid, sender_pn=sender_pn, lid=lid)
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
                    clinic_id=clinic_id, 
                    telefone_cliente=telefone_cliente, 
                    text="Desculpe, tive um problema técnico para ouvir o áudio. Pode escrever?"
                )
                return {"status": "audio_error"}
            
            texto_usuario = texto_transcrito

        if not texto_usuario:
            return {"status": "no_text"}

        print(f"💬 Mensagem Processada: {texto_usuario}")

        # --- 4. EXECUTAR AGENTE ---
        
        # Histórico (Baseado no telefone real)
        history_service = HistoryService(clinic_id=clinic_id, session_id=telefone_cliente, lid=lid)
        history_service.add_user_message(texto_usuario)
        historico = history_service.get_langchain_history(limit=mensagens_contexto)
        
        # Agente
        agente = AgenteClinica(clinic_id=clinic_id, session_id=telefone_cliente)
        resposta_ia = agente.executar(texto_usuario, historico)
        
        # Salvar resposta
        history_service.add_ai_message(resposta_ia)

        # --- 5. ENVIAR RESPOSTA (Endpoint V2) ---
        # Enviamos para o target_response_jid (que pode ser LID ou Phone) para manter a thread
        enviar_mensagem_v2(clinic_id, telefone_cliente, resposta_ia)

        return {"status": "processed"}

    except Exception as e:
        print(f"❌ Erro no Webhook V2: {e}")
        return {"status": "error", "detail": str(e)}

def enviar_mensagem_v2(instance_name, telefone_cliente, text):
    """
    Envia mensagem usando os endpoints da Evolution API v2.
    Endpoint: POST /message/sendText/{instance_name}
    """
    url = f"{EVOLUTION_API_URL}/message/sendText/{instance_name}"
    
    headers = {
        "apikey": AUTHENTICATION_API_KEY,
        "Content-Type": "application/json"
    }
    
    # NOVO PAYLOAD DA V2
    # 'instance' agora vai no corpo da requisição
    body = {
        "instance": instance_name,
        "number": telefone_cliente,
        "text": text,
        "delay": 2000,
        "linkPreview": False
    }
    
    try:
        response = requests.post(url, json=body, headers=headers)
        
        if response.status_code not in [200, 201]:
            print(f"⚠️ Erro ao enviar (V2): {response.text}")
    except Exception as e:
        print(f"⚠️ Erro de conexão envio (V2): {e}")
