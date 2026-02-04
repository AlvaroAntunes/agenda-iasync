"""
Endpoint para listar calendários disponíveis na conta conectada.
"""

from fastapi import APIRouter, HTTPException
from app.services.factory import get_calendar_service

router = APIRouter()

@router.get("/calendars/list/{clinic_id}")
def list_calendars(clinic_id: str):
    """
    Lista todos os calendários da conta conectada (Google/Outlook).
    """
    try:
        # 1. Instancia o serviço correto (Factory)
        calendar_service = get_calendar_service(clinic_id)
        
        # 2. Chama o método de listar (que já implementamos no GoogleCalendarService)
        # O GoogleCalendarService.listar_calendarios() retorna uma lista de dicts {'id': ..., 'summary': ...}
        calendars = calendar_service.listar_calendarios()
        
        return {"calendars": calendars}
        
    except Exception as e:
        print(f"❌ Erro ao listar calendários: {e}")
        # Retorna lista vazia ou erro 500 dependendo do caso, 
        # mas aqui vamos estourar erro para o front saber.
        raise HTTPException(status_code=500, detail=str(e))
