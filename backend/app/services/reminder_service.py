import os
import datetime as dt
from zoneinfo import ZoneInfo
from supabase import create_client, Client
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp
from dotenv import load_dotenv

load_dotenv()

# Config Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use a Service Role para poder ler/editar qualquer consulta
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def processar_lembretes():
    """
    Verifica consultas próximas (24h e 2h) e envia lembretes.
    Deve ser rodado periodicamente (ex: a cada 10 min).
    """
    print("⏰ [Scheduler] Verificando lembretes de consulta...")
    
    tz_br = ZoneInfo("America/Sao_Paulo")
    agora = dt.datetime.now(tz_br)

    # Definir janelas de tempo para busca
    # Janela de 24h (Entre 23h e 25h a partir de agora)
    inicio_24h = agora + dt.timedelta(hours=23)
    fim_24h = agora + dt.timedelta(hours=25)

    # Janela de 2h (Entre 1h50min e 2h30min a partir de agora)
    inicio_2h = agora + dt.timedelta(minutes=110) 
    fim_2h = agora + dt.timedelta(minutes=150)

    try:
        # 1. Buscar Consultas Ativas (AGENDADA)
        # Trazemos dados do paciente e profissional para montar a mensagem
        response = supabase.table('consultas')\
            .select('id, horario_consulta, clinic_id, lembrete_24h, lembrete_2h, lids(nome, telefone), profissionais(nome)')\
            .eq('status', 'AGENDADA')\
            .execute()
        
        consultas = response.data or []
        
        for c in consultas:
            c_id = c['id']
            clinic_id = c['clinic_id']
            paciente_nome = c['lids']['nome'].split()[0] # Primeiro nome
            telefone = c['lids']['telefone']
            medico = c['profissionais']['nome']
            
            # Converte horário do banco para objeto datetime
            horario_iso = c['horario_consulta']
            dt_consulta = dt.datetime.fromisoformat(horario_iso)

            # --- VERIFICAÇÃO DE 24H ---
            if not c['lembrete_24h']:
                if inicio_24h <= dt_consulta <= fim_24h:
                    print(f"   -> Enviando lembrete 24h para {paciente_nome}...")
                    
                    msg = (f"Olá, {paciente_nome}! 😊\n"
                           f"Passando para lembrar da sua consulta amanhã às {dt_consulta.strftime('%H:%M')} "
                           f"com {medico}.\n\n"
                           f"Podemos confirmar sua presença?")
                    
                    enviar_mensagem_whatsapp(clinic_id, telefone, msg)
                    
                    # Marca como enviado
                    supabase.table('consultas').update({'lembrete_24h': True}).eq('id', c_id).execute()

            # --- VERIFICAÇÃO DE 2H ---
            if not c['lembrete_2h']:
                if inicio_2h <= dt_consulta <= fim_2h:
                    print(f"   -> Enviando lembrete 2h para {paciente_nome}...")
                    
                    msg = (f"Oi, {paciente_nome}! Sua consulta é logo mais, às {dt_consulta.strftime('%H:%M')}.\n"
                           f"Estamos te aguardando! 😊")
                    
                    enviar_mensagem_whatsapp(clinic_id, telefone, msg)
                    
                    # Marca como enviado
                    supabase.table('consultas').update({'lembrete_2h': True}).eq('id', c_id).execute()

    except Exception as e:
        print(f"❌ Erro no processamento de lembretes: {e}")