"""
Endpoint para listar calendários disponíveis na conta conectada.
"""

from fastapi import APIRouter, HTTPException
from app.services.factory import get_calendar_service
from app.core.database import get_supabase

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
def list_events(clinic_id: str, start: str, end: str, calendar_id: str = None):
    """
    Lista eventos.
    - Se calendar_id for informado: Traz apenas daquele calendário.
    - Se calendar_id for None: Traz de TODOS os calendários da conta e mescla os resultados.
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
        
        if dt_end <= dt_start:
            raise HTTPException(status_code=400, detail="Data final deve ser maior que inicial")

        all_events = []

        # LÓGICA DE BUSCA
        supabase = get_supabase()
        
        if calendar_id:
            # Busca única (Comportamento antigo/específico)
            events = calendar_service.listar_eventos_periodo(dt_start, dt_end, calendar_id)
            all_events.extend(events)
        else:
            # Busca Múltipla (Itera sobre todos os calendários)
            
            # A. Carrega todos os profissionais para mapear nomes
            profissionais_resp = supabase.table('profissionais')\
                .select('id, nome, external_calendar_id')\
                .eq('clinic_id', clinic_id)\
                .execute()
            
            mapa_profissionais = {}
            if profissionais_resp.data:
                for p in profissionais_resp.data:
                    if p.get('external_calendar_id'):
                        mapa_profissionais[p['external_calendar_id']] = p

            # B. Pega a lista de calendários disponíveis no Google
            available_calendars = calendar_service.listar_calendarios()
            
            # Identifica qual é REALMENTE o calendário principal
            primary_cal_id = next((c['id'] for c in available_calendars if c.get('primary')), None)
            
            # Fallback 1: ID que parece email e não é grupo
            if not primary_cal_id:
                primary_cal_id = next((c['id'] for c in available_calendars if '@' in c['id'] and not c['id'].endswith('group.calendar.google.com')), None)
            
            # Fallback 2: O primeiro da lista
            if not primary_cal_id and available_calendars:
                primary_cal_id = available_calendars[0]['id']

            for cal in available_calendars:
                cal_id = cal['id']
                is_main_cal = (cal_id == primary_cal_id)
                
                is_professional = cal_id in mapa_profissionais
                
                # Se for o calendário principal, verifica se tem profissional cadastrado com 'primary'
                if is_main_cal:
                    if 'primary' in mapa_profissionais:
                        is_professional = True
                    elif cal_id in mapa_profissionais:
                        is_professional = True
                
                # FILTRO: Apenas calendário principal ou de médicos cadastrados
                if not is_main_cal and not is_professional:
                    continue

                try:
                    # 2. Busca eventos deste calendário específico
                    events = calendar_service.listar_eventos_periodo(dt_start, dt_end, cal_id)
                    
                    # 3. Enriquece evento com metadados
                    for event in events:
                        event['calendarId'] = cal_id
                        event['calendarSummary'] = cal.get('summary', 'Agenda')
                        
                        # Se for calendário de um médico, sobrescreve nome com o do médico
                        prof = None
                        if cal_id in mapa_profissionais:
                            prof = mapa_profissionais.get(cal_id)
                        elif is_main_cal and 'primary' in mapa_profissionais:
                            prof = mapa_profissionais.get('primary')
                            
                        if prof:
                            event['profissional_nome'] = prof['nome']
                            event['profissional_id'] = prof['id']
                            event['calendarSummary'] = prof['nome'] # Mostra nome do médico no front
                        
                        if 'backgroundColor' in cal:
                            event['color'] = cal['backgroundColor'] 
                    
                    all_events.extend(events)
                    
                except Exception as e_cal:
                    print(f"⚠️ Erro ao ler eventos do calendário {cal_id}: {e_cal}")
                    continue

        return {"events": all_events}

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

@router.get("/calendars/user-email/{clinic_id}")
def get_calendar_user_email(clinic_id: str):
    """
    Obtém o email do usuário conectado ao Google Calendar.
    """
    try:
        # Instancia o serviço correto (Google/Outlook)
        calendar_service = get_calendar_service(clinic_id)
        
        # Obtém o email do usuário
        email = calendar_service.obter_email_usuario()
        
        if not email:
            raise HTTPException(status_code=404, detail="Não foi possível obter o email do usuário")
        
        return {"email": email}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao obter email do usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))
