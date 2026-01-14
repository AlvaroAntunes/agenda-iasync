"""
    API Principal do IA Clínicas usando FastAPI.
    Inclui rotas de autenticação e testes de integração com Google Calendar.
"""

import os
from fastapi import FastAPI
from pydantic import BaseModel
import datetime as dt
from dotenv import load_dotenv

from app.api.auth import router as auth_router
from app.api.webhook import router as webhook_router
from app.api.whatsapp import router as whatsapp_router
from app.api.admin_rate_limit import router as admin_rate_limit_router
from app.core.database import get_supabase

load_dotenv()  # Carrega variáveis do .env

# Config Supabase
supabase = get_supabase()

app = FastAPI(title="IA Clinicas API")

app.include_router(auth_router, tags=["Autenticação"])
app.include_router(webhook_router, tags=["Webhooks"])
app.include_router(whatsapp_router, tags=["WhatsApp"])
app.include_router(admin_rate_limit_router, tags=["Admin - Rate Limiting"])

@app.get("/")
def root():
    return {"message": "API IA Clínicas rodando!"}
