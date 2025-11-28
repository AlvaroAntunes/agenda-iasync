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
