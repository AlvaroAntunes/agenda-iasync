"""
    API Principal do IA Clínicas usando FastAPI.
    Inclui rotas de autenticação e testes de integração com Google Calendar.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import datetime as dt
from dotenv import load_dotenv

from app.api.auth import router as auth_router
from app.api.webhook import router as webhook_router
from app.api.webhook_asaas import router as webhook_asaas_router
from app.api.whatsapp import router as whatsapp_router
from app.api.admin_rate_limit import router as admin_rate_limit_router
from app.api.admin_auth import router as admin_auth_router
from app.api.payments import router as payments_router
from app.api.calendars import router as calendars_router
from app.api.subscriptions import router as subscriptions_router
from app.core.database import get_supabase

load_dotenv()  # Carrega variáveis do .env

# Config Supabase
supabase = get_supabase()

# Desabilita documentação automática em produção (segurança)
app = FastAPI(
    title="IA Clinicas API",
    docs_url=None,      # Desabilita /docs
    redoc_url=None,     # Desabilita /redoc
    openapi_url=None    # Desabilita /openapi.json (JSON com todas as rotas)
)

# Configuração de CORS
# Para rotas públicas (webhooks): aceita qualquer origem
# Para rotas admin: proteção via JWT (apenas frontend autenticado)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# Se ALLOWED_ORIGINS for "*", permite todas as origens (webhooks públicos)
# Se especificar domínios, restringe CORS (mais seguro para produção)
if allowed_origins == ["*"]:
    # Modo público - webhooks precisam funcionar
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Modo restrito - apenas domínios específicos (frontend)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

from app.core.security import verify_global_password
from fastapi import Depends

app.include_router(auth_router, tags=["Autenticação"], dependencies=[Depends(verify_global_password)])
app.include_router(webhook_router, tags=["Webhooks"]) # Webhook precisa ser público (tem token próprio)
app.include_router(whatsapp_router, tags=["WhatsApp"], dependencies=[Depends(verify_global_password)])
app.include_router(admin_auth_router, tags=["Admin - Autenticação"], dependencies=[Depends(verify_global_password)])
app.include_router(admin_rate_limit_router, tags=["Admin - Rate Limiting"], dependencies=[Depends(verify_global_password)])
app.include_router(payments_router, tags=["Pagamentos"], dependencies=[Depends(verify_global_password)])
app.include_router(webhook_asaas_router, tags=["Pagamentos"]) # Webhook Asaas precisa ser público
app.include_router(calendars_router, tags=["Calendários"], dependencies=[Depends(verify_global_password)])
app.include_router(subscriptions_router, tags=["Assinaturas"], dependencies=[Depends(verify_global_password)])

@app.get("/")
def root():
    return {"status": "Ok"}
