import os
import datetime as dt
from zoneinfo import ZoneInfo
from supabase import create_client, Client
from app.utils.whatsapp_utils import enviar_mensagem_padrao
from dotenv import load_dotenv

load_dotenv()

# Config Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def processar_lembretes():
    """
    Verifica consultas próximas (24h e 2h) e envia lembretes.
    """
    print("\n⏰ [Scheduler] Verificando lembretes de consulta...")
    
    tz_br = ZoneInfo("America/Sao_Paulo")
    agora = dt.datetime.now(tz_br)

    # Janelas de tempo (Aumentei a margem para 3h para garantir que pegue)
    inicio_24h = agora + dt.timedelta(hours=23)
    fim_24h = agora + dt.timedelta(hours=26) # Janela de 3h

    inicio_2h = agora + dt.timedelta(minutes=100) 
    fim_2h = agora + dt.timedelta(minutes=180) # Janela estendida

    print(f"   🔎 Janela 24h: {inicio_24h.strftime('%d/%m %H:%M')} até {fim_24h.strftime('%d/%m %H:%M')}")
    print(f"   🔎 Janela 2h:  {inicio_2h.strftime('%d/%m %H:%M')} até {fim_2h.strftime('%d/%m %H:%M')}")

    try:
        # 1. Buscar Consultas Ativas
        # ATENÇÃO: Verifique se sua tabela é 'pacientes' ou 'lids'. Ajustei para 'pacientes' que é o padrão.
        # Se sua tabela for 'lids', mude abaixo.
        tabela_pacientes = 'pacientes' # ou 'lids'
        
        response = supabase.table('consultas')\
            .select(f'id, horario_consulta, clinic_id, lembrete_24h_enviado, lembrete_2h_enviado, {tabela_pacientes}(nome, telefone), profissionais(nome)')\
            .eq('status', 'AGENDADA')\
            .execute()
        
        consultas = response.data or []
        print(f"   📊 Consultas 'AGENDADA' encontradas no banco: {len(consultas)}")
        
        for c in consultas:
            try:
                c_id = c['id']
                
                # Proteção contra dados incompletos
                dados_paciente = c.get(tabela_pacientes)
                dados_profissional = c.get('profissionais')
                
                if not dados_paciente or not dados_profissional:
                    print(f"   ⚠️ Consulta {c_id} ignorada: Dados de paciente/profissional incompletos.")
                    continue

                paciente_nome = dados_paciente['nome'].split()[0]
                telefone = dados_paciente['telefone']
                medico = dados_profissional['nome']
                
                # --- CORREÇÃO DE FUSO HORÁRIO (CRÍTICO) ---
                horario_iso = c['horario_consulta']
                dt_consulta_utc = dt.datetime.fromisoformat(horario_iso)
                
                # Converte do UTC do banco para o Horário de Brasília
                dt_consulta = dt_consulta_utc.astimezone(tz_br)
                
                # Debug individual para entender a lógica
                # print(f"      -> Checando: {paciente_nome} | Horário: {dt_consulta.strftime('%d/%m %H:%M')}")

                # --- VERIFICAÇÃO DE 24H ---
                # Usamos .get() com False padrão para evitar erro se a coluna for null
                if not c.get('lembrete_24h_enviado', False):
                    if inicio_24h <= dt_consulta <= fim_24h:
                        print(f"      🚀 ENVIANDO 24H para {paciente_nome} ({telefone})...")
                        
                        msg = (f"Olá, {paciente_nome}! 😊\n"
                               f"Passando para lembrar da sua consulta amanhã, *{dt_consulta.strftime('%d/%m')} às {dt_consulta.strftime('%Hh%M')}* "
                               f"com {medico}.\n\n"
                               f"Podemos confirmar sua presença?")
                        
                        enviar_mensagem_padrao(c['clinic_id'], telefone, msg)
                        
                        # Marca como enviado
                        supabase.table('consultas').update({'lembrete_24h_enviado': True}).eq('id', c_id).execute()
                    else:
                        pass # Fora da janela de 24h

                # --- VERIFICAÇÃO DE 2H ---
                if not c.get('lembrete_2h_enviado', False):
                    if inicio_2h <= dt_consulta <= fim_2h:
                        print(f"      🚀 ENVIANDO 2H para {paciente_nome} ({telefone})...")
                        
                        msg = (f"Oi, {paciente_nome}! Sua consulta é logo mais, às *{dt_consulta.strftime('%Hh%M')}*.\n"
                               f"Estamos te aguardando! 🦷")
                        
                        enviar_mensagem_padrao(c['clinic_id'], telefone, msg)
                        
                        supabase.table('consultas').update({'lembrete_2h_enviado': True}).eq('id', c_id).execute()
            
            except Exception as e_loop:
                print(f"   ⚠️ Erro na consulta {c.get('id')}: {e_loop}")
                continue

    except Exception as e:
        print(f"❌ Erro no processamento de lembretes: {e}")