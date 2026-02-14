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
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.core.security import verify_global_password
from pydantic import BaseModel
from dotenv import load_dotenv
from app.services.tasks import processar_mensagem_ia
from app.services.history_service import HistoryService
from app.services.buffer_service import BufferService
from app.services.audio_service import AudioService
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

def _pick_first(*values):
    for value in values:
        if value is not None and value != "":
            return value
    return None

def _parse_json_if_string(value):
    if not isinstance(value, str):
        return value
    trimmed = value.strip()
    if not trimmed.startswith("{") and not trimmed.startswith("["):
        return value
    try:
        return json.loads(trimmed)
    except Exception:
        return value

def _normalize_uazapi_message(payload: dict) -> dict:
    message = payload.get("message")
    if not message:
        body = payload.get("body")
        if isinstance(body, dict):
            message = body.get("message") or body.get("msg") or body.get("data") or body
    if not message:
        data = payload.get("data")
        if isinstance(data, dict):
            message = data.get("message") or data.get("msg") or data.get("data")
        else:
            message = data
    if not message:
        message = payload.get("msg") or payload.get("messages")
    if isinstance(message, list):
        message = message[0] if message else None
    message = _parse_json_if_string(message)
    return message if isinstance(message, dict) else {}

def _infer_media_type(*candidates):
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        if candidate.get("audioMessage") or candidate.get("ptt") is True:
            return "audio"
        if candidate.get("imageMessage"):
            return "image"
        if candidate.get("videoMessage"):
            return "video"
        if candidate.get("documentMessage"):
            return "file"
        raw_type = str(
            candidate.get("messageType")
            or candidate.get("type")
            or candidate.get("mediaType")
            or candidate.get("mimetype")
            or candidate.get("mimeType")
            or candidate.get("contentType")
            or ""
        ).lower()
        if "image" in raw_type:
            return "image"
        if "video" in raw_type:
            return "video"
        if "audio" in raw_type:
            return "audio"
        if "document" in raw_type or "file" in raw_type:
            return "file"
        if candidate.get("JPEGThumbnail") or candidate.get("thumbnail") or candidate.get("thumb"):
            return "image"
    return None

def _infer_media_type_from_string(value: Optional[str]):
    if not value:
        return None
    raw = value.lower()
    if "audio" in raw:
        return "audio"
    if "image" in raw:
        return "image"
    if "video" in raw:
        return "video"
    if "document" in raw or "file" in raw:
        return "file"
    return None

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
        # print(
        #     "❌ Uazapi webhook erro:",
        #     json.dumps(
        #         {
        #             "status_code": webhook_resp.status_code,
        #             "error": webhook_resp.text,
        #             "request": {
        #                 "url": webhook_url,
        #                 "body": webhook_payload,
        #             },
        #         },
        #         indent=2,
        #     ),
        # )
    except Exception as e:
        print(f"⚠️ Erro ao configurar webhook: {e}")
    return False

@router.get("/sse/clinics/{clinic_id}", dependencies=[Depends(verify_global_password)])
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

@router.post("/uazapi/instance/create/{clinic_id}", dependencies=[Depends(verify_global_password)])
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
        # print(
        #     "❌ Uazapi create erro:",
        #     json.dumps(
        #         {
        #             "status_code": response.status_code,
        #             "error": error_text,
        #             "request": {
        #                 "url": url,
        #                 "body": body,
        #                 "headers": headers,
        #             },
        #         },
        #         indent=2,
        #     ),
        # )
        raise HTTPException(
            status_code=response.status_code,
            detail=error_text or "Erro ao criar instância na Uazapi"
        )

    data = response.json()
    # print("📦 Resposta Uazapi create:", json.dumps(data, indent=2))
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

@router.post("/uazapi/instance/connect/{clinic_id}", dependencies=[Depends(verify_global_password)])
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
    # print("📦 Resposta Uazapi connect:", json.dumps(data, indent=2))
    configure_uazapi_webhook(token)
    return data

@router.post("/uazapi/message/find/{clinic_id}", dependencies=[Depends(verify_global_password)])
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
    # print("📦 Resposta Uazapi message/find:", json.dumps(data, indent=2))
    return data

@router.post("/uazapi/message/send/{clinic_id}", dependencies=[Depends(verify_global_password)])
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
            "delay": 0,
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
    file_base64 = body.media_base64 or ""
    if "," in file_base64:
        file_base64 = file_base64.split(",", 1)[1]
    url = f"{UAZAPI_URL}/send/media"
    payload = {
        "number": number,
        "type": media_type,
        "file": file_base64,
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

    data = response.json()
    message_id = (
        data.get("messageid")
        or data.get("messageId")
        or data.get("id")
        or data.get("message", {}).get("id")
        or data.get("data", {}).get("id")
        or data.get("data", {}).get("messageId")
    )
    label = body.caption or (
        "[imagem]" if msg_type == "image"
        else "[vídeo]" if msg_type == "video"
        else "[áudio]" if msg_type == "audio"
        else "[arquivo]"
    )
    media_data_url = None
    if not message_id and body.media_base64:
        media_data_url = body.media_base64
    conteudo_historico = json.dumps({
        "type": msg_type,
        "id": message_id,
        "mimetype": body.mime_type,
        "fileName": body.file_name,
        "caption": body.caption,
        "dataUrl": media_data_url,
    })
    supabase.table('chat_messages').insert({
        'clinic_id': clinic_id,
        'session_id': number,
        'quem_enviou': 'ai',
        'conteudo': conteudo_historico
    }).execute()
    await sse_manager.broadcast(clinic_id, {
        "type": "message",
        "message": {
            "id": message_id or f"send-{datetime.utcnow().timestamp()}",
            "session_id": number,
            "quem_enviou": "ai",
            "conteudo": label,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "media": {
                "type": msg_type,
                "messageId": message_id,
                "mimeType": body.mime_type,
                "fileName": body.file_name,
                "caption": body.caption,
                "dataUrl": media_data_url,
            },
        }
    })
    return data

@router.get("/uazapi/instance/status/{clinic_id}", dependencies=[Depends(verify_global_password)])
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
    # print("📦 Resposta Uazapi status:", json.dumps(data, indent=2))
    return data

@router.get("/uazapi/message/download/{clinic_id}", dependencies=[Depends(verify_global_password)])
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

@router.delete("/uazapi/instance/{clinic_id}", dependencies=[Depends(verify_global_password)])
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

def enviar_mensagem_whatsapp(token: str, number: str, text: str):
    """Função auxiliar para enviar mensagem de texto via Uazapi"""
    try:
        url = f"{UAZAPI_URL}/send/text"
        payload = {
            "number": number,
            "text": text,
            "readmessages": True,
            "delay": 0,
            "presence": "composing",
            "linkPreview": False,
        }
        response = requests.post(url, json=payload, headers=get_uazapi_headers(token))
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"❌ Erro ao enviar mensagem WhatsApp: {e}")
        return False

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
            # Verifica se IA global/lead continuam ativas antes de processar
            try:
                clinica_resp = supabase.table('clinicas')\
                    .select('ia_ativa')\
                    .eq('id', clinic_id)\
                    .single()\
                    .execute()
                if clinica_resp.data and clinica_resp.data.get('ia_ativa') is False:
                    print("🛑 [Buffer] IA global desativada. Abortando processamento.")
                    return

                lead_resp = supabase.table('leads')\
                    .select('status_ia')\
                    .eq('clinic_id', clinic_id)\
                    .eq('telefone', telefone_cliente)\
                    .limit(1)\
                    .execute()
                if lead_resp.data and lead_resp.data[0].get('status_ia') is False:
                    print("🛑 [Buffer] IA desativada para o lead. Abortando processamento.")
                    return
            except Exception as status_err:
                print(f"⚠️ [Buffer] Erro ao checar status da IA: {status_err}")

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
        # print(json.dumps(payload, indent=4))

        # 1. Extração de Dados Básicos
        uazapi_token = payload.get("token")
        message = _normalize_uazapi_message(payload)
        
        print(f"🔍 Debug - Token: {uazapi_token}")
        print(f"🔍 Debug - Message: {message}")
        print(f"🔍 Debug - Message type: {type(message)}")
        
        if not uazapi_token:
            return {"status": "no_instance_id"}
        if not message:
            return {"status": "no_message"}

        # Ignora mensagens enviadas por mim
        from_me = (
            message.get("fromMe")
            or message.get("from_me")
            or (message.get("key") or {}).get("fromMe")
        )
        if from_me:
            return {"status": "ignored_from_me"}
        
        # 2. Identificação da Clínica (BUSCA NO BANCO)
        # Precisamos converter o ID da Uazapi para o UUID da sua Clínica
        try:
            resp = supabase.table('clinicas')\
                .select('id, ia_ativa, saldo_tokens, tokens_comprados')\
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
            tokens_comprados = clinica_data.get('tokens_comprados', 0)
        
        except Exception as e:
            print(f"❌ Erro ao buscar clínica no banco: {e}")
            return {"status": "db_error"}
        
        # 3. Identificação do Cliente
        # Uazapi manda o telefone limpo ou com sufixo. Vamos limpar.
        raw_chatid = _pick_first(
            message.get("chatid"),
            message.get("chatId"),
            message.get("chat_id"),
            (payload.get("chat") or {}).get("wa_chatid"),
            message.get("sender_pn"),
            message.get("from"),
            message.get("sender"),
        )
        raw_phone = _pick_first(raw_chatid, message.get("sender_pn"), message.get("sender"), message.get("from"))
        telefone_cliente = str(raw_phone).replace("@s.whatsapp.net", "").replace("+", "")
        message_id = _pick_first(
            message.get("messageid"),
            message.get("messageId"),
            message.get("id"),
            (message.get("key") or {}).get("id"),
        )
        lid = _pick_first(message.get("sender"), message.get("from"), raw_chatid)

        print(f"📩 Webhook Uazapi: Clínica {clinic_id} | Cliente: {telefone_cliente}")

        # Debug adicional
        print(f"🔍 Debug - Message ID: {message_id}")
        print(f"🔍 Debug - LID: {lid}")

        # 5. Extração do Conteúdo (Texto ou Mídia)
        msg_type = _pick_first(message.get("messageType"), message.get("type"), payload.get("messageType"))
        print(f"🔍 Debug - msg_type: {msg_type}")
        
        texto_usuario = ""
        texto_ia = ""
        
        content = _parse_json_if_string(message.get("content"))
        print(f"🔍 Debug - content: {content}")
        print(f"🔍 Debug - content type: {type(content)}")
        
        inner_message = message.get("message") if isinstance(message.get("message"), dict) else {}
        print(f"🔍 Debug - inner_message: {inner_message}")
        
        nested_content_message = content.get("message") if isinstance(content, dict) else {}
        print(f"🔍 Debug - nested_content_message: {nested_content_message}")
        content_dict = content if isinstance(content, dict) else {}
        content_text = None
        if isinstance(content, str):
            content_text = content
        elif isinstance(content, dict):
            content_text = _pick_first(content.get("text"), content.get("conversation"), content.get("message"))
        text_candidate = _pick_first(message.get("text"), message.get("conversation"), content_text)
        
        print(f"🔍 Debug - Antes de inferir media_type")
        print(f"🔍 Debug - content_dict: {content_dict}")
        
        media_type = _infer_media_type(message, inner_message, content_dict, nested_content_message, payload)
        print(f"🔍 Debug - media_type inferido: {media_type}")
        
        raw_type = (msg_type or "").lower()
        print(f"🔍 Debug - raw_type: {raw_type}")
        
        print(f"🔍 Debug - Iniciando processamento is_text_type")
        is_text_type = raw_type in {"conversation", "text", "extendedtextmessage"}
        print(f"🔍 Debug - is_text_type: {is_text_type}")
        
        if not media_type:
            print(f"🔍 Debug - Inferindo media_type from string")
            media_type = _infer_media_type_from_string(raw_type)
            print(f"🔍 Debug - media_type after string inference: {media_type}")
            
        if not media_type and raw_type:
            print(f"🔍 Debug - Verificando raw_type específicos")
            if raw_type in {"audiomessage", "audio"}:
                media_type = "audio"
            elif raw_type in {"imagemessage", "image"}:
                media_type = "image"
            elif raw_type in {"videomessage", "video"}:
                media_type = "video"
            elif raw_type in {"documentmessage", "document", "file"}:
                media_type = "file"
            print(f"🔍 Debug - media_type after raw_type check: {media_type}")

        print(f"🔍 Debug - Iniciando extração media_mime")

        print(f"🔍 Debug - Iniciando extração media_mime")
        try:
            media_mime = _pick_first(
                message.get("mimetype"),
                message.get("mimeType"),
                message.get("contentType"),
                content_dict.get("mimetype"),
                content_dict.get("mimeType"),
                content_dict.get("contentType"),
                message.get("content", {}).get("mimetype") if isinstance(message.get("content"), dict) else None,
                message.get("content", {}).get("mimeType") if isinstance(message.get("content"), dict) else None,
            )
            print(f"🔍 Debug - media_mime extraído com sucesso: {media_mime}")
        except Exception as mime_err:
            print(f"❌ Erro na extração de media_mime (parte 1): {mime_err}")
            media_mime = None

        print(f"🔍 Debug - Continuando extração media_mime (parte 2)")
        try:
            if media_mime is None:
                media_mime = _pick_first(
                    message.get("message", {}).get("content", {}).get("mimetype") if isinstance(message.get("message"), dict) and isinstance(message.get("message", {}).get("content"), dict) else None,
                    message.get("message", {}).get("content", {}).get("mimeType") if isinstance(message.get("message"), dict) and isinstance(message.get("message", {}).get("content"), dict) else None,
                )
            print(f"🔍 Debug - media_mime após parte 2: {media_mime}")
        except Exception as mime_err2:
            print(f"❌ Erro na extração de media_mime (parte 2): {mime_err2}")

        print(f"🔍 Debug - Continuando extração media_mime (parte 3)")
        try:
            if media_mime is None:
                payload_body = payload.get("body")
                if isinstance(payload_body, dict):
                    body_message = payload_body.get("message")
                    if isinstance(body_message, dict):
                        body_content = body_message.get("content")
                        if isinstance(body_content, dict):
                            media_mime = _pick_first(
                                body_content.get("mimetype"),
                                body_content.get("mimeType"),
                            )
            print(f"🔍 Debug - media_mime após parte 3: {media_mime}")
        except Exception as mime_err3:
            print(f"❌ Erro na extração de media_mime (parte 3): {mime_err3}")

        print(f"🔍 Debug - Iniciando extração media_file_name")
        try:
            media_file_name = _pick_first(
                message.get("fileName"),
                message.get("filename"),
                message.get("name"),
                content_dict.get("fileName"),
                content_dict.get("filename"),
                content_dict.get("name"),
                inner_message.get("fileName") if isinstance(inner_message, dict) else None,
                inner_message.get("filename") if isinstance(inner_message, dict) else None,
                inner_message.get("name") if isinstance(inner_message, dict) else None,
            )
            print(f"🔍 Debug - media_file_name extraído: {media_file_name}")
        except Exception as filename_err:
            print(f"❌ Erro na extração de media_file_name: {filename_err}")
            media_file_name = None
            
        print(f"🔍 Debug - Continuando com verificações de media_type")
        if not media_type:
            media_type = _infer_media_type_from_string(media_mime)
        if not media_type:
            media_type = _infer_media_type_from_string(media_file_name)
        if not media_type and media_mime:
            mime_main = str(media_mime).lower().split(";", 1)[0].strip()
            if mime_main.startswith("audio/"):
                media_type = "audio"
            elif mime_main.startswith("image/"):
                media_type = "image"
            elif mime_main.startswith("video/"):
                media_type = "video"
            elif mime_main.startswith("application/"):
                media_type = "file"
        if not media_type:
            url_candidate = _pick_first(
                content_dict.get("URL"),
                content_dict.get("url"),
                message.get("URL"),
                message.get("url"),
                inner_message.get("URL") if isinstance(inner_message, dict) else None,
                inner_message.get("url") if isinstance(inner_message, dict) else None,
            )
            if url_candidate:
                media_type = "file"
        media_caption = _pick_first(
            message.get("caption"),
            content_dict.get("caption"),
            inner_message.get("caption") if isinstance(inner_message, dict) else None,
        )
        if not media_caption and media_type != "audio":
            media_caption = _pick_first(
                message.get("text"),
                content_dict.get("text"),
                inner_message.get("text") if isinstance(inner_message, dict) else None,
            )
        if media_type == "audio":
            media_caption = None

        if is_text_type and not media_type:
            texto_usuario = text_candidate or ""
            if isinstance(texto_usuario, dict):
                texto_usuario = texto_usuario.get("text", "Não entendi a mensagem.")
            texto_ia = texto_usuario
        elif media_type:
            if media_type == "audio":
                print("🎧 Áudio detectado (Uazapi)...")
                
                # Verificar se temos message_id necessário para transcrição
                if not message_id:
                    print("⚠️ Message ID não encontrado para transcrição de áudio")
                    return {"status": "audio_no_message_id"}
                
                # Transcrever o áudio
                try:
                    audio_service = AudioService()
                    texto_transcrito = audio_service.transcrever_audio_uazapi(
                        uazapi_token,  # Token da Instância
                        message_id     # ID da Mensagem
                    )
                    
                    if not texto_transcrito:
                        # Se não conseguiu transcrever, envia mensagem de erro e para por aqui
                        enviar_mensagem_whatsapp(
                            uazapi_token, 
                            telefone_cliente, 
                            "Não consegui entender o áudio. Pode escrever, por favor?"
                        )
                        return {"status": "audio_error"}
                    else:
                        # Se transcreveu, usa o texto para processamento da IA
                        texto_usuario = texto_transcrito
                        texto_ia = texto_transcrito
                        
                except Exception as audio_err:
                    print(f"❌ Erro na transcrição de áudio: {audio_err}")
                    return {"status": "audio_transcription_error"}
            else:
                # Outras mídias (imagem, vídeo, arquivo) apenas logar
                texto_usuario = ""
                texto_ia = ""
        elif text_candidate:
            texto_usuario = text_candidate
            texto_ia = texto_usuario

        if not texto_usuario and not media_type:
            return {"status": "ignored_no_text"}

        print(f"💬 Processando: {texto_usuario or media_type}")

        # 6. Salvar mensagem no histórico e emitir para o painel
        if media_type:
            conteudo_historico = json.dumps({
                "type": media_type,
                "id": message_id,
                "messageId": message_id,
                "mimetype": media_mime,
                "fileName": media_file_name,
                "caption": media_caption,
            })
            try:
                HistoryService(clinic_id=clinic_id, session_id=telefone_cliente).add_user_message(conteudo_historico)
            except Exception as e:
                print(f"⚠️ Erro ao salvar histórico (media): {e}")
            await sse_manager.broadcast(clinic_id, {
                "type": "message",
                "message": {
                    "id": message_id or f"ws-{datetime.utcnow().timestamp()}",
                    "session_id": telefone_cliente,
                    "quem_enviou": "user",
                    "conteudo": media_caption or (
                        "[imagem]" if media_type == "image"
                        else "[vídeo]" if media_type == "video"
                        else "[áudio]" if media_type == "audio"
                        else "[arquivo]"
                    ),
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    "media": {
                        "type": media_type,
                        "messageId": message_id,
                        "mimeType": media_mime,
                        "fileName": media_file_name,
                        "caption": media_caption,
                    },
                }
            })
            return {"status": "media_logged"}
        else:
            try:
                HistoryService(clinic_id=clinic_id, session_id=telefone_cliente).add_user_message(texto_usuario)
            except Exception as e:
                print(f"⚠️ Erro ao salvar histórico (texto): {e}")
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

        # 6. Lead (rápido): checa status para IA e deixa criação completa em background
        lead_status_ia = True
        lead_needs_create = False
        try:
            lead_resp = supabase.table('leads')\
                .select('id, status_ia')\
                .eq('clinic_id', clinic_id)\
                .eq('telefone', telefone_cliente)\
                .limit(1)\
                .execute()
            if not lead_resp.data:
                lead_needs_create = True
            else:
                lead_status_ia = lead_resp.data[0].get('status_ia', True)
        except Exception as e:
            print(f"⚠️ Erro ao buscar lead: {e}")

        if lead_needs_create:
            def criar_lead_e_tags():
                try:
                    lead_payload = {
                        'clinic_id': clinic_id,
                        'lid': raw_chatid or lid or telefone_cliente,
                        'telefone': telefone_cliente,
                        'nome': '',
                        'status_ia': True
                    }
                    supabase.table('leads').upsert(
                        lead_payload,
                        on_conflict='clinic_id, telefone'
                    ).execute()
                    defaults = [
                        {"name": "Novo", "color": "#22c55e"},
                        {"name": "Lead", "color": "#0ea5e9"},
                        {"name": "Agendado", "color": "#10b981"},
                        {"name": "Perdido", "color": "#ef4444"},
                    ]
                    supabase.table('tags').upsert(
                        [
                            {
                                "clinic_id": clinic_id,
                                "name": item["name"],
                                "color": item["color"],
                                "is_system": True,
                            }
                            for item in defaults
                        ],
                        on_conflict='clinic_id,name'
                    ).execute()
                    lead_id_resp = supabase.table('leads')\
                        .select('id')\
                        .eq('clinic_id', clinic_id)\
                        .eq('telefone', telefone_cliente)\
                        .single()\
                        .execute()
                    lead_id = lead_id_resp.data.get('id') if lead_id_resp.data else None
                    if lead_id:
                        tags_resp = supabase.table('tags')\
                            .select('id, name')\
                            .eq('clinic_id', clinic_id)\
                            .in_('name', ['Novo', 'Lead'])\
                            .execute()
                        tag_ids = [t.get('id') for t in (tags_resp.data or []) if t.get('id')]
                        if tag_ids:
                            supabase.table('lead_tags').upsert(
                                [
                                    {
                                        "clinic_id": clinic_id,
                                        "lead_id": lead_id,
                                        "tag_id": tag_id,
                                    }
                                    for tag_id in tag_ids
                                ],
                                on_conflict='lead_id,tag_id'
                            ).execute()
                except Exception as tag_err:
                    print(f"⚠️ Erro ao criar lead/tags em background: {tag_err}")
            background_tasks.add_task(criar_lead_e_tags)

        # 7. Buffer & Agente (só se IA ativa)
        if not ia_ativa:
            return {"status": "ia_disabled_logged"}
        if not lead_status_ia:
            return {"status": "lead_ia_disabled"}

        if saldo_tokens <= 0 and tokens_comprados <= 0:
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

        # Texto vai direto para o buffer (rápido)
        if texto_ia:
            buffer_service.add_message(clinic_id, telefone_cliente, texto_ia)
            devo_iniciar_timer = buffer_service.should_start_timer(clinic_id, telefone_cliente)
            if devo_iniciar_timer:
                background_tasks.add_task(
                    esperar_e_processar,
                    clinic_id,
                    telefone_cliente,
                    uazapi_token,
                    lid,
                )
                return {"status": "timer_started"}
            return {"status": "accumulated"}

        if media_type:
            return {"status": "media_logged"}

        return {"status": "ignored_no_text_for_ia"}

    except Exception as e:
        print(f"❌ Erro Webhook Uazapi: {e}")
        return {"status": "error", "detail": str(e)}
    
    
