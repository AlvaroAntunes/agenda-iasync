import os
import datetime as dt
from app.utils.whatsapp_utils import enviar_mensagem_whatsapp
from dotenv import load_dotenv
from app.core.database import get_supabase, TIMEZONE_BR

load_dotenv()

# Config Supabase
supabase = get_supabase()

def processar_lembretes():
    """
    Verifica consultas próximas (24h e 2h) e envia lembretes.
    Deve ser rodado periodicamente (ex: a cada 10 min).
    """
    print("⏰ [Scheduler] Verificando lembretes de consulta...")
    
    tz_br = TIMEZONE_BR
    agora = dt.datetime.now(tz_br)

    # Definir janelas de tempo para busca
    # Janela de 24h (Entre 23h e 25h a partir de agora)
    inicio_24h = agora + dt.timedelta(hours=23)
    fim_24h = agora + dt.timedelta(hours=25)

    # Janela de 2h (Entre 1h30min e 2h30min a partir de agora)
    inicio_2h = agora + dt.timedelta(minutes=90) 
    fim_2h = agora + dt.timedelta(minutes=150)

    try:
        # 1. Buscar Consultas Ativas (AGENDADA)
        # Trazemos dados do paciente e profissional para montar a mensagem
        response = supabase.table('consultas')\
            .select('id, horario_consulta, clinic_id, lembrete_24h, lembrete_2h, leads(nome, telefone), profissionais(nome, genero)')\
            .eq('status', 'AGENDADA')\
            .execute()
        
        consultas = response.data or []
                
        for c in consultas:
            c_id = c['id']
            clinic_id = c['clinic_id']
            paciente_nome = c['leads']['nome'].split()[0] # Primeiro nome
            telefone = c['leads']['telefone']
            medico = c['profissionais']['nome']
            genero_medico = c['profissionais']['genero']
            pronome_medico = 'o Dr.' if genero_medico.lower() != 'feminino' else 'a Dra.'
            
            try:
                response = supabase.table('clinicas') \
                    .select('uazapi_token') \
                    .eq('id', clinic_id) \
                    .single() \
                    .execute()

                token = response.data.get('uazapi_token')
                
                if not token:
                    raise Exception("Token da Uazapi não cadastrado para esta clínica.")

            except Exception as e:
                # Captura erros de conexão, ID não encontrado ou erro de API
                print(f"Erro ao buscar token: {e}")
                # Trate o erro conforme sua necessidade (return None, raise, etc)
                raise e
            
            # Converte horário do banco para objeto datetime e para fuso Brasil
            horario_iso = c['horario_consulta']
            dt_utc = dt.datetime.fromisoformat(horario_iso)
            dt_consulta = dt_utc.astimezone(tz_br)
            
            if dt_consulta.minute == 0:
                hora_texto = dt_consulta.strftime('%Hh')
            else:
                hora_texto = dt_consulta.strftime('%Hh%M')
                
            # --- VERIFICAÇÃO DE 24H ---
            if not c['lembrete_24h']:
                if inicio_24h <= dt_consulta <= fim_24h:
                    print(f"   -> Enviando lembrete 24h para {paciente_nome}...")
                    
                    msg = (f"Olá, {paciente_nome}! Lembrando da sua consulta amanhã às *{hora_texto}* com {pronome_medico} {medico}.\n"
                           f"Podemos confirmar sua presença?")
                    
                    enviar_mensagem_whatsapp(token, telefone, msg)
                    
                    # Marca como enviado
                    supabase.table('consultas').update({'lembrete_24h': True}).eq('id', c_id).execute()

            # --- VERIFICAÇÃO DE 2H ---
            if not c['lembrete_2h']:
                if inicio_2h <= dt_consulta <= fim_2h:
                    print(f"   -> Enviando lembrete 2h para {paciente_nome}...")
                    
                    msg = (f"Oi, {paciente_nome}! Sua consulta é logo mais, às *{hora_texto}*.\n"
                           f"Estamos te aguardando! 😊")
                    
                    enviar_mensagem_whatsapp(token, telefone, msg)
                    
                    # Marca como enviado
                    supabase.table('consultas').update({'lembrete_2h': True}).eq('id', c_id).execute()

    except Exception as e:
        print(f"❌ Erro no processamento de lembretes: {e}")