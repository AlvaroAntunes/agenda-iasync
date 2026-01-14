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
from supabase import create_client
from app.services.tasks import processar_mensagem_ia
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp
from app.services.buffer_service import BufferService

load_dotenv()

# Config Supabase (Service quem_enviou para ter acesso total)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

router = APIRouter()

UAZAPI_URL = os.getenv("UAZAPI_URL")

buffer_service = BufferService()
BUFFER_DELAY = 10  # Segundos de espera

async def esperar_e_processar(clinic_id: str, telefone_cliente: str, token_instancia: str):
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
                token_instancia
            )
        else:
            print(f"⚠️ [Buffer] Timer acabou mas não havia mensagens (já processado?).")
            
    except Exception as e:
        print(f"❌ Erro no processamento do buffer: {e}")

def salvar_lid_cache(clinic_id: str, lid: str, telefone: str, nome: str = "Desconhecido"):
    """
    Salva o mapeamento LID -> Telefone no banco para consultas futuras rápidas.
    Tabela: public.lids (lid text, telefone text, nome text, clinic_id uuid)
    """
    try:
        # Upsert garante que se já existir, atualiza/ignora
        supabase.table('lids').upsert({
            'clinic_id': clinic_id,
            'lid': lid,
            'telefone': telefone,
            'nome': nome
        }, on_conflict='clinic_id,lid').execute()
        print(f"💾 LID cacheado com sucesso: {lid} -> {telefone}")
    except Exception as e:
        print(f"⚠️ Erro ao salvar cache LID (Tabela 'lids' existe?): {e}")
        
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
        
        # 3. Identificação do Cliente
        # Uazapi manda o telefone limpo ou com sufixo. Vamos limpar.
        raw_phone = message.get("chatid") or message.get("sender_pn") or payload.get("chat").get("wa_chatid")
        telefone_cliente = str(raw_phone).replace("@s.whatsapp.net", "").replace("+", "")
        message_id = message.get("messageid")

        print(f"📩 Webhook Uazapi: Clínica {clinic_id} | Cliente: {telefone_cliente}")

        # 5. Extração do Conteúdo (Texto ou Áudio)
        msg_type = message.get("messageType") or message.get("type")
        texto_usuario = ""

        if msg_type == "Conversation" or msg_type == "text":
            texto_usuario = message.get("content") or message.get("text")
            
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
                uazapi_token     
            )
            return {"status": "timer_started"}
        else:
            return {"status": "accumulated"}

    except Exception as e:
        print(f"❌ Erro Webhook Uazapi: {e}")
        return {"status": "error", "detail": str(e)}

# @router.post("/webhook/uazapi")
# async def uazapi_webhook(request: Request, background_tasks: BackgroundTasks):
#     # Faça o teste do payload aqui
#     payload = await request.json()
#     print("Payload recebido no webhook Uazapi:")
#     print(json.dumps(payload, indent=4))  # Imprime o payload formatado no console
#     return {"status": "received"}
    
    