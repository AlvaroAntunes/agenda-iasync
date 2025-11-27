"""
    API Principal do IA Clínicas usando FastAPI.
    Inclui rotas de autenticação e testes de integração com Google Calendar.
"""

import os
from fastapi import FastAPI
from pydantic import BaseModel
import datetime as dt
from supabase import create_client, Client
from dotenv import load_dotenv


from app.api.auth import router as auth_router
from app.services.factory import get_calendar_service
from app.services.history_service import HistoryService, mensagens_contexto
from app.services.agente_service import AgenteClinica
from app.api.webhook import router as webhook_router
from app.api.whatsapp import router as whatsapp_router

load_dotenv()  # Carrega variáveis do .env

# Config Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="IA Clinicas API")

app.include_router(auth_router, tags=["Autenticação"])
app.include_router(webhook_router, tags=["Webhooks"])
app.include_router(whatsapp_router, tags=["WhatsApp"])

@app.get("/")
def root():
    return {"message": "API IA Clínicas rodando!"}

# Exemplo de Rota Atualizada
@app.get("/agenda/criar/{clinic_id}/medico/{medico_id}")
def criar_teste_medico(clinic_id: str, medico_id: str): # Recebe o ID do médico (do seu banco)
    
    # 1. Busca os dados do médico no Supabase para pegar o external_calendar_id
    response = supabase.table('profissionais').select('external_calendar_id').eq('id', medico_id).single().execute()
    calendar_id = response.data['external_calendar_id']

    # 2. Inicializa o serviço (autentica com a conta da clínica)
    service = get_calendar_service(clinic_id=clinic_id)
    
    # 3. Cria o evento no calendário ESPECÍFICO daquele médico
    amanha = dt.datetime.now() + dt.timedelta(days=1)
    horario = amanha.replace(hour=10, minute=0, second=0, microsecond=0)
    
    novo_evento = service.criar_evento(
        calendar_id=calendar_id, 
        resumo="[IA] Consulta com Dr. João",
        inicio_dt=horario
    )
    
    return {"status": "criado", "medico": medico_id, "link": novo_evento.get('htmlLink')}

# Rota de Teste: Ler agenda de uma clínica específica
@app.get("/agenda/{clinic_id}")
def ler_agenda(clinic_id: str):
    # Instancia o serviço JÁ apontando para a clínica certa
    try:
        data = dt.datetime.now() + dt.timedelta(days=1)
        service = get_calendar_service(clinic_id=clinic_id)
        eventos = service.listar_eventos(data=data)
        return {"eventos": eventos}
    except Exception as e:
        return {"erro": str(e)}
    
@app.get("/config/calendarios/{clinic_id}")
def get_calendarios_disponiveis(clinic_id: str):
    # Retorna a lista de calendários para preencher o Dropdown da recepcionista.
    try:
        service = get_calendar_service(clinic_id=clinic_id)
        # Retorna lista de dicts: [{'id': '...', 'summary': 'Dra. Ana'}, ...]
        calendarios = service.listar_calendarios() 
        return calendarios
    except Exception as e:
        return {"erro": str(e)}

class ChatRequest(BaseModel):
    clinic_id: str
    session_id: str
    message: str
    
@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    try:
        # 1. Instancia o Serviço de Histórico
        history_service = HistoryService(clinic_id=request.clinic_id, session_id=request.session_id)
        
        # 2. Salva a mensagem que acabou de chegar do usuário
        history_service.add_user_message(request.message)
        
        # 3. Recupera o histórico (ex: últimas 10 trocas) para dar contexto ao robô
        historico_langchain = history_service.get_langchain_history(limit=mensagens_contexto)
        
        # 4. Inicializa e Executa o Agente
        agente = AgenteClinica(clinic_id=request.clinic_id, session_id=request.session_id)
        
        resposta_ia = agente.executar(
            mensagem_usuario=request.message,
            historico_conversa=historico_langchain # <--- Passamos o histórico real aqui
        )
        
        # 5. Salva a resposta da IA no banco
        history_service.add_ai_message(resposta_ia)
        
        return {"response": resposta_ia}
        
    except Exception as e:
        print(f"Erro no Chat: {e}")
        return {"error": "Erro interno"}