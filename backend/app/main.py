from fastapi import FastAPI
from app.services.google_calendar_service import GoogleCalendarService
import datetime as dt
from app.api.auth import router as auth_router

app = FastAPI(title="IA Clinicas API")

app.include_router(auth_router, tags=["Autenticação"])

@app.get("/")
def root():
    return {"message": "API IA Clínicas rodando!"}

# Rota de Teste: Cria evento (simulando o IA)
@app.get("/agenda/criar/{clinic_id}")
def criar_teste(clinic_id: str):
    service = GoogleCalendarService(clinic_id=clinic_id)
    # Marca para amanhã às 15h
    amanha = dt.datetime.now() + dt.timedelta(days=1)
    horario = amanha.replace(hour=15, minute=0, second=0, microsecond=0)
    
    novo_evento = service.criar_evento("[Via API] Teste FastAPI", horario)
    return {"status": "criado", "link": novo_evento.get('htmlLink')}

# Rota de Teste: Ler agenda de uma clínica específica
@app.get("/agenda/{clinic_id}")
def ler_agenda(clinic_id: str):
    # Instancia o serviço JÁ apontando para a clínica certa
    try:
        service = GoogleCalendarService(clinic_id=clinic_id)
        eventos = service.listar_eventos()
        return {"eventos": eventos}
    except Exception as e:
        return {"erro": str(e)}