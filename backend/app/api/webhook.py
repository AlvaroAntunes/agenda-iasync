"""
    Webhook para Uazapi.
    Recebe mensagens, identifica a clínica pelo ID da instância Uazapi
    e processa via Agente/Buffer.
"""

import json
import asyncio
import os
import requests
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from app.services.audio_service import AudioService
from app.services.tasks import processar_mensagem_ia
from app.services.history_service import HistoryService
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp
from app.services.buffer_service import BufferService
from app.core.database import get_supabase
from app.core.rate_limiter import rate_limiter

load_dotenv()

# Config Supabase
supabase = get_supabase()

router = APIRouter()

UAZAPI_URL = os.getenv("UAZAPI_URL")
UAZAPI_GLOBAL_TOKEN = os.getenv("UAZAPI_GLOBAL_TOKEN")
UAZAPI_ADMIN_TOKEN = os.getenv("UAZAPI_ADMIN_TOKEN")
UAZAPI_SYSTEM_NAME = os.getenv("UAZAPI_SYSTEM_NAME", "uazapiGO")
UAZAPI_WEBHOOK_URL = os.getenv("UAZAPI_WEBHOOK_URL")
UAZAPI_WEBHOOK_EVENTS = os.getenv("UAZAPI_WEBHOOK_EVENTS", "messages")
UAZAPI_WEBHOOK_EXCLUDES = os.getenv("UAZAPI_WEBHOOK_EXCLUDES", "wasSentByApi,isGroupYes")

buffer_service = BufferService()
BUFFER_DELAY = 10  # Segundos de espera

class SseManager:
    def __init__(self):
        self._subscribers = {}

    def subscribe(self, clinic_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(clinic_id, set()).add(queue)
        return queue

    def unsubscribe(self, clinic_id: str, queue: asyncio.Queue):
        if clinic_id in self._subscribers:
            self._subscribers[clinic_id].discard(queue)
            if not self._subscribers[clinic_id]:
                del self._subscribers[clinic_id]

    async def broadcast(self, clinic_id: str, message: dict):
        for queue in list(self._subscribers.get(clinic_id, set())):
            try:
                queue.put_nowait(message)
            except Exception:
                self.unsubscribe(clinic_id, queue)

sse_manager = SseManager()

def get_uazapi_headers(token: str):
    return {
        "Content-Type": "application/json",
        "token": token.strip() if token else token
    }

def get_uazapi_admin_headers(token: str):
    return {
        "Content-Type": "application/json",
        "admintoken": token.strip() if token else token
    }

def configure_uazapi_webhook(token: str):
    if not UAZAPI_WEBHOOK_URL:
        print("⚠️ UAZAPI_WEBHOOK_URL não configurado; webhook não será definido.")
        return False
    try:
        webhook_url = f"{UAZAPI_URL}/webhook"
        events = [e.strip() for e in UAZAPI_WEBHOOK_EVENTS.split(",") if e.strip()]
        excludes = [e.strip() for e in UAZAPI_WEBHOOK_EXCLUDES.split(",") if e.strip()]
        webhook_payload = {
            "enabled": True,
            "url": UAZAPI_WEBHOOK_URL,
            "events": events,
            "excludeMessages": excludes,
        }
        webhook_resp = requests.post(
            webhook_url,
            json=webhook_payload,
            headers=get_uazapi_headers(token),
        )
        if webhook_resp.status_code in [200, 201]:
            print("✅ Webhook Uazapi configurado com sucesso.")
            return True
        print(
            "❌ Uazapi webhook erro:",
            json.dumps(
                {
                    "status_code": webhook_resp.status_code,
                    "error": webhook_resp.text,
                    "request": {
                        "url": webhook_url,
                        "body": webhook_payload,
                    },
                },
                indent=2,
            ),
        )
    except Exception as e:
        print(f"⚠️ Erro ao configurar webhook: {e}")
    return False

def get_clinic_uazapi_token(clinic_id: str):
    try:
        resp = supabase.table('clinicas')\
            .select('uazapi_token')\
            .eq('id', clinic_id)\
            .single()\
            .execute()
        return resp.data.get('uazapi_token') if resp.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar clínica: {e}")

class ConnectInstanceBody(BaseModel):
    phone: Optional[str] = None

class MessageFindBody(BaseModel):
    id: Optional[str] = None
    chatid: Optional[str] = None
    track_source: Optional[str] = None
    track_id: Optional[str] = None
    limit: Optional[int] = None
    offset: Optional[int] = None

class SendMessageBody(BaseModel):
    type: str
    number: str
    text: Optional[str] = None
    media_base64: Optional[str] = None
    mime_type: Optional[str] = None
    file_name: Optional[str] = None
    caption: Optional[str] = None

@router.get("/sse/clinics/{clinic_id}")
async def clinic_sse(clinic_id: str):
    queue = sse_manager.subscribe(clinic_id)

    async def event_stream():
        try:
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            sse_manager.unsubscribe(clinic_id, queue)

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.post("/uazapi/instance/create/{clinic_id}")
def create_uazapi_instance(clinic_id: str):
    admin_token = UAZAPI_ADMIN_TOKEN or UAZAPI_GLOBAL_TOKEN
    if not UAZAPI_URL or not admin_token:
        raise HTTPException(status_code=500, detail="UAZAPI_URL ou UAZAPI_ADMIN_TOKEN não configurado")

    existing_token = get_clinic_uazapi_token(clinic_id)
    if existing_token:
        webhook_ok = configure_uazapi_webhook(existing_token)
        return {"status": "already_created", "token": existing_token, "webhook_configured": webhook_ok}

    url = f"{UAZAPI_URL}/instance/init"
    body = {
        "name": clinic_id,
        "systemName": UAZAPI_SYSTEM_NAME,
    }

    headers = get_uazapi_admin_headers(admin_token)
    response = requests.post(url, json=body, headers=headers)
    if response.status_code not in [200, 201]:
        error_text = response.text
        print(
            "❌ Uazapi create erro:",
            json.dumps(
                {
                    "status_code": response.status_code,
                    "error": error_text,
                    "request": {
                        "url": url,
                        "body": body,
                        "headers": headers,
                    },
                },
                indent=2,
            ),
        )
        raise HTTPException(
            status_code=response.status_code,
            detail=error_text or "Erro ao criar instância na Uazapi"
        )

    data = response.json()
    print("📦 Resposta Uazapi create:", json.dumps(data, indent=2))
    token = (
        data.get("token")
        or data.get("instance", {}).get("token")
        or data.get("data", {}).get("token")
    )

    if not token:
        raise HTTPException(
            status_code=500,
            detail=f"Token da instância não retornado pela Uazapi: {data}"
        )

    update_resp = supabase.table('clinicas')\
        .update({'uazapi_token': token})\
        .eq('id', clinic_id)\
        .execute()

    if getattr(update_resp, "error", None):
        raise HTTPException(status_code=500, detail=str(update_resp.error))

    # Configurar webhook da instância automaticamente
    configure_uazapi_webhook(token)

    return {"status": "created", "token": token, "data": data}

@router.post("/uazapi/instance/connect/{clinic_id}")
def connect_uazapi_instance(clinic_id: str, body: ConnectInstanceBody):
    if not UAZAPI_URL:
        raise HTTPException(status_code=500, detail="UAZAPI_URL não configurado")

    token = get_clinic_uazapi_token(clinic_id)
    if not token:
        return {"status": "not_configured"}

    url = f"{UAZAPI_URL}/instance/connect"
    payload = {}
    if body.phone:
        payload["phone"] = body.phone

    response = requests.post(url, json=payload, headers=get_uazapi_headers(token))
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail=response.text)

    data = response.json()
    print("📦 Resposta Uazapi connect:", json.dumps(data, indent=2))
    configure_uazapi_webhook(token)
    return data

@router.post("/uazapi/message/find/{clinic_id}")
def find_uazapi_messages(clinic_id: str, body: MessageFindBody):
    if not UAZAPI_URL:
        raise HTTPException(status_code=500, detail="UAZAPI_URL não configurado")

    token = get_clinic_uazapi_token(clinic_id)
    if not token:
        return {"status": "not_configured"}

    url = f"{UAZAPI_URL}/message/find"
    payload = body.dict(exclude_none=True)

    response = requests.post(url, json=payload, headers=get_uazapi_headers(token))
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail=response.text)

    data = response.json()
    print("📦 Resposta Uazapi message/find:", json.dumps(data, indent=2))
    return data

@router.post("/uazapi/message/send/{clinic_id}")
async def send_uazapi_message(clinic_id: str, body: SendMessageBody):
    if not UAZAPI_URL:
        raise HTTPException(status_code=500, detail="UAZAPI_URL não configurado")

    token = get_clinic_uazapi_token(clinic_id)
    if not token:
        return {"status": "not_configured"}

    number = (body.number or "").replace("@s.whatsapp.net", "").replace("+", "")
    if not number:
        raise HTTPException(status_code=400, detail="Número inválido")

    msg_type = (body.type or "text").lower()

    if msg_type == "text":
        text = (body.text or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Texto vazio")
        url = f"{UAZAPI_URL}/send/text"
        payload = {
            "number": number,
            "text": text,
            "readmessages": True,
            "delay": 1500,
            "presence": "composing",
            "linkPreview": False,
        }
        response = requests.post(url, json=payload, headers=get_uazapi_headers(token))
        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail=response.text)
        supabase.table('chat_messages').insert({
            'clinic_id': clinic_id,
            'session_id': number,
            'quem_enviou': 'ai',
            'conteudo': text
        }).execute()
        await sse_manager.broadcast(clinic_id, {
            "type": "message",
            "message": {
                "id": f"send-{datetime.utcnow().timestamp()}",
                "session_id": number,
                "quem_enviou": "ai",
                "conteudo": text,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
        })
        return response.json()

    if msg_type not in ["image", "video", "audio", "file"]:
        raise HTTPException(status_code=400, detail="Tipo de mensagem inválido")

    if not body.media_base64:
        raise HTTPException(status_code=400, detail="Arquivo não informado")

    media_type = "document" if msg_type == "file" else msg_type
    url = f"{UAZAPI_URL}/send/media"
    payload = {
        "number": number,
        "type": media_type,
        "file": body.media_base64,
        "text": body.caption,
        "docName": body.file_name if media_type == "document" else None,
        "mimetype": body.mime_type,
        "readmessages": True,
        "delay": 1500,
    }
    payload = {k: v for k, v in payload.items() if v is not None}
    response = requests.post(url, json=payload, headers=get_uazapi_headers(token))
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail=response.text)

    label = body.caption or (
        "[imagem]" if msg_type == "image"
        else "[vídeo]" if msg_type == "video"
        else "[áudio]" if msg_type == "audio"
        else "[arquivo]"
    )
    supabase.table('chat_messages').insert({
        'clinic_id': clinic_id,
        'session_id': number,
        'quem_enviou': 'ai',
        'conteudo': label
    }).execute()
    await sse_manager.broadcast(clinic_id, {
        "type": "message",
        "message": {
            "id": f"send-{datetime.utcnow().timestamp()}",
            "session_id": number,
            "quem_enviou": "ai",
            "conteudo": label,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
    })
    return response.json()

@router.get("/uazapi/instance/status/{clinic_id}")
def status_uazapi_instance(clinic_id: str):
    if not UAZAPI_URL:
        raise HTTPException(status_code=500, detail="UAZAPI_URL não configurado")

    token = get_clinic_uazapi_token(clinic_id)
    if not token:
        return {"status": "not_configured"}

    url = f"{UAZAPI_URL}/instance/status"
    response = requests.get(url, headers=get_uazapi_headers(token))
    if response.status_code in [401, 404]:
        # Evita limpar o token em falhas transitórias e mantém a instância no painel.
        return {"status": "disconnected"}
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail=response.text)

    data = response.json()
    print("📦 Resposta Uazapi status:", json.dumps(data, indent=2))
    return data

@router.get("/uazapi/message/download/{clinic_id}")
def download_uazapi_message(clinic_id: str, message_id: str):
    if not UAZAPI_URL:
        raise HTTPException(status_code=500, detail="UAZAPI_URL não configurado")

    token = get_clinic_uazapi_token(clinic_id)
    if not token:
        raise HTTPException(status_code=400, detail="Instância Uazapi não configurada")

    if not message_id:
        raise HTTPException(status_code=400, detail="message_id é obrigatório")

    url = f"{UAZAPI_URL}/message/download"
    headers = {
        "Content-Type": "application/json",
        "token": token,
    }
    payload = {
        "id": message_id,
        "return_base64": True,
        "generate_mp3": False,
    }
    response = requests.post(url, json=payload, headers=headers, timeout=15)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    data = response.json()
    base64_data = data.get("base64Data") or data.get("data")
    mime_type = data.get("mimetype") or data.get("mimeType") or data.get("contentType")
    file_name = data.get("fileName") or data.get("filename") or data.get("name")

    if not base64_data:
        raise HTTPException(status_code=500, detail="Base64 não retornado pela Uazapi")

    return {
        "base64": base64_data,
        "mimetype": mime_type,
        "file_name": file_name,
    }

@router.delete("/uazapi/instance/{clinic_id}")
def delete_uazapi_instance(clinic_id: str):
    if not UAZAPI_URL:
        raise HTTPException(status_code=500, detail="UAZAPI_URL não configurado")

    token = get_clinic_uazapi_token(clinic_id)
    if not token:
        return {"status": "not_configured"}

    url = f"{UAZAPI_URL}/instance"
    response = requests.delete(url, headers=get_uazapi_headers(token))
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail=response.text)

    update_resp = supabase.table('clinicas')\
        .update({'uazapi_token': None})\
        .eq('id', clinic_id)\
        .execute()

    if getattr(update_resp, "error", None):
        raise HTTPException(status_code=500, detail=str(update_resp.error))

    return {"status": "deleted"}

async def esperar_e_processar(clinic_id: str, telefone_cliente: str, token_instancia: str, lid: str):
    """
    Função assíncrona que aguarda o tempo do buffer e depois dispara o processamento.
    """
    try:
        print(f"⏳ [Buffer] Iniciando timer de {BUFFER_DELAY}s para {telefone_cliente}...")
        await asyncio.sleep(BUFFER_DELAY)
        
        # Acordou! Vamos pegar tudo que acumulou no Redis
        texto_completo = buffer_service.get_and_clear_messages(clinic_id, telefone_cliente)
        
        if texto_completo:
            print(f"🚀 [Buffer] Disparando IA com bloco: {texto_completo}")
                            
            # Envia para a fila do Celery (Background Worker)
            processar_mensagem_ia.delay(
                clinic_id, 
                telefone_cliente, 
                texto_completo, 
                token_instancia,
                lid
            )
        else:
            print(f"⚠️ [Buffer] Timer acabou mas não havia mensagens (já processado?).")
            
    except Exception as e:
        print(f"❌ Erro no processamento do buffer: {e}")

@router.post("/webhook/uazapi")
async def uazapi_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Recebe eventos da Uazapi.
    """
    try:       
        payload = await request.json()
        print("📥 Webhook Uazapi recebido:")
        print(json.dumps(payload, indent=4))

        # 1. Extração de Dados Básicos
        uazapi_token = payload.get("token")
        message = payload.get("message")
        
        if not uazapi_token:
            return {"status": "no_instance_id"}

        # Ignora mensagens enviadas por mim
        if message.get("fromMe"):
            return {"status": "ignored_from_me"}
        
        # 2. Identificação da Clínica (BUSCA NO BANCO)
        # Precisamos converter o ID da Uazapi para o UUID da sua Clínica
        try:
            resp = supabase.table('clinicas')\
                .select('id, ia_ativa, saldo_tokens')\
                .eq('uazapi_token', uazapi_token)\
                .single()\
                .execute()
            
            clinica_data = resp.data
            
            if not clinica_data:
                print(f"⚠️ Instância Uazapi não reconhecida no banco: {uazapi_token}")
                return {"status": "clinic_not_found"}
                
            clinic_id = clinica_data['id']
        
            ia_ativa = clinica_data.get('ia_ativa', True)
            saldo_tokens = clinica_data.get('saldo_tokens', 0)
        
        except Exception as e:
            print(f"❌ Erro ao buscar clínica no banco: {e}")
            return {"status": "db_error"}
        
        # 3. Identificação do Cliente
        # Uazapi manda o telefone limpo ou com sufixo. Vamos limpar.
        raw_chatid = message.get("chatid") or (payload.get("chat") or {}).get("wa_chatid")
        raw_phone = raw_chatid or message.get("sender_pn")
        telefone_cliente = str(raw_phone).replace("@s.whatsapp.net", "").replace("+", "")
        message_id = message.get("messageid")
        lid = message.get("sender") or message.get("from")

        print(f"📩 Webhook Uazapi: Clínica {clinic_id} | Cliente: {telefone_cliente}")

        # 4. Criar lead automaticamente se não existir
        try:
            lead_resp = supabase.table('leads')\
                .select('id')\
                .eq('clinic_id', clinic_id)\
                .eq('telefone', telefone_cliente)\
                .limit(1)\
                .execute()
            if not lead_resp.data:
                lead_payload = {
                    'clinic_id': clinic_id,
                    'lid': raw_chatid or lid or telefone_cliente,
                    'telefone': telefone_cliente,
                    'nome': None
                }
                supabase.table('leads').upsert(
                    lead_payload,
                    on_conflict='clinic_id, telefone'
                ).execute()
                await sse_manager.broadcast(clinic_id, {
                    "type": "lead",
                    "telefone": telefone_cliente,
                    "nome": None,
                })
        except Exception as e:
            print(f"⚠️ Erro ao criar lead automaticamente: {e}")

        # 5. Extração do Conteúdo (Texto ou Áudio)
        msg_type = message.get("messageType") or message.get("type") or payload.get("messageType")
        texto_usuario = ""

        if msg_type == "Conversation" or msg_type == "text" or msg_type == "ExtendedTextMessage":
            texto_usuario = message.get("content") or message.get("text")
            
            if isinstance(texto_usuario, dict):
                texto_usuario = texto_usuario.get("text", "Não entendi a mensagem.")
            
        elif msg_type == "AudioMessage" or msg_type == "media":
            print("🎧 Áudio detectado (Uazapi)...")
            # A Uazapi manda a URL direta do arquivo
            audio_url = message.get("content").get("URL")
            
            if audio_url:
                audio_service = AudioService()
                # Use o método de URL, não o de Evolution
                texto_transcrito = audio_service.transcrever_audio_uazapi(
                    uazapi_token, # Token da Instância
                    message_id # ID da Mensagem
                )
                # texto_transcrito = audio_service.transcrever_audio_url(audio_url)
                
                if not texto_transcrito:
                    enviar_mensagem_whatsapp(uazapi_token, telefone_cliente, "Não consegui entender o áudio. Pode escrever, por favor?")
                    return {"status": "audio_error"}
                
                texto_usuario = texto_transcrito

        if not texto_usuario:
            return {"status": "ignored_no_text"}

        print(f"💬 Processando: {texto_usuario}")

        # 6. Salvar mensagem no histórico (para aparecer nas conversas)
        HistoryService(clinic_id=clinic_id, session_id=telefone_cliente).add_user_message(texto_usuario)
        await sse_manager.broadcast(clinic_id, {
            "type": "message",
            "message": {
                "id": message_id or f"ws-{datetime.utcnow().timestamp()}",
                "session_id": telefone_cliente,
                "quem_enviou": "user",
                "conteudo": texto_usuario,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
        })

        # 7. Buffer & Agente (só se IA ativa)
        if not ia_ativa:
            return {"status": "ia_disabled_logged"}

        if saldo_tokens <= 0:
            print(f"⚠️ Saldo de tokens insuficiente para a clínica {clinic_id}")
            return {"status": "insufficient_balance"}

        # 7.5. RATE LIMITING (após salvar mensagem, só para IA)
        is_blocked, ttl = rate_limiter.is_clinic_blocked(clinic_id)
        if is_blocked:
            print(f"🚫 [RateLimit] Requisição bloqueada - Clínica {clinic_id} (TTL: {ttl}s)")
            return {
                "status": "rate_limit_blocked",
                "message": f"Clínica temporariamente bloqueada. Aguarde {ttl} segundos.",
                "retry_after": ttl
            }
        
        global_allowed, global_msg = rate_limiter.check_global_rate_limit()
        if not global_allowed:
            print(f"🚨 [RateLimit] GLOBAL LIMIT - Requisição negada")
            return {
                "status": "rate_limit_global",
                "message": global_msg
            }
        
        allowed, msg = rate_limiter.check_rate_limit_per_clinic(clinic_id)
        if not allowed:
            print(f"⚠️ [RateLimit] Rate limit excedido - Clínica {clinic_id}")
            return {
                "status": "rate_limit_exceeded",
                "message": msg
            }
        
        burst_allowed, burst_msg = rate_limiter.check_burst_protection(clinic_id)
        if not burst_allowed:
            print(f"⚠️ [RateLimit] Burst detectado - Clínica {clinic_id}")
            return {
                "status": "rate_limit_burst",
                "message": burst_msg
            }

        buffer_service.add_message(clinic_id, telefone_cliente, texto_usuario)
        devo_iniciar_timer = buffer_service.should_start_timer(clinic_id, telefone_cliente)

        if devo_iniciar_timer:
            background_tasks.add_task(
                esperar_e_processar, 
                clinic_id, 
                telefone_cliente, 
                uazapi_token,
                lid     
            )
            return {"status": "timer_started"}
        else:
            return {"status": "accumulated"}

    except Exception as e:
        print(f"❌ Erro Webhook Uazapi: {e}")
        return {"status": "error", "detail": str(e)}
    
    
