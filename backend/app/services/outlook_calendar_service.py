"""
    Serviço para interagir com o Outlook Calendar (Microsoft Graph API).
    Usa tokens armazenados no Supabase e renova o access_token automaticamente.
"""

import os
import requests
import datetime as dt
from app.core.security import decrypt_token
from app.services.interfaces import CalendarService
from app.core.database import get_supabase, TIMEZONE_BR, TIMEZONE_STR

class OutlookCalendarService(CalendarService):
    GRAPH_API_URL = "https://graph.microsoft.com/v1.0"
    TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"

    def __init__(self, clinic_id: str):
        self.clinic_id = clinic_id
        self.supabase = get_supabase()
        self.client_id = os.getenv("OUTLOOK_CLIENT_ID")
        self.client_secret = os.getenv("OUTLOOK_CLIENT_SECRET")
        
        if not self.client_id or not self.client_secret:
             raise ValueError("OUTLOOK_CLIENT_ID ou SECRET ausentes no .env")

        self.access_token = None
        self._load_refresh_token()

    def _load_refresh_token(self):
        try:
            response = self.supabase.table('clinicas')\
                .select('calendar_refresh_token')\
                .eq('id', self.clinic_id)\
                .single()\
                .execute()
            
            if not response.data or not response.data.get('calendar_refresh_token'):
                raise Exception(f"Clínica {self.clinic_id} não tem token do Outlook conectado.")

            refresh_token_encrypted = response.data.get('calendar_refresh_token')
            self.refresh_token = decrypt_token(refresh_token_encrypted)
            
        except Exception as e:
            raise Exception(f"Erro ao carregar token Outlook: {str(e)}")

    def _get_access_token(self):
        """
        Renova o access_token usando o refresh_token.
        """
        if self.access_token:
            return self.access_token

        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
            "scope": "Calendars.ReadWrite offline_access"
        }

        try:
            resp = requests.post(self.TOKEN_ENDPOINT, data=payload)
            data = resp.json()
            
            if resp.status_code != 200:
                print(f"❌ Erro renovando token Outlook: {data}")
                raise Exception(f"Falha na autenticação com Microsoft: {data.get('error_description')}")
            
            self.access_token = data["access_token"]
            return self.access_token
            
        except Exception as e:
            raise Exception(f"Erro de conexão com Microsoft Identity: {str(e)}")

    @property
    def headers(self):
        token = self._get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": 'outlook.timezone="America/Sao_Paulo"'
        }

    def listar_calendarios(self):
        """
        Lista calendários do usuário (endpoint /me/calendars).
        """
        url = f"{self.GRAPH_API_URL}/me/calendars"
        resp = requests.get(url, headers=self.headers)
        
        if resp.status_code != 200:
            raise Exception(f"Erro listando calendários: {resp.text}")
            
        data = resp.json()
        calendars = []
        
        for item in data.get("value", []):
            calendars.append({
                "id": item["id"],
                "summary": item["name"] # Outlook usa 'name' em vez de 'summary'
            })
            
        return calendars

    def listar_eventos(self, data: dt.datetime, calendar_id='primary'):
        """
        Lista eventos. Se calendar_id for 'primary', usa /me/calendarView.
        Senão, usa /me/calendars/{id}/calendarView.
        """
        # Define intervalo do dia (start e end)
        dia_apenas = data.date()
        start_dt = dt.datetime.combine(dia_apenas, dt.time.min).isoformat()
        end_dt = dt.datetime.combine(dia_apenas, dt.time.max).isoformat()
        
        # Endpoint correto
        if calendar_id == 'primary' or not calendar_id:
            endpoint = "/me/calendarView"
        else:
            endpoint = f"/me/calendars/{calendar_id}/calendarView"
            
        url = f"{self.GRAPH_API_URL}{endpoint}"
        
        params = {
            "startDateTime": start_dt,
            "endDateTime": end_dt,
            "$top": 100
        }
        
        print(f"🔍 Outlook: Buscando eventos em {calendar_id} para {dia_apenas}")
        
        resp = requests.get(url, headers=self.headers, params=params)
        
        if resp.status_code != 200:
            print(f"❌ Erro buscando eventos Outlook: {resp.text}")
            return []
            
        return resp.json().get("value", [])

    def criar_evento(self, calendar_id, resumo, inicio_dt: dt.datetime, descricao: str = None):
        """
        Cria evento.
        NOTE: O Outlook pede 'body' com 'contentType' e 'content'.
        """
        fim_dt = inicio_dt + dt.timedelta(hours=1)
        
        endpoint = "/me/events" if calendar_id == 'primary' else f"/me/calendars/{calendar_id}/events"
        url = f"{self.GRAPH_API_URL}{endpoint}"
        
        evento = {
            "subject": resumo,
            "body": {
                "contentType": "HTML",
                "content": descricao or ""
            },
            "start": {
                "dateTime": inicio_dt.isoformat(),
                "timeZone": TIMEZONE_STR
            },
            "end": {
                "dateTime": fim_dt.isoformat(),
                "timeZone": TIMEZONE_STR
            }
        }
        
        resp = requests.post(url, headers=self.headers, json=evento)
        
        if resp.status_code not in [200, 201]:
            raise Exception(f"Erro criando evento Outlook: {resp.text}")
            
        return resp.json()

    def cancelar_evento(self, calendar_id: str, event_id: str):
        """
        No Graph API, basta DELETE /me/events/{id}.
        O calendar_id não é estritamente necessário na URL se tivermos o ID global do evento,
        mas por consistência podemos tentar usar o endpoint /me/calendars se formos rigorosos,
        porém /me/events/{id} costuma resolver para qualquer calendário do usuário.
        """
        url = f"{self.GRAPH_API_URL}/me/events/{event_id}"
        
        print(f"🗑️ Outlook: Cancelando evento {event_id}...")
        resp = requests.delete(url, headers=self.headers)
        
        if resp.status_code == 204:
            return True
            
        print(f"⚠️ Erro ao cancelar Outlook: {resp.status_code} - {resp.text}")
        return False

    def mover_evento(self, calendar_id: str, event_id: str, novo_inicio: dt.datetime):
        """
        PATCH /me/events/{id}
        """
        url = f"{self.GRAPH_API_URL}/me/events/{event_id}"
        print(f"🔄 Outlook: Movendo evento {event_id}...")
        
        novo_fim = novo_inicio + dt.timedelta(hours=1)
        
        body = {
            "start": {
                "dateTime": novo_inicio.isoformat(),
                "timeZone": TIMEZONE_STR
            },
            "end": {
                "dateTime": novo_fim.isoformat(),
                "timeZone": TIMEZONE_STR
            }
        }
        
        resp = requests.patch(url, headers=self.headers, json=body)
        
        if resp.status_code != 200:
             raise Exception(f"Erro ao mover evento Outlook: {resp.text}")
             
        return resp.json()
