"""
    Webhook para Evolution API v2.3.7+
    Compatível com novos endpoints (/message/send/text) e tratamento de LIDs.
"""

import json
import asyncio
import os
import requests
from fastapi import APIRouter, Request
from app.services.agente_service import AgenteClinica
from app.services.history_service import HistoryService, mensagens_contexto
from dotenv import load_dotenv
from app.services.audio_service import AudioService
from supabase import create_client
from app.services.tasks import processar_mensagem_ia
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp

load_dotenv()

# Config Supabase (Service quem_enviou para ter acesso total)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

router = APIRouter()

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
AUTHENTICATION_API_KEY = os.getenv("AUTHENTICATION_API_KEY")

message_buffers = {}
BUFFER_DELAY = 10  # Segundos de espera

async def processar_mensagem_acumulada(clinic_id: str, telefone_cliente: str, target_response_jid: str):
    buffer_key = f"{clinic_id}:{telefone_cliente}"
    
    if buffer_key not in message_buffers:
        return

    # 1. Recupera mensagens
    mensagens = message_buffers[buffer_key]["msgs"]
    del message_buffers[buffer_key]
    
    # 2. Junta o texto
    texto_completo = ". ".join(mensagens)
    
    print(f"🚀 Enviando bloco para o Celery: {texto_completo}")

    # 3. Chama o Celery em vez de processar aqui
    # O .delay() é instantâneo, ele só joga pro Redis e libera o servidor
    processar_mensagem_ia.delay(
        clinic_id, 
        telefone_cliente, 
        texto_completo, 
        target_response_jid
    )

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
        
def resolver_jid_cliente(clinic_id: str, remote_jid: str, sender_pn: str, lid: str, nome: str = "Desconhecido") -> str:
    """
    Descobre o número real do cliente (JID).
    Fluxo: SenderPn -> SenderRoot -> RemoteJid -> Cache(LIDs) -> API
    """

    # 1. Prioridade Máxima: O WhatsApp já mandou o número no senderPn (v2.3+)
    if sender_pn and "@s.whatsapp.net" in sender_pn:
        numero = sender_pn.split("@")[0]
        salvar_lid_cache(clinic_id, lid, numero, nome)
        return numero

    # 2. Prioridade Média: remoteJid já é número
    if remote_jid and "@s.whatsapp.net" in remote_jid:
        numero = remote_jid.split("@")[0]
        salvar_lid_cache(clinic_id, lid, numero, nome)
        return numero

    # 3. Caso LID: Tentar Cache Local -> API
    if lid and "@lid" in lid:        
        # --- BUSCA NO CACHE (Tabela 'lids') ---
        try:
            # print(f"🕵️ Buscando LID {lid} no banco...")
            lid_supabase = supabase.table('lids')\
                .select('telefone')\
                .eq('clinic_id', clinic_id)\
                .eq('lid', lid)\
                .limit(1)\
                .execute()
                
            if lid_supabase.data and len(lid_supabase.data) > 0:
                telefone_found = lid_supabase.data[0]['telefone']
                print(f"✅ LID encontrado no Cache (DB): {telefone_found}")
                return telefone_found
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

        clinic_id = payload.get("instance")
        
        ia_ativa = supabase.table('clinicas')\
                .select('ia_ativa')\
                .eq('id', clinic_id)\
                .execute()
                
        if not ia_ativa.data or len(ia_ativa.data) <= 0 or not ia_ativa.data[0]['ia_ativa']:
            print(f"⚠️ IA desativada para clínica {clinic_id}. Ignorando webhook.")
            return {"status": "ia_disabled"}
        
        # --- 2. IDENTIFICAÇÃO DO CLIENTE (Lógica V2) ---
        
        remote_jid = key.get("remoteJid") # ID da conversa (onde vamos responder)
        sender_pn = key.get("senderPn") # Quem enviou 
        lid_full = key.get("previousRemoteJid")
        lid = lid_full if lid_full else remote_jid
        nome = data.get("pushName", "Desconhecido")
        
        telefone_cliente = resolver_jid_cliente(clinic_id=clinic_id, remote_jid=remote_jid, sender_pn=sender_pn, lid=lid, nome=nome)
        print(f"📩 Webhook V2: Instância {clinic_id} | Cliente: {telefone_cliente}")
        
        if sender_pn: 
            target_response_jid = sender_pn
        elif telefone_cliente != "unknown" and "@" not in telefone_cliente:
            target_response_jid = f"{telefone_cliente}@s.whatsapp.net"
        else: 
            target_response_jid = remote_jid

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
                enviar_mensagem_whatsapp(
                    instance_name=clinic_id, 
                    remote_jid=telefone_cliente, 
                    text="Desculpe, tive um problema técnico para ouvir o áudio. Pode escrever?"
                )
                return {"status": "audio_error"}
            
            texto_usuario = texto_transcrito

        if not texto_usuario:
            return {"status": "no_text"}

        print(f"💬 Mensagem Processada: {texto_usuario}")

        # --- LÓGICA DO BUFFER (DEBOUNCE) ---
        
        buffer_key = f"{clinic_id}:{telefone_cliente}"
        
        # 1. Se já existe um timer rodando para esse cliente, cancela!
        if buffer_key in message_buffers:
            message_buffers[buffer_key]["task"].cancel()
        else:
            message_buffers[buffer_key] = {"msgs": []}
            
        # 2. Adiciona a nova mensagem na lista
        message_buffers[buffer_key]["msgs"].append(texto_usuario)
        
        # 3. Cria um novo timer de 10s
        # O asyncio.create_task roda em background sem travar o servidor
        task = asyncio.create_task(esperar_e_processar(clinic_id, telefone_cliente, target_response_jid))
        message_buffers[buffer_key]["task"] = task

        return {"status": "buffered"}

    except Exception as e:
        print(f"❌ Erro no Webhook V2: {e}")
        return {"status": "error", "detail": str(e)}

async def esperar_e_processar(clinic_id, telefone_cliente, target_jid):
    """
    Wrapper assíncrono que espera e depois chama o processador.
    """
    try:
        await asyncio.sleep(BUFFER_DELAY) # Espera 10 segundos
        
        # Se chegou aqui sem ser cancelado, processa!
        await processar_mensagem_acumulada(clinic_id, telefone_cliente, target_jid)
        
    except asyncio.CancelledError:
        # Se foi cancelado (porque chegou outra msg), não faz nada.
        print(f"⏳ Timer cancelado para {telefone_cliente} (nova msg chegou)")
