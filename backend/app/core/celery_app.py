"""
Configuração do Celery para tarefas assíncronas.
Conecta com o Redis já usado no Docker Compose.
"""

import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Usa o Redis que já está no seu Docker Compose
REDIS_URL = os.getenv("CACHE_REDIS_URI")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.services.tasks"]
) 

celery_app.conf.task_routes = {
    "app.services.tasks.processar_mensagem_ia": "main-queue"
}