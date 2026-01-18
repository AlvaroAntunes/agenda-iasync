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
    """Singleton para cliente Supabase."""
    _instance: Client = None
    
    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not url or not key:
                raise ValueError("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env")
            
            cls._instance = create_client(url, key)
        
        return cls._instance

# Função helper para facilitar o uso
def get_supabase() -> Client:
    return SupabaseClient.get_client()