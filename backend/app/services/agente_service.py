"""
    Serviço do Agente de Agendamento para Clínicas.
    Utiliza LangChain para criar um agente que interage com o usuário,
    Verifica disponibilidade e realiza agendamentos no Calendar.
"""

import os
import datetime as dt
import holidays
from typing import List, Optional
from pydantic import BaseModel, Field
from unidecode import unidecode
from zoneinfo import ZoneInfo 
from dotenv import load_dotenv
from langchain_core.pydantic_v1 import BaseModel, Field

# LangChain Imports
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import StructuredTool

# Seus serviços
from app.services.factory import get_calendar_service
from app.services.buffer_service import BufferService
from app.utils.date_utils import formatar_hora
from app.core.database import get_supabase, TIMEZONE_BR

load_dotenv()  # Carrega variáveis do .env

# Configuração do Supabase 
supabase = get_supabase()

# --- 1. DEFINIÇÃO DOS SCHEMAS (O que o Robô vê) ---
# Isso garante que o LLM nunca tente enviar 'self'

class VerificaDisponibilidade(BaseModel):
    data: str = Field(description="Data para verificar no formato DD/MM/AAAA")
    nome_profissional: Optional[str] = Field(default=None, description="Nome do médico ou especialista")

class RealizaAgendamento(BaseModel):
    nome_paciente: str = Field(description="Nome completo do paciente")
    data_hora: str = Field(description="Data e hora ISO (ex: 2024-11-25T14:30:00)")
    nome_profissional: str = Field(description="Nome do médico. Envie APENAS o nome (ex: 'Roberto'), SEM títulos como Dr. ou Dra.")
    
class VerificaConsultasExistentes(BaseModel):
    data: str = Field(description="Data para verificar no formato DD/MM/AAAA")
    nome_paciente: str = Field(description="Nome completo do paciente")
    
class CancelarAgendamentoInput(BaseModel):
    data_consulta: str = Field(description="A data da consulta a ser cancelada (DD/MM/AAAA)")
    hora_consulta: str = Field(description="O horário da consulta a ser cancelada (HH:MM)")

class ListarMinhasConsultasInput(BaseModel):
    dummy: Optional[str] = Field(description="Campo ignorado, pode deixar vazio ou nulo")
    
class ReagendarInput(BaseModel):
    data_atual: str = Field(description="A data da consulta ATUAL que será mudada (DD/MM/AAAA)")
    hora_atual: str = Field(description="O horário da consulta ATUAL (HH:MM)")
    nova_data_hora: str = Field(description="A NOVA data e hora desejada em formato ISO (ex: 2024-11-25T14:30:00)")
    novo_nome_profissional: Optional[str] = Field(default=None, description="O nome do novo profissional, caso o paciente queira trocar. Envie APENAS o nome (ex: 'Roberto', 'Ana'), SEM títulos como Dr. ou Dra.")
    
class SalvarNomeClienteInput(BaseModel):
    nome_cliente: str = Field(description="O nome completo do cliente a ser salvo no sistema.")
    
class AgenteClinica:
    def __init__(self, clinic_id: str, session_id: str, lid: str):
        self.clinic_id = clinic_id
        self.session_id = session_id
        self.lid = lid
        self.calendar_service = get_calendar_service(clinic_id)
        self.cache_service = BufferService()  # Serviço de cache Redis
        
        # Carregar dados da clínica (Nome, Prompt, Profissionais)
        self.dados_clinica = self._carregar_dados_clinica()
        self.profissionais = self._carregar_profissionais()
        self.profissionais_por_id = {p['id']: p for p in self.profissionais} # Cache de profissionais por ID para busca O(1)
        self.dados_paciente = self._identificar_paciente()
        self.dia_hoje = self._formatar_data_extenso(dt.datetime.now(TIMEZONE_BR))
        
    def _carregar_dados_clinica(self):
        response = supabase.table('clinicas').select('*').eq('id', self.clinic_id).single().execute()
        return response.data

    def _carregar_profissionais(self):
        # Trazemos os profissionais para injetar no prompt do sistema
        response = supabase.table('profissionais').select('id, nome, especialidade, external_calendar_id').eq('clinic_id', self.clinic_id).execute()
        return response.data
    
    def _identificar_paciente(self):
        """
        Busca se esse telefone (session_id) já é um paciente cadastrado.
        """
        # Limpa o session_id para garantir que só tem números
        telefone_busca = ''.join(filter(str.isdigit, self.session_id))
        
        print(f"🔍 [DEBUG] Buscando paciente com telefone: {telefone_busca} (original: {self.session_id})")
        
        try:
            response = supabase.table('lids')\
                .select('nome', 'id', 'telefone')\
                .eq('clinic_id', self.clinic_id)\
                .eq('telefone', telefone_busca)\
                .limit(1)\
                .execute()
            
            print(f"🔍 [DEBUG] Resultado da busca: {response.data}")
                
            if response.data and len(response.data) > 0:
                print(f"✅ [DEBUG] Paciente identificado: {response.data[0].get('nome')}")
                return response.data[0]
            
            print(f"⚠️ [DEBUG] Nenhum paciente encontrado para este telefone")
            return None 
        except Exception as e:
            print(f"❌ [DEBUG] Erro ao identificar paciente: {e}")
            return None
        
    def _identificar_profissional(self, id: str):
        """
        Busca o profissional pelo id usando cache O(1).
        """
        prof = self.profissionais_por_id.get(id)
        return prof['nome'] if prof else None
    
    def _formatar_data_extenso(self, data: dt.datetime) -> str:
        mapa_dias = {
            0: "Segunda-feira",
            1: "Terça-feira",
            2: "Quarta-feira",
            3: "Quinta-feira",
            4: "Sexta-feira",
            5: "Sábado",
            6: "Domingo"
        }
        
        dia_semana = mapa_dias[data.weekday()]
        
        # Formata: Quarta-feira, 17/12/2025 - 14:30
        return f"{dia_semana}, {data.strftime('%d/%m/%Y - %H:%M')}"
    
    def _gerar_bloco_paciente(self, paciente_id):
        consultas = supabase.table('consultas').select('*').eq('paciente_id', paciente_id).execute().data
        
        if not consultas:
            return "Nenhuma consulta registrada ainda.\n"
        
        texto_consultas = ""
        agora = dt.datetime.now(TIMEZONE_BR)

        for c in consultas:
            # Converte string ISO para objeto datetime e para fuso Brasil
            horario_iso = c['horario_consulta']
            dt_utc = dt.datetime.fromisoformat(horario_iso)
            data_cons = dt_utc.astimezone(TIMEZONE_BR)

            if data_cons < agora:
                status_tempo = "(JÁ OCORREU/PASSADO)"
                status_emoji = "✅"
            else:
                status_tempo = "(AGENDADO/FUTURO)"
                status_emoji = "🗓️"

            # Formata para o texto que vai pro prompt
            data_fmt = data_cons.strftime('%d/%m/%Y às %H:%M')
            texto_consultas += f"- {data_fmt} {status_tempo} {status_emoji}\n"

        return f"Histórico de Consultas:\n{texto_consultas}"
    
    def _get_eventos_calendar(self, calendar_id: str, data: dt.datetime):
        eventos = self.calendar_service.listar_eventos(data=data, calendar_id=calendar_id)
        
        if not eventos:
            return f"A agenda para {data} está completamente livre."
        
        lista_ocupada = []
        
        for e in eventos:
            # Tenta pegar horário específico (dateTime)
            start_dt = e['start'].get('dateTime')
            end_dt = e['end'].get('dateTime')
            
            if start_dt and end_dt:
                # Caso 1: É uma consulta/reunião com hora marcada
                try:
                    # formatar_hora deve tratar o ISO string
                    inicio = formatar_hora(start_dt) 
                    fim = formatar_hora(end_dt)
                    lista_ocupada.append(f"{inicio} até {fim} - Ocupado")
                except:
                    lista_ocupada.append("Horário Indisponível")
            else:
                # Caso 2: É um evento de dia inteiro (Bloqueio, Folga, Feriado no GCal)
                # O Google manda 'date' em vez de 'dateTime'
                start_date = e['start'].get('date')
                summary = e.get('summary', 'Bloqueio')
                
                if start_date:
                    lista_ocupada.append(f"Dia Todo ({summary}) - Ocupado")

        return f"Horários OCUPADOS em {data}:\n" + "\n".join(lista_ocupada)
    
    def _calcular_slots_livres(self, eventos, data_base: dt.date):
        """
        Recebe a lista de eventos ocupados e retorna a lista de horários livres (slots de 15min).
        Considera horário comercial 08:00 às 18:00.
        """
        # Configuração da Clínica 
        hora_abertura = int(self.dados_clinica.get('hora_abertura') or 8)
        hora_fechamento = int(self.dados_clinica.get('hora_fechamento') or 18)

        # DEFINIÇÕES DE TEMPO
        duracao_consulta = dt.timedelta(hours=1)      # Duração do bloco ocupado
        intervalo_step = dt.timedelta(minutes=15)     # Pulo visual (08:00, 08:15, 08:30...)
        
        # Fuso Horário
        tz_br = TIMEZONE_BR
        
        # Define marcos de início e fim do dia
        inicio_expediente = dt.datetime.combine(data_base, dt.time(hour=hora_abertura, minute=0), tzinfo=tz_br)
        fim_expediente = dt.datetime.combine(data_base, dt.time(hour=hora_fechamento, minute=0), tzinfo=tz_br)
        
        # Cursor que vai percorrer o dia
        cursor_tempo = inicio_expediente

        # --- TRATAMENTO PARA "HOJE" ---
        agora = dt.datetime.now(tz_br)
        
        if data_base == agora.date():
            # Margem de 1h de antecedência mínima
            margem_seguranca = agora + dt.timedelta(hours=1)
            
            # Se a margem já passou do início do expediente, avançamos o cursor
            if margem_seguranca > cursor_tempo:
                cursor_tempo = margem_seguranca
                
                # Arredondamento Matemático para o próximo slot de 15 min
                # Ex: Se são 14:12, viraria 15:12. Arredondamos para 15:15.
                minutos = cursor_tempo.minute
                passo_min = 15
                resto = minutos % passo_min
                
                if resto > 0:
                    falta_para_proximo = passo_min - resto
                    cursor_tempo += dt.timedelta(minutes=falta_para_proximo)
                
                # Zera segundos para ficar limpo
                cursor_tempo = cursor_tempo.replace(second=0, microsecond=0)

        # --- LOOP DE VERIFICAÇÃO ---
        slots_livres = []
        
        # Enquanto o horário do slot + duração da consulta couber no expediente
        while cursor_tempo + duracao_consulta <= fim_expediente:
            slot_inicio = cursor_tempo
            slot_fim = cursor_tempo + duracao_consulta
            
            esta_livre = True
            
            for e in eventos:
                try:
                    # Bloqueia dias inteiros
                    if 'date' in e['start']:
                        esta_livre = False
                        break

                    start_evt = dt.datetime.fromisoformat(e['start'].get('dateTime'))
                    end_evt = dt.datetime.fromisoformat(e['end'].get('dateTime'))
                    
                    # Lógica de Colisão de Horário
                    if slot_inicio < end_evt and slot_fim > start_evt:
                        esta_livre = False
                        break
                    
                except:
                    continue 

            if esta_livre:
                # Formata para ficar bonito na resposta (ex: 08h15)
                slots_livres.append(slot_inicio.strftime('%Hh%M'))
            
            # Avança o cursor em 15 minutos
            cursor_tempo += intervalo_step

        return slots_livres
        
    # --- DEFINIÇÃO DAS FERRAMENTAS (TOOLS) ---

    def _logic_verificar_disponibilidade(self, data: str, nome_profissional: Optional[str] = None):
        """
        Verifica a agenda e retorna os HORÁRIOS LIVRES (White-list).
        """
        print(f"--- TOOL: Verificando disponibilidade para {data} ---")
        
        # 1. Parsing Data
        try:
            dt_inicio = dt.datetime.strptime(data, "%d/%m/%Y")
            tz_br = TIMEZONE_BR
            # Garante que temos a data correta
            data_base = dt_inicio.date()
            dt_inicio_busca = dt.datetime.combine(data_base, dt.time.min).replace(tzinfo=tz_br)
        except ValueError:
            return "Erro: Data inválida. Use dd/mm/aaaa."

        # 2. Validação de Feriados/Fim de Semana
        if dt_inicio.weekday() >= 5: 
            return f"NEGADO: {data} cai em fim de semana e a clínica não abre."
        
        if holidays:
            estado_uf = self.dados_clinica.get('uf', 'MG') 
            feriados = holidays.BR(state=estado_uf, years=[dt_inicio.year])
            if dt_inicio.date() in feriados:
                return f"NEGADO: {data} é feriado ({feriados.get(dt_inicio.date())})."

        # 3. Definição dos Calendários
        calendarios_alvo = [] 
        
        if nome_profissional:
            term = unidecode(nome_profissional).lower()
            
            for p in self.profissionais:
                if term in unidecode(p['nome']).lower():
                    calendarios_alvo.append({'nome': p['nome'], 'id': p['external_calendar_id']})
                    break
                
            if not calendarios_alvo: 
                return f"Profissional não encontrado."
        else:
            for p in self.profissionais:
                calendarios_alvo.append({'nome': p['nome'], 'id': p['external_calendar_id']})

        # 4. Consulta e Cálculo (com Cache)
        relatorio_final = []
        
        try:
            for cal in calendarios_alvo:
                # Busca profissional ID pelo calendar_id
                prof_id = next((p['id'] for p in self.profissionais if p['external_calendar_id'] == cal['id']), None)
                
                # Tenta buscar no cache primeiro
                slots_livres = self.cache_service.get_cached_availability(prof_id, data) if prof_id else None
                
                if slots_livres is None:
                    # Cache MISS: Busca no Google Calendar
                    eventos = self.calendar_service.listar_eventos(data=dt_inicio_busca, calendar_id=cal['id']) or []
                    
                    # Calcula slots livres
                    slots_livres = self._calcular_slots_livres(eventos, data_base)
                    
                    # Armazena no cache (TTL: 5 minutos)
                    if prof_id:
                        self.cache_service.set_cached_availability(prof_id, data, slots_livres, ttl=300)
                
                # Formata resposta
                if not slots_livres:
                    relatorio_final.append(f"❌ {cal['nome']}: Agenda LOTADA para este dia.")
                else:
                    # Formata bonitinho: 08h, 8h15, 14h...
                    lista_str = ", ".join(slots_livres)
                    relatorio_final.append(f"✅ {cal['nome']} (Horários Livres): {lista_str}")

        except Exception as e:
            return f"Erro técnico na agenda: {str(e)}"

        # Instrução de reforço para o Prompt
        cabecalho = f"RELATÓRIO DE DISPONIBILIDADE PARA {data} (Horário {int(self.dados_clinica.get('hora_abertura', 8))}h-{int(self.dados_clinica.get('hora_fechamento', 18))}h):\n"
        instrucao = "\nIMPORTANTE: Ofereça APENAS os horários listados como 'Livres' acima. Se o horário não está na lista, é porque está ocupado ou a clínica está fechada."

        return cabecalho + "\n".join(relatorio_final) + instrucao

    def _logic_realizar_agendamento(self, nome_paciente: str, data_hora: str, nome_profissional: str):
        """
        Realiza o agendamento final.
        Input:
        - nome_paciente: Nome completo.
        - data_hora: Data e hora ISO (ex: 2024-11-25T14:30:00).
        - nome_profissional: Nome do médico/especialista.
        """
        
        telefone = self.session_id
            
        print(f"--- TOOL: Tentativa de agendamento para {nome_paciente} em {data_hora} ---")
        
        # 1. Identificar Profissional e Calendar ID
        if nome_profissional:
            term_busca = unidecode(nome_profissional).lower()
            term_busca = term_busca.replace("dr.", "").replace("dra.", "").replace("doutor", "").replace("doutora", "").strip()
            
            # Busca na lista (usando 'in' para permitir "Roberto" achar "Roberto Mendes")
            prof_data = next((p for p in self.profissionais if term_busca in unidecode(p['nome']).lower()), None)

            if not prof_data:
                nomes = ", ".join([p['nome'] for p in self.profissionais])
                return f"Erro: O profissional '{nome_profissional}' não foi encontrado. Disponíveis: {nomes}."
        
        # Tratamento de Data e Hora
        try:
            dt_inicio = dt.datetime.fromisoformat(data_hora)
            
            if dt_inicio.tzinfo is None:
                br_timezone = TIMEZONE_BR
                dt_inicio = dt_inicio.replace(tzinfo=br_timezone)
            
            # Formato ISO com fuso para o banco (timestamptz)
            horario_iso = dt_inicio.isoformat()
            
        except ValueError:
            return "Erro: Formato de data inválido."
        
        # Verifica se já existe consulta neste horário para este médico e que NÃO esteja cancelada
        try:
            conflito = supabase.table('consultas')\
                .select('id')\
                .eq('clinic_id', self.clinic_id)\
                .eq('profissional_id', prof_data['id'])\
                .eq('horario_consulta', horario_iso)\
                .neq('status', 'CANCELADO')\
                .execute()
            
            if conflito.data and len(conflito.data) > 0:
                print(f"⚠️ CONFLITO DETECTADO: Já existe consulta em {horario_iso}")
                return f"NEGADO: O horário de {dt_inicio.strftime('%H:%M')} no dia {dt_inicio.strftime('%d/%m')} infelizmente já está ocupado. Por favor, escolha outro horário."
                
        except Exception as e:
            return f"Erro ao verificar disponibilidade no banco: {str(e)}"

        # 2. Verificar/Criar Paciente no Supabase (Upsert)
        # Primeiro buscamos se existe pelo telefone
        paciente_response = supabase.table('lids').select('id').eq('clinic_id', self.clinic_id).eq('telefone', telefone).execute()
        
        if paciente_response.data:
            paciente_id = paciente_response.data[0]['id']
        else:
            # Cria novo
            novo_paciente = supabase.table('lids').insert({
                'clinic_id': self.clinic_id,
                'lid': telefone, 
                'telefone': telefone,
                'nome': nome_paciente
            }).execute()
            paciente_id = novo_paciente.data[0]['id']

        # 3. Criar no Calendar
        
        descricao_formatada = f"""
        === 📋 DADOS DO CLIENTE ===
        👤 NOME: {nome_paciente}
        📱 TELEFONE: {telefone}

        === ⚡ AÇÕES RÁPIDAS ===
        🔗 WHATSAPP: https://wa.me/{telefone}
        🤖 CANAL: Agendamento via IA
        """
        try:            
            dt_evento_calendar = dt.datetime.fromisoformat(data_hora)

            evento_cal = self.calendar_service.criar_evento(
                calendar_id=prof_data['external_calendar_id'],
                resumo=f"Consulta: {nome_paciente} ({telefone})",
                inicio_dt=dt_evento_calendar,
                descricao=descricao_formatada
            )
        except Exception as e:
            return f"Erro ao conectar com o Calendar: {str(e)}"

        # 4. Salvar Consulta no Supabase
        try:
            # Converter nova data para fuso Brasil
            tz_br = TIMEZONE_BR
            dt_evento_calendar = dt_evento_calendar.replace(tzinfo=tz_br)
            agora = dt.datetime.now(tz_br)
            
            # Calcular diferença em dias e horas
            diferenca = dt_evento_calendar - agora
            diferenca_horas = diferenca.total_seconds() / 3600
            
            # Definir flags de lembrete baseado na diferença
            # flag_24h = False se agenda para 40h+ depois (precisa enviar lembrete)
            flag_24h = False if diferenca_horas >= 40 else True

            # flag_2h = False se tiver pelo menos 4 horas de diferença (precisa enviar lembrete)
            flag_2h = False if diferenca_horas >= 4 else True
            
            supabase.table('consultas').insert({
                'clinic_id': self.clinic_id,
                'paciente_id': paciente_id,
                'profissional_id': prof_data['id'],
                'horario_consulta': dt_inicio.isoformat(),
                'status': 'AGENDADA',
                'origem_agendamento': 'IA',
                'external_event_id': evento_cal.get('id'),
                'lembrete_24h': flag_24h,
                'lembrete_2h': flag_2h
            }).execute()
            
        except Exception as e:
            return f"Erro técnico no Google Calendar: {str(e)}"

        # 5. Invalidar cache de disponibilidade
        data_agendamento = dt_inicio.strftime("%d/%m/%Y")
        self.cache_service.invalidate_availability_cache(prof_data['id'], data_agendamento)
        
        # 6. Logar Sucesso (KPI)
        supabase.table('ia_logs').insert({
            'clinic_id': self.clinic_id,
            'session_id': self.session_id,
            'event_type': 'INTENT_SCHEDULE_SUCCESS'
        }).execute()

        return "Agendamento realizado com sucesso! Confirme para o usuário."
    
    def _logic_verificar_consultas_existentes(self, nome_paciente: str, data: str):
        """
        Verifica se o paciente já tem consultas agendadas.
        Input:
        - nome_paciente: Nome completo.
        - data: Data para verificar no formato DD/MM/AAAA.
        """
        telefone = self.session_id
        
        print(f"--- TOOL: Verificando consultas existentes para {nome_paciente} ---")
        
        # 1. Identificar Paciente no Supabase
        try:
            paciente_response = supabase.table('lids')\
                .select('id')\
                .eq('clinic_id', self.clinic_id)\
                .eq('telefone', telefone)\
                .limit(1)\
                .execute()
        except Exception as e:
            return f"Erro ao buscar paciente: {str(e)}"
        
        if not paciente_response.data:
            return "Nenhum paciente encontrado com esse telefone."

        paciente_id = paciente_response.data[0]['id']

        # 2. Buscar Consultas Futuras
        agora_data = dt.datetime.strptime(data, "%d/%m/%Y").date()
        inicio_dia = f"{agora_data.isoformat()}T00:00:00+00:00"
        fim_dia = f"{agora_data.isoformat()}T23:59:59+00:00"

        consultas_response = supabase.table('consultas')\
            .select('status', 'profissional_id')\
            .eq('clinic_id', self.clinic_id)\
            .eq('paciente_id', paciente_id)\
            .eq('status', 'AGENDADA')\
            .gte('horario_consulta', inicio_dia)\
            .lte('horario_consulta', fim_dia)\
            .execute()
        
        if consultas_response.data and len(consultas_response.data) > 0:
            return f"O paciente {nome_paciente} já possui {len(consultas_response.data)} consulta(s) agendada(s) para {data} com o profissional {self._identificar_profissional(consultas_response.data[0]['profissional_id'])}."
        else:
            return f"O paciente {nome_paciente} não possui consultas agendadas para {data}."
        
    def _logic_listar_consultas_futuras(self, dummy: str = None):
        """
        Lista agendamentos futuros do paciente para ele saber o que cancelar/reagendar.
        """
        print(f"--- TOOL: Listando consultas futuras ---")
        
        # 1. Identificar paciente
        if not self.dados_paciente:
            return "Erro: Paciente não identificado no sistema. Pergunte o nome primeiro."

        paciente_id = self.dados_paciente['id']
        agora = dt.datetime.now(TIMEZONE_BR).isoformat()

        # 2. Buscar no Supabase
        try:
            consultas = supabase.table('consultas')\
                .select('horario_consulta, status, profissionais(nome)')\
                .eq('paciente_id', paciente_id)\
                .eq('status', 'AGENDADA')\
                .gte('horario_consulta', agora)\
                .order('horario_consulta')\
                .execute()

            if not consultas.data:
                return "Você não possui nenhuma consulta futura agendada."

            texto = "Consultas encontradas:\n"
            
            for c in consultas.data:
                horario_iso = c['horario_consulta']
                dt_utc = dt.datetime.fromisoformat(horario_iso)
                dt_obj = dt_utc.astimezone(TIMEZONE_BR)
                
                # Formato: 12/01/2026 às 14:30 com Dr. João
                fmt = dt_obj.strftime("%d/%m/%Y às %H:%M")
                medico = c['profissionais']['nome'] if c['profissionais'] else "Clínica"
                texto += f"- {fmt} com {medico}\n"

            return texto

        except Exception as e:
            return f"Erro ao buscar consultas: {str(e)}"

    def _logic_cancelar_agendamento(self, data_consulta: str, hora_consulta: str):
        """
        Cancela uma consulta específica baseada na data e hora.
        """
        print(f"--- TOOL: Cancelando consulta de {data_consulta} às {hora_consulta} ---")

        if not self.dados_paciente:
            return "Erro: Paciente não identificado."

        try:
            # Converter input string para objeto data para comparação
            # (Assume que o input vem DD/MM/AAAA e HH:MM)
            # Precisamos varrer as consultas do paciente para achar o ID certo
            
            consultas_futuras = supabase.table('consultas')\
                .select('id, horario_consulta, external_event_id, profissionais(external_calendar_id)')\
                .eq('paciente_id', self.dados_paciente['id'])\
                .eq('status', 'AGENDADA')\
                .execute()

            consulta_alvo = None
            
            for c in consultas_futuras.data:
                horario_iso = c['horario_consulta']
                dt_utc = dt.datetime.fromisoformat(horario_iso)
                c_dt = dt_utc.astimezone(TIMEZONE_BR)
                
                c_data_str = c_dt.strftime("%d/%m/%Y")
                c_hora_str = c_dt.strftime("%H:%M")

                if c_data_str == data_consulta and c_hora_str == hora_consulta:
                    consulta_alvo = c
                    break
            
            if not consulta_alvo:
                return f"Não encontrei nenhuma consulta agendada para {data_consulta} às {hora_consulta}. Verifique a data."

            # 1. Cancelar no Google Calendar
            calendar_id = consulta_alvo['profissionais']['external_calendar_id']
            event_id = consulta_alvo['external_event_id']

            if calendar_id and event_id:
                sucesso_gcal = self.calendar_service.cancelar_evento(calendar_id, event_id)
                
                if not sucesso_gcal:
                    print("Aviso: Falha ao deletar do Google Calendar (pode já ter sido deletado), seguindo para cancelar no banco.")

            # 2. Atualizar Banco de Dados
            supabase.table('consultas')\
                .update({'status': 'CANCELADO'})\
                .eq('id', consulta_alvo['id'])\
                .execute()
            
            # 3. Invalidar cache de disponibilidade
            prof_id = consulta_alvo['profissionais']['id'] if 'profissionais' in consulta_alvo and consulta_alvo['profissionais'] else None
            if prof_id:
                self.cache_service.invalidate_availability_cache(prof_id, data_consulta)

            return f"Sucesso: Consulta do dia {data_consulta} às {hora_consulta} foi cancelada."

        except Exception as e:
            return f"Erro técnico ao cancelar: {str(e)}"
        

    def _logic_reagendar_agendamento(self, data_atual: str, hora_atual: str, nova_data_hora: str, novo_nome_profissional: Optional[str] = None):
        """
        Move uma consulta existente. Se mudar o médico, recria o evento.
        """
        print(f"--- TOOL: Reagendando de {data_atual} {hora_atual} para {nova_data_hora} ---")

        if not self.dados_paciente:
            return "Erro: Paciente não identificado."

        # 1. Achar a consulta antiga no Banco
        try:
            consultas = supabase.table('consultas')\
                .select('id, horario_consulta, external_event_id, profissional_id, profissionais(id, nome, external_calendar_id)')\
                .eq('paciente_id', self.dados_paciente['id'])\
                .eq('status', 'AGENDADA')\
                .execute()
            
            consulta_alvo = None
            
            for c in consultas.data:
                horario_iso = c['horario_consulta']
                dt_utc = dt.datetime.fromisoformat(horario_iso)
                c_dt = dt_utc.astimezone(TIMEZONE_BR)
                
                if c_dt.strftime("%d/%m/%Y") == data_atual and c_dt.strftime("%H:%M") == hora_atual:
                    consulta_alvo = c
                    break
            
            if not consulta_alvo:
                return f"Não encontrei a consulta do dia {data_atual} às {hora_atual}."

        except Exception as e:
            return f"Erro ao buscar consulta original: {e}"

        # 2. Definir o Profissional de Destino
        prof_antigo = consulta_alvo['profissionais']
        prof_novo_data = prof_antigo # Assume o mesmo por padrão
        
        if novo_nome_profissional:
            term_busca = unidecode(novo_nome_profissional).lower()
            term_busca = term_busca.replace("dr.", "").replace("dra.", "").replace("doutor", "").replace("doutora", "").strip()
            
            # Busca na lista (usando 'in' para permitir "Roberto" achar "Roberto Mendes")
            found = next((p for p in self.profissionais if term_busca in unidecode(p['nome']).lower()), None)
            
            if found:
                prof_novo_data = found
            else:
                nomes = ", ".join([p['nome'] for p in self.profissionais])
                return f"Erro: O profissional '{novo_nome_profissional}' não foi encontrado. Disponíveis: {nomes}."

        # 3. Preparar Nova Data
        try:
            dt_novo = dt.datetime.fromisoformat(nova_data_hora)

        except ValueError:
            return "Erro: Formato da nova data inválido."

        # ==================================================================
        # 4. Lógica de Calendário (Mover ou Recriar)
        # ==================================================================
        
        novo_event_id = consulta_alvo['external_event_id'] # Mantém o mesmo ID por padrão
        
        try:
            # CENÁRIO A: Mesmo Médico -> Apenas movemos (Patch)
            if prof_antigo['id'] == prof_novo_data['id']:
                calendar_id = prof_antigo['external_calendar_id']
                self.calendar_service.mover_evento(calendar_id, novo_event_id, dt_novo)
                
            # CENÁRIO B: Médico Diferente -> Cancelamos no antigo e Criamos no novo
            else:
                print(f"🔄 Trocando de médico: {prof_antigo['nome']} -> {prof_novo_data['nome']}")
                
                # 4.1. Remove da agenda antiga
                self.calendar_service.cancelar_evento(prof_antigo['external_calendar_id'], novo_event_id)
                
                # 4.2. Cria na agenda nova
                # Recriamos a descrição básica
                descricao_formatada = f"""                
                === 📋 DADOS DO CLIENTE ===
                👤 NOME: {self.dados_paciente['nome']}
                📱 TELEFONE: {self.dados_paciente['telefone']}

                === ⚡ AÇÕES RÁPIDAS ===
                🔗 WHATSAPP: https://wa.me/{self.dados_paciente['telefone']}
                🤖 CANAL: Reagendamento via IA
                """
                
                novo_evento_gcal = self.calendar_service.criar_evento(
                    calendar_id=prof_novo_data['external_calendar_id'],
                    resumo=f"Consulta reagendada: {self.dados_paciente['nome']} ({self.dados_paciente['telefone']})",
                    inicio_dt=dt_novo,
                    descricao=descricao_formatada
                )
                novo_event_id = novo_evento_gcal.get('id')

        except Exception as e:
            return f"Erro técnico no Google Calendar: {str(e)}"

        # 5. Atualizar no Supabase
        try:
            # Converter nova data para fuso Brasil
            tz_br = TIMEZONE_BR
            dt_novo = dt_novo.replace(tzinfo=tz_br)
            agora = dt.datetime.now(tz_br)
            
            # Calcular diferença em dias e horas
            diferenca = dt_novo - agora
            diferenca_horas = diferenca.total_seconds() / 3600
            
            # Definir flags de lembrete baseado na diferença
            # flag_24h = False se reagendar para 40h+ depois (precisa enviar lembrete novamente)
            flag_24h = False if diferenca_horas >= 40 else True

            # flag_2h = False se tiver pelo menos 4 horas de diferença (precisa enviar lembrete novamente)
            flag_2h = False if diferenca_horas >= 4 else True
            
            supabase.table('consultas')\
                .update({
                    'horario_consulta': dt_novo.isoformat(),
                    'profissional_id': prof_novo_data['id'],  
                    'external_event_id': novo_event_id,
                    'lembrete_24h': flag_24h,
                    'lembrete_2h': flag_2h    
                })\
                .eq('id', consulta_alvo['id'])\
                .execute()
            
            # Invalidar cache das datas afetadas (antiga e nova)
            data_antiga_fmt = dt.datetime.strptime(data_atual, "%d/%m/%Y").strftime("%d/%m/%Y")
            data_nova_fmt = dt_novo.strftime("%d/%m/%Y")
            
            # Invalida cache do profissional antigo na data antiga
            self.cache_service.invalidate_availability_cache(prof_antigo['id'], data_antiga_fmt)
            
            # Invalida cache do profissional novo na data nova (pode ser o mesmo)
            self.cache_service.invalidate_availability_cache(prof_novo_data['id'], data_nova_fmt)
            
            supabase.table('ia_logs').insert({
                'clinic_id': self.clinic_id,
                'session_id': self.session_id,
                'event_type': 'INTENT_SCHEDULE_SUCCESS'
            }).execute()

            medico_nome = prof_novo_data['nome']
            return f"Sucesso! Reagendado para {dt_novo.strftime('%d/%m/%Y às %H:%M')} com {medico_nome}."

        except Exception as e:
            return f"Erro ao atualizar base de dados: {e}"
    
    def _logic_salvar_nome_cliente(self, nome_cliente: str):
        """
        Salva o nome do cliente no sistema.
        """
        telefone = self.session_id
        
        print(f"--- TOOL: Salvando nome do cliente: {nome_cliente} ---")
        
        try:
            supabase.table('lids').upsert({
                'clinic_id': self.clinic_id,
                'lid': self.lid,
                'telefone': telefone,
                'nome': nome_cliente
            }, on_conflict='clinic_id, lid').execute()
            return f"Nome '{nome_cliente}' salvo com sucesso."
        except Exception as e:
            return f"Erro ao salvar nome do cliente: {str(e)}"

    # --- O CÉREBRO (AGENTE) ---

    def executar(self, mensagem_usuario: str, historico_conversa: List = []):
        # 1. Configurar LLM  
        llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0, api_key=os.getenv("OPENAI_API_KEY"))

        # 2. Bind das Ferramentas (Vincula as funções ao LLM)
        # --- CRIAÇÃO DAS TOOLS DE FORMA EXPLÍCITA ---
        # Aqui nós ligamos o método da classe (func) ao Schema Pydantic (args_schema)
        # O LangChain entende que 'self' já está incluso no método bound.
        tools = [
            StructuredTool.from_function(
                func=self._logic_verificar_disponibilidade,
                name="verificar_disponibilidade",
                description="Verifica se existem horários livres na agenda para uma data.",
                args_schema=VerificaDisponibilidade
            ),
            StructuredTool.from_function(
                func=self._logic_realizar_agendamento,
                name="realizar_agendamento",
                description="Realiza o agendamento final da consulta no calendário.",
                args_schema=RealizaAgendamento
            ),
            StructuredTool.from_function(
                func=self._logic_verificar_consultas_existentes,
                name="verificar_consultas_existentes",
                description="Verifica se o paciente já tem consultas agendadas para uma data específica.",
                args_schema=VerificaConsultasExistentes
            ),
            StructuredTool.from_function(
                func=self._logic_listar_consultas_futuras,
                name="listar_minhas_consultas",
                description="Lista todas as consultas futuras agendadas para o paciente.",
                args_schema=ListarMinhasConsultasInput
            ),
            StructuredTool.from_function(
                func=self._logic_cancelar_agendamento,
                name="cancelar_agendamento",
                description="Cancela uma consulta específica baseada na data e hora fornecidas.",
                args_schema=CancelarAgendamentoInput
            ),
            StructuredTool.from_function(
                func=self._logic_reagendar_agendamento,
                name="reagendar_agendamento",
                description="Altera o horário de uma consulta existente. Requer data antiga (DD/MM/AAAA) e hora antiga (HH:MM) para identificar, e a nova data ISO. Se mudar o médico, informe o novo nome.",
                args_schema=ReagendarInput
            ),
            StructuredTool.from_function(
                func=self._logic_salvar_nome_cliente,
                name="salvar_nome_cliente",
                description="Salva o nome do cliente no sistema.",
                args_schema=SalvarNomeClienteInput
            )
        ]

        # 3. Criar o Prompt do Sistema
        lista_profs = ", ".join([f"{p['nome']} ({p['especialidade']})" for p in self.profissionais])
        
        # 1. Lógica do Paciente (Mantida e está ótima)
        if self.dados_paciente and self.dados_paciente['nome']:
            historico_consultas = self._gerar_bloco_paciente(self.dados_paciente['id'])
            
            bloco_paciente = f"""
            --- PACIENTE IDENTIFICADO ---
            NOME: {self.dados_paciente['nome']}
            STATUS: Já cadastrado no sistema.
            
            INSTRUÇÕES ESPECÍFICAS:
            1. Trate-o pelo primeiro nome ({self.dados_paciente['nome'].strip().split(' ')[0]}).
            2. NÃO pergunte o nome novamente.
            3. HISTÓRICO DE CONSULTAS (Analise se são passadas ou futuras):
            {historico_consultas}
            """
        else:
            bloco_paciente = """
            --- PACIENTE NÃO IDENTIFICADO ---
            STATUS: Novo ou não logado.
            
            INSTRUÇÕES:
            1. Antes de qualquer agendamento, você DEVE perguntar o nome.
            """
        print("--- BLOCO PACIENTE ---")
        print(bloco_paciente)

        prompt_ia = self.dados_clinica.get("prompt_ia", '')

        contexto_tempo_real = f""" 
        --- DATAS DA SEMANA ---
        HOJE: {self.dia_hoje}
        AMANHÃ: {self._formatar_data_extenso(
            dt.datetime.now(TIMEZONE_BR) + dt.timedelta(days=1)
        )}
        DEPOIS DE AMANHÃ SERÁ: {self._formatar_data_extenso(
            dt.datetime.now(TIMEZONE_BR) + dt.timedelta(days=2)
        )}

        PROFISSIONAIS HOJE: {lista_profs}
        """

        # 2. System Prompt Limpo (Sem repetições)
        prompt = ChatPromptTemplate.from_messages([
            # 🔒 System 1 — REGRAS FIXAS (JSON)
            ("system", "Siga estritamente estas configurações operacionais:\n" + prompt_ia),

            # 📌 System 2 — CONTEXTO DINÂMICO
            ("system", contexto_tempo_real),
            
            # 👤 Dados do paciente (SYSTEM - instrução crítica)
            ("system", f"INFORMAÇÕES DO PACIENTE (SIGA RIGOROSAMENTE):\n{bloco_paciente}"),

            # 💬 Histórico
            MessagesPlaceholder(variable_name="chat_history"),

            # 👤 Usuário
            ("user", "{input}"),

            # 🤖 Scratchpad do agente
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # 3. Criar e Executar o Agente
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

        resposta = agent_executor.invoke({
            "input": mensagem_usuario,
            "chat_history": historico_conversa
        })

        return resposta["output"]