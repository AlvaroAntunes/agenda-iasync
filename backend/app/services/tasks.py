import os
import requests
from app.core.celery_app import celery_app
from app.core.database import get_supabase
from app.services.agente_service import AgenteClinica
from app.services.history_service import HistoryService, mensagens_contexto
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp
from dotenv import load_dotenv

load_dotenv()
supabase = get_supabase()

@celery_app.task(name="processar_mensagem_ia", acks_late=True)
def processar_mensagem_ia(clinic_id: str, telefone_cliente: str, texto_usuario: str, token_instancia: str, lid: str):
    print(f"⚙️ [Worker] Processando para {telefone_cliente}...")
    
    try:
        # 0. Verificar se IA global e IA do lead estão ativas
        clinica_resp = supabase.table('clinicas')\
            .select('ia_ativa')\
            .eq('id', clinic_id)\
            .single()\
            .execute()
        if clinica_resp.data and clinica_resp.data.get('ia_ativa') is False:
            print("🛑 [Worker] IA global desativada. Abortando.")
            return "IA global desativada"

        lead_resp = supabase.table('leads')\
            .select('status_ia')\
            .eq('clinic_id', clinic_id)\
            .eq('telefone', telefone_cliente)\
            .limit(1)\
            .execute()
        if lead_resp.data and lead_resp.data[0].get('status_ia') is False:
            print("🛑 [Worker] IA desativada para o lead. Abortando.")
            return "IA do lead desativada"

        # 1. Histórico
        history_service = HistoryService(clinic_id=clinic_id, session_id=telefone_cliente)
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
