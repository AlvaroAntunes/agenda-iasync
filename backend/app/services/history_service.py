"""
    Serviço para gerenciar o histórico de mensagens do chat, integrado com Supabase.
    Permite salvar e recuperar mensagens no formato esperado pelo LangChain.
"""

mensagens_contexto = 10  # Número de mensagens recentes a buscar para contexto

import os
from typing import List
from supabase import create_client
from langchain_core.messages import HumanMessage, AIMessage
from dotenv import load_dotenv

load_dotenv()  # Carrega variáveis do .env

# Config Supabase (Service quem_enviou para ter acesso total)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

class HistoryService:
    def __init__(self, clinic_id: str, session_id: str, lid: str):
        self.clinic_id = clinic_id
        self.session_id = session_id

    def get_langchain_history(self, limit=mensagens_contexto) -> List:
        """
        Busca as últimas 'limit' mensagens e retorna no formato que o LangChain entende.
        """
        try:
            # Busca mensagens ordenadas da mais recente para a mais antiga
            response = supabase.table('chat_messages')\
                .select('quem_enviou, conteudo')\
                .eq('clinic_id', self.clinic_id)\
                .eq('session_id', self.session_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            # O Supabase retorna do mais novo para o mais velho. 
            # O LangChain precisa da ordem cronológica (velho -> novo).
            # Então invertemos a lista [::-1]
            mensagens_db = response.data[::-1]
            
            historico = []
            
            for msg in mensagens_db:
                if msg['quem_enviou'] == 'user':
                    historico.append(HumanMessage(content=msg['conteudo']))
                elif msg['quem_enviou'] == 'ai':
                    historico.append(AIMessage(content=msg['conteudo']))
            
            return historico

        except Exception as e:
            print(f"Erro ao buscar histórico: {e}")
            return [] # Retorna lista vazia se der erro (melhor que quebrar)

    def add_user_message(self, conteudo: str):
        self._save_message('user', conteudo)

    def add_ai_message(self, conteudo: str):
        self._save_message('ai', conteudo)

    def _save_message(self, quem_enviou: str, conteudo: str):
        supabase.table('chat_messages').insert({
            'clinic_id': self.clinic_id,
            'session_id': self.session_id,
            'quem_enviou': quem_enviou,
            'conteudo': conteudo
        }).execute()