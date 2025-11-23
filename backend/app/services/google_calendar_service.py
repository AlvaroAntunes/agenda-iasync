"""
    Serviço para interagir com o Google Calendar usando tokens armazenados no Supabase.
    Busca o refresh_token da clínica, monta as credenciais e permite listar/criar eventos.
"""

import os
import datetime as dt
from supabase import create_client, Client
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv
from app.core.security import decrypt_token 


load_dotenv()  # Carrega variáveis do .env

class GoogleCalendarService:
    SCOPES = ['https://www.googleapis.com/auth/calendar']

    def __init__(self, clinic_id: str):
        """
        Inicializa o serviço para uma clínica específica.
        Busca o refresh_token no Supabase e monta as credenciais.
        """
        self.clinic_id = clinic_id
        self.supabase = self._get_supabase_client()
        
        # Busca e monta as credenciais
        self.creds = self._get_credentials_from_db()
        
        # Constrói o serviço
        self.service = build('calendar', 'v3', credentials=self.creds)

    def _get_supabase_client(self) -> Client:
        # Conecta ao Supabase usando a Service Role Key (Acesso Admin)
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            raise ValueError("Configurações do Supabase ausentes no .env")
            
        return create_client(url, key)

    def _get_credentials_from_db(self):
        
        # Busca o gcal_refresh_token no banco e reconstrói o objeto Credentials.
        
        # 1. Buscar no Supabase
        try:
            response = self.supabase.table('clinicas')\
                .select('gcal_refresh_token')\
                .eq('id', self.clinic_id)\
                .single()\
                .execute()
        except Exception as e:
            raise Exception(f"Erro ao buscar clínica {self.clinic_id}: {str(e)}")

        if not response.data:
            raise Exception(f"Clínica {self.clinic_id} não encontrada.")

        refresh_token_encrypted = response.data.get('gcal_refresh_token')

        if not refresh_token_encrypted:
            raise Exception(f"A clínica {self.clinic_id} ainda não conectou o Google Calendar.")

        refresh_token = decrypt_token(refresh_token_encrypted)

        # 2. Reconstruir as Credenciais do Google em Memória
        # Precisamos do ID e Secret do app para que o Google aceite renovar o token
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise ValueError("GOOGLE_CLIENT_ID ou SECRET ausentes no .env")
        
        """
            Criamos o objeto Credentials apenas com o refresh_token.
            O token de acesso (access_token) é None, então a biblioteca do Google vai usar o refresh_token para gerar um novo automaticamente na primeira chamada.
        """
        creds = Credentials(
            token=None, # Não temos o token temporário, vamos gerar agora
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=self.SCOPES
        )

        return creds
    
    def listar_calendarios(self):
        """
        Útil para o Onboarding: Lista todos os calendários da conta conectada.
        A recepcionista usa isso para saber qual ID pertence a qual médico.
        """
        page_token = None
        calendars = []
        
        while True:
            calendar_list = self.service.calendarList().list(pageToken=page_token).execute()
            
            for calendar_list_entry in calendar_list['items']:
                calendars.append({
                    'id': calendar_list_entry['id'],
                    'summary': calendar_list_entry['summary']
                })
            page_token = calendar_list.get('nextPageToken')
            
            if not page_token:
                break
            
        return calendars
    
    def listar_eventos(self, data:dt.datetime, calendar_id='primary'):
        # 1. Extrai apenas a data (remove horas/minutos/segundos)
        dia_apenas = data.date() 
        
        # 2. Cria o intervalo de 00:00 até 23:59 desse dia
        start_of_day = dt.datetime.combine(dia_apenas, dt.time.min)
        end_of_day = dt.datetime.combine(dia_apenas, dt.time.max)

        # 3. Preservar o Fuso Horário (Muito Importante)
        # Se o seu data tem fuso (tzinfo), aplicamos ao intervalo para a busca ser correta.
        if data.tzinfo:
            start_of_day = start_of_day.replace(tzinfo=data.tzinfo)
            end_of_day = end_of_day.replace(tzinfo=data.tzinfo)
            
        events_result = self.service.events().list(
            calendarId=calendar_id,
            timeMin=start_of_day.isoformat(),
            timeMax=end_of_day.isoformat(),
            maxResults=3000,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        return events_result.get('items', [])

    def criar_evento(self, calendar_id, resumo, inicio_dt: dt.datetime):
        # inicio_dt deve ser um objeto datetime
        fim_dt = inicio_dt + dt.timedelta(hours=1)
        
        # Fuso horário fixo por enquanto (ideal: pegar da tabela clinicas)
        TIMEZONE = 'America/Sao_Paulo'
        
        evento = {
            'summary': resumo,
            'start': {'dateTime': inicio_dt.isoformat(), 'timeZone': TIMEZONE},
            'end': {'dateTime': fim_dt.isoformat(), 'timeZone': TIMEZONE},
        }
        
        return self.service.events().insert(calendarId=calendar_id, body=evento).execute()