"""
    Webhook para Uazapi.
    Recebe mensagens, identifica a clínica pelo ID da instância Uazapi
    e processa via Agente/Buffer.
"""

import json
import asyncio
import os
import requests
from fastapi import APIRouter, Request, BackgroundTasks
from dotenv import load_dotenv
from app.services.audio_service import AudioService
from app.services.tasks import processar_mensagem_ia
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp
from app.services.buffer_service import BufferService
from app.core.database import get_supabase
from app.core.rate_limiter import rate_limiter

load_dotenv()

# Config Supabase
supabase = get_supabase()

router = APIRouter()

UAZAPI_URL = os.getenv("UAZAPI_URL")

buffer_service = BufferService()
BUFFER_DELAY = 10  # Segundos de espera

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
                .select('id, ia_ativa')\
                .eq('uazapi_token', uazapi_token)\
                .single()\
                .execute()
            
            clinica_data = resp.data
            
            if not clinica_data:
                print(f"⚠️ Instância Uazapi não reconhecida no banco: {uazapi_token}")
                return {"status": "clinic_not_found"}
                
            clinic_id = clinica_data['id']
        
            # Verifica se IA está ativa
            if not clinica_data.get('ia_ativa', True):
                return {"status": "ia_disabled"}

        except Exception as e:
            print(f"❌ Erro ao buscar clínica no banco: {e}")
            return {"status": "db_error"}
        
        # 2.5. RATE LIMITING (após identificar clínica)
        # Verifica se a clínica está bloqueada
        is_blocked, ttl = rate_limiter.is_clinic_blocked(clinic_id)
        if is_blocked:
            print(f"🚫 [RateLimit] Requisição bloqueada - Clínica {clinic_id} (TTL: {ttl}s)")
            return {
                "status": "rate_limit_blocked",
                "message": f"Clínica temporariamente bloqueada. Aguarde {ttl} segundos.",
                "retry_after": ttl
            }
        
        # Verifica rate limit global
        global_allowed, global_msg = rate_limiter.check_global_rate_limit()
        if not global_allowed:
            print(f"🚨 [RateLimit] GLOBAL LIMIT - Requisição negada")
            return {
                "status": "rate_limit_global",
                "message": global_msg
            }
        
        # Verifica rate limit por clínica
        allowed, msg = rate_limiter.check_rate_limit_per_clinic(clinic_id)
        if not allowed:
            print(f"⚠️ [RateLimit] Rate limit excedido - Clínica {clinic_id}")
            return {
                "status": "rate_limit_exceeded",
                "message": msg
            }
        
        # Verifica burst protection
        burst_allowed, burst_msg = rate_limiter.check_burst_protection(clinic_id)
        if not burst_allowed:
            print(f"⚠️ [RateLimit] Burst detectado - Clínica {clinic_id}")
            return {
                "status": "rate_limit_burst",
                "message": burst_msg
            }
        
        # 3. Identificação do Cliente
        # Uazapi manda o telefone limpo ou com sufixo. Vamos limpar.
        raw_phone = message.get("chatid") or message.get("sender_pn") or payload.get("chat").get("wa_chatid")
        telefone_cliente = str(raw_phone).replace("@s.whatsapp.net", "").replace("+", "")
        message_id = message.get("messageid")
        lid = message.get("sender") or message.get("from")

        print(f"📩 Webhook Uazapi: Clínica {clinic_id} | Cliente: {telefone_cliente}")

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

        # 6. Buffer & Agente
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
    
    