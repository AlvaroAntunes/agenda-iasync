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

@router.get("/calendars/events/{clinic_id}")
def list_events(clinic_id: str, start: str, end: str, calendar_id: str = "primary"):
    """
    Lista eventos de um calendário específico em um intervalo de tempo.
    
    Args:
        clinic_id: ID da clínica
        start: Data/hora inicial no formato ISO (ex: 2023-10-25T00:00:00Z)
        end: Data/hora final no formato ISO
        calendar_id: ID do calendário (padrão: "primary")
    
    Returns:
        Dict com lista de eventos
    """
    try:
        from datetime import datetime
        
        # Instancia o serviço correto (Google/Outlook)
        calendar_service = get_calendar_service(clinic_id)
        
        # Converte strings ISO para datetime
        try:
            dt_start = datetime.fromisoformat(start.replace("Z", "+00:00"))
            dt_end = datetime.fromisoformat(end.replace("Z", "+00:00"))
        except ValueError as ve:
            raise HTTPException(
                status_code=400, 
                detail=f"Formato de data inválido. Use ISO 8601: {str(ve)}"
            )
        
        # Valida que end > start
        if dt_end <= dt_start:
            raise HTTPException(
                status_code=400,
                detail="A data final deve ser posterior à data inicial"
            )
        
        # Busca eventos no período
        events = calendar_service.listar_eventos_periodo(dt_start, dt_end, calendar_id)
        
        return {"events": events}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao listar eventos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/calendars/events/{clinic_id}/{event_id}")
def delete_event(clinic_id: str, event_id: str, calendar_id: str = "primary"):
    """
    Remove um evento do Google Calendar.
    """
    try:
        service = get_calendar_service(clinic_id)
        success = service.cancelar_evento(calendar_id, event_id)
        if not success:
             raise HTTPException(status_code=500, detail="Falha ao cancelar evento no Google")
        return {"status": "deleted", "id": event_id}
    except Exception as e:
        print(f"❌ Erro ao deletar evento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/calendars/events/{clinic_id}/{event_id}")
def update_event(clinic_id: str, event_id: str, body: dict, calendar_id: str = "primary"):
    """
    Atualiza um evento existente.
    Body pode conter: summary, description, start(dateTime), end(dateTime), etc.
    """
    try:
        service = get_calendar_service(clinic_id)
        
        # Se vierem datas, precisamos garantir o formato correto para o Google
        # O Service espera um dict compatível com a API do Google.
        # O Frontend deve mandar { summary: "...", description: "..." } ou { start: { dateTime: ... } }
        
        updated_event = service.atualizar_evento(calendar_id, event_id, body)
        return updated_event
    except Exception as e:
        print(f"❌ Erro ao atualizar evento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calendars/events/{clinic_id}")
def create_event(clinic_id: str, body: dict, calendar_id: str = "primary"):
    """
    Cria um novo evento no calendário.
    
    Body deve conter:
        - summary: Título do evento (obrigatório)
        - start: Data/hora inicial no formato ISO (obrigatório)
        - description: Descrição do evento (opcional)
        - duration_hours: Duração em horas (opcional, padrão: 1)
    """
    try:
        from datetime import datetime
        
        # Validações
        if "summary" not in body or not body["summary"]:
            raise HTTPException(status_code=400, detail="Campo 'summary' é obrigatório")
        
        if "start" not in body or not body["start"]:
            raise HTTPException(status_code=400, detail="Campo 'start' é obrigatório")
        
        # Converte data de início
        try:
            start_dt = datetime.fromisoformat(body["start"].replace("Z", "+00:00"))
        except ValueError as ve:
            raise HTTPException(
                status_code=400,
                detail=f"Formato de data inválido em 'start': {str(ve)}"
            )
        
        service = get_calendar_service(clinic_id)
        
        # Cria o evento
        new_event = service.criar_evento(
            calendar_id=calendar_id,
            resumo=body["summary"],
            inicio_dt=start_dt,
            descricao=body.get("description", "")
        )
        
        return new_event
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar evento: {e}")
        raise HTTPException(status_code=500, detail=str(e))
