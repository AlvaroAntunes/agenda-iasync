"""
    Decide qual implementação retornar baseado no calendário da clínica.
"""

import os
from app.services.interfaces import CalendarService
from app.services.google_calendar_service import GoogleCalendarService
from app.services.outlook_calendar_service import OutlookCalendarService
from dotenv import load_dotenv  
from app.core.database import get_supabase

load_dotenv()  # Carrega variáveis do .env

# Config Supabase
supabase = get_supabase()

def get_calendar_service(clinic_id: str) -> CalendarService:
    """
    Factory Pattern:
    Decide qual implementação de calendário retornar baseado
    na configuração da clínica no banco de dados.
    """
    
    # 1. Verifica no banco qual é o provedor dessa clínica
    try:
        response = supabase.table('clinicas')\
            .select('tipo_calendario')\
            .eq('id', clinic_id)\
            .single()\
            .execute()
            
        # Se não tiver a coluna tipo_calendario ou der erro, assume Google (V1)
        provider = response.data.get('tipo_calendario', 'google')
        
    except Exception:
        # Fallback para V1
        provider = 'google'

    # 2. Retorna a classe correta
    if provider == 'google':
        return GoogleCalendarService(clinic_id)
    
    elif provider == 'outlook':
        return OutlookCalendarService(clinic_id)
        
    else:
        raise ValueError(f"Provedor de calendário desconhecido: {provider}")