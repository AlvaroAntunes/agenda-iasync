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

celery_app.conf.update(
    task_routes={
        "app.services.tasks.processar_mensagem_ia": "main-queue"
    },
    # Garante que o worker só pegue 1 tarefa por vez (Crucial para IA/Tasks longas)
    # Evita que uma tarefa fique "presa" na fila de um worker ocupado
    worker_prefetch_multiplier=1,
    # Garante que a tarefa não seja perdida se o worker reiniciar
    task_acks_late=True,
    # Define o fuso horário para logs corretos
    timezone="America/Sao_Paulo"
)