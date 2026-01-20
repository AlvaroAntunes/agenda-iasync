import os
import requests
from app.core.celery_app import celery_app
from app.services.agente_service import AgenteClinica
from app.services.history_service import HistoryService, mensagens_contexto
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp
from dotenv import load_dotenv

load_dotenv()

@celery_app.task(name="processar_mensagem_ia", acks_late=True)
def processar_mensagem_ia(clinic_id: str, telefone_cliente: str, texto_usuario: str, token_instancia: str, lid: str):
    print(f"⚙️ [Worker] Processando para {telefone_cliente}...")
    
    try:
        # 1. Histórico
        history_service = HistoryService(clinic_id=clinic_id, session_id=telefone_cliente)
        history_service.add_user_message(texto_usuario)
        historico = history_service.get_langchain_history(limit=mensagens_contexto)
        
        # 2. Agente
        print(f"🤖 [Worker] IA Pensando...")
        agente = AgenteClinica(clinic_id=clinic_id, session_id=telefone_cliente, lid=lid)
        resposta_ia = agente.executar(texto_usuario, historico)
        
        # 3. Salvar e Enviar
        history_service.add_ai_message(resposta_ia)
        enviar_mensagem_whatsapp(
            token_instancia=token_instancia,
            numero_telefone=telefone_cliente, 
            text=resposta_ia
        )
        
        print(f"✅ [Worker] Sucesso.")
        return "Sucesso"

    except Exception as e:
        print(f"❌ [Worker] Erro: {e}")
        return str(e)