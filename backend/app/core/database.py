"""
Singleton para cliente Supabase e constantes globais.
Evita criar múltiplas instâncias do cliente em cada módulo.
"""

import os
from supabase import create_client, Client
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

# Constantes globais
TIMEZONE_BR = ZoneInfo("America/Sao_Paulo")
TIMEZONE_STR = "America/Sao_Paulo"
SLOT_CONSULTA = 5  # minutos

class SupabaseClient:
    """Manager para cliente Supabase."""
    _instance: Client = None
    
    @classmethod
    def get_client(cls, force_new=False) -> Client:
        if cls._instance is None or force_new:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not url or not key:
                raise ValueError("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env")
            
            cls._instance = create_client(url, key)
        
        return cls._instance

    @classmethod
    def reset_client(cls):
        cls._instance = None

# Função helper para facilitar o uso
def get_supabase(force_new=False) -> Client:
    return SupabaseClient.get_client(force_new)