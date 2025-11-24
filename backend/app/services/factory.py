import os
from supabase import create_client, Client
from app.services.interfaces import CalendarService
from app.services.google_calendar_service import GoogleCalendarService

# Config Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
        provider = response.data.get('tipo_calendario', 'GOOGLE')
        
    except Exception:
        # Fallback para V1
        provider = 'GOOGLE'

    # 2. Retorna a classe correta
    if provider == 'GOOGLE':
        return GoogleCalendarService(clinic_id)
    
    elif provider == 'OUTLOOK':
        # return OutlookCalendarService(clinic_id) # Futuro
        raise NotImplementedError("Outlook ainda não implementado")
        
    else:
        raise ValueError(f"Provedor de calendário desconhecido: {provider}")