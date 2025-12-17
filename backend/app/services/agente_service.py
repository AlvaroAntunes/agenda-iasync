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
from supabase import create_client, Client
from app.utils.date_utils import formatar_hora

load_dotenv()  # Carrega variáveis do .env

# Configuração do Supabase 
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- 1. DEFINIÇÃO DOS SCHEMAS (O que o Robô vê) ---
# Isso garante que o LLM nunca tente enviar 'self'

class VerificaDisponibilidade(BaseModel):
    data: str = Field(description="Data para verificar no formato DD/MM/AAAA")
    nome_profissional: Optional[str] = Field(default=None, description="Nome do médico ou especialista")

class RealizaAgendamento(BaseModel):
    nome_paciente: str = Field(description="Nome completo do paciente")
    data_hora: str = Field(description="Data e hora ISO (ex: 2024-11-25T14:30:00)")
    nome_profissional: str = Field(description="Nome do médico escolhido")
    
class VerificaConsultasExistentes(BaseModel):
    data: str = Field(description="Data para verificar no formato DD/MM/AAAA")
    nome_paciente: str = Field(description="Nome completo do paciente")
    
class AgenteClinica:
    def __init__(self, clinic_id: str, session_id: str):
        self.clinic_id = clinic_id
        self.session_id = session_id
        self.calendar_service = get_calendar_service(clinic_id)
        
        # Carregar dados da clínica (Nome, Prompt, Profissionais)
        self.dados_clinica = self._carregar_dados_clinica()
        self.profissionais = self._carregar_profissionais()
        self.dados_paciente = self._identificar_paciente()
        self.dia_hoje = self._obter_hoje_extenso()
        
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
        
        try:
            response = supabase.table('lids')\
                .select('nome')\
                .eq('clinic_id', self.clinic_id)\
                .eq('telefone', telefone_busca)\
                .limit(1)\
                .execute()
                
            if response.data and len(response.data) > 0:
                return response.data[0]
            
            return None 
        except Exception:
            return None
        
    def _identificar_profissional(self, id: str):
        """
        Busca o profissional pelo id.
        """
        for prof in self.profissionais:
            if prof['id'] == id:
                return prof['nome']
            
        return None
    
    def _obter_hoje_extenso(self):
        mapa_dias = {
            0: "Segunda-feira",
            1: "Terça-feira",
            2: "Quarta-feira",
            3: "Quinta-feira",
            4: "Sexta-feira",
            5: "Sábado",
            6: "Domingo"
        }
        
        # Define o fuso horário do Brasil
        fuso_br = ZoneInfo("America/Sao_Paulo")
        
        # Pega o momento atual JÁ com o fuso correto aplicado
        agora = dt.datetime.now(fuso_br)
        dia_semana = mapa_dias[agora.weekday()]
        
        # Formata: Quarta-feira, 17/12/2025 - 14:30
        return f"{dia_semana}, {agora.strftime('%d/%m/%Y - %H:%M')}"
        
    # --- DEFINIÇÃO DAS FERRAMENTAS (TOOLS) ---
    
    def _logic_verificar_disponibilidade(self, data: str, nome_profissional: Optional[str] = None):
        """
        Verifica a agenda.
        Input: 
        - data: string no formato dd/mm/aaaa.
        - nome_profissional: (Opcional) Nome do médico/dentista. Se não informado, verifica todos.
        """
        
        print(f"--- TOOL: Verificando disponibilidade para {data} ---")
        
        # ==============================================================================
        # 0. BLOCO DE SEGURANÇA: Validação de Data (Feriados e Fim de Semana)
        # ==============================================================================
        try:
            dt_inicio = dt.datetime.strptime(data, "%d/%m/%Y")
        except ValueError:
            return "Erro: Data fornecida em formato inválido. Use ISO (YYYY-MM-DDTHH:MM:SS)."

        # Configura feriados do Brasil (MG por exemplo, ajuste conforme o estado da clínica)
        feriados = holidays.BR(state=self.dados_clinica.get('uf', 'MG'), years=[dt_inicio.year])
        
        # Pegando feriados municipais (se houver)
        lista_fechada = self.dados_clinica.get('clinica_fechada', [])
        
        # A. Verifica se é Feriado
        if dt_inicio.date() in feriados:
            nome_feriado = feriados.get(dt_inicio.date())
            return f"NEGADO: A data solicitada ({dt_inicio.strftime('%d/%m')}) é feriado de {nome_feriado}. A clínica não abre."
        
        for item in lista_fechada:
            if item['dia'] == dt_inicio.day and item['mes'] == dt_inicio.month:
                # Pega o motivo (se não tiver, usa genérico)
                motivo = item.get('descricao', 'Data sem expediente')
                return f"NEGADO: Na data solicitada ({dt_inicio.strftime('%d/%m')}) a clínica não abre. Motivo: {motivo}."

        # B. Verifica se é Fim de Semana (0=Seg, 5=Sab, 6=Dom)
        # Se sua clínica abre sábado, mude para: if dt_inicio.weekday() == 6:
        if dt_inicio.weekday() >= 5: 
            dia_semana = "Sábado" if dt_inicio.weekday() == 5 else "Domingo"
            return f"NEGADO: A data solicitada cai em um {dia_semana} e a clínica não funciona."

        # ==============================================================================
        
        # Se o usuário não especificou médico, pegamos o primeiro (ou lógica de rodízio)
        calendar_id = 'primary'
        
        if nome_profissional:
            # Procura o ID do calendário baseado no nome (busca simples)
            for prof in self.profissionais:
                if unidecode(nome_profissional).lower() in unidecode(prof['nome']).lower():
                    calendar_id = prof['external_calendar_id']
                    break
        
        # Converte string para datetime para busca
        try:
            data_dt = dt.datetime.strptime(data, "%d/%m/%Y")
        except ValueError:
            return "Formato de data inválido. Use dd/mm/aaaa."

        eventos = self.calendar_service.listar_eventos(data=data_dt,calendar_id=calendar_id)
        
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
        prof_data = next((p for p in self.profissionais if unidecode(nome_profissional).lower() in unidecode(p['nome']).lower()), None)
        
        if not prof_data:
            return "Erro: Profissional não encontrado. Peça para o usuário confirmar o nome do profissional."

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
            dt_inicio = dt.datetime.fromisoformat(data_hora)
            # if dt_inicio.tzinfo is None:
            #     br_timezone = ZoneInfo("America/Sao_Paulo")
            #     dt_inicio = dt_inicio.replace(tzinfo=br_timezone)
                
            # horario_iso_com_fuso = dt_inicio.isoformat()

            evento_cal = self.calendar_service.criar_evento(
                calendar_id=prof_data['external_calendar_id'],
                resumo=f"Consulta: {nome_paciente} ({telefone})",
                inicio_dt=dt_inicio,
                descricao=descricao_formatada
            )
        except Exception as e:
            return f"Erro ao conectar com o Calendar: {str(e)}"

        # 4. Salvar Consulta no Supabase
        supabase.table('consultas').insert({
            'clinic_id': self.clinic_id,
            'paciente_id': paciente_id,
            'profissional_id': prof_data['id'],
            'horario_consulta': dt_inicio.isoformat(),
            'status': 'AGENDADA',
            'origem_agendamento': 'IA',
            'external_event_id': evento_cal.get('id')
        }).execute()

        # 5. Logar Sucesso (KPI)
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
        paciente_response = supabase.table('lids').select('id').eq('clinic_id', self.clinic_id).eq('telefone', telefone).execute()
        
        if not paciente_response.data:
            return "Nenhum paciente encontrado com esse telefone."

        paciente_id = paciente_response.data[0]['id']

        # 2. Buscar Consultas Futuras
        agora_data = dt.datetime.strptime(data, "%d/%m/%Y").date()
        inicio_dia = f"{agora_data.isoformat()}T00:00:00+00:00"
        fim_dia = f"{agora_data.isoformat()}T23:59:59+00:00"

        consultas_response = supabase.table('consultas')\
            .select('status')\
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

    # --- O CÉREBRO (AGENTE) ---

    def executar(self, mensagem_usuario: str, historico_conversa: List = []):
        # 1. Configurar LLM  
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY"))

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
            )
        ]

        # 3. Criar o Prompt do Sistema
        lista_profs = ", ".join([f"{p['nome']} ({p['especialidade']})" for p in self.profissionais])
                
        # Lógica de Contexto do Paciente
        if self.dados_paciente:
            bloco_paciente = f"""
            VOCÊ ESTÁ FALANDO COM UM PACIENTE RECORRENTE.
            Nome: {self.dados_paciente['nome']}
            Status: Já cadastrado no sistema.
            
            IMPORTANTE:
            - Chame-o pelo nome ({self.dados_paciente['nome'].strip().split(' ')[0]}).
            - NÃO pergunte o nome dele novamente, pois você já sabe.
            - Se ele quiser agendar, você já pode usar o nome '{self.dados_paciente['nome']}' na ferramenta. Se ele tiver consulta agendada, avise-o.
            """
        else:
            bloco_paciente = """
            VOCÊ ESTÁ FALANDO COM UM PACIENTE NOVO (OU NÃO IDENTIFICADO).
            Status: Não cadastrado.
            
            IMPORTANTE:
            - Se ele quiser agendar, você PRECISA perguntar o nome dele primeiro.
            """
        
        system_prompt = f"""
        {self.dados_clinica.get('prompt_ia', '')}
        
        --- DADOS DE CONTEXTO EM TEMPO REAL ---
        DATA/HORA ATUAL: {self.dia_hoje}
        PROFISSIONAIS DISPONÍVEIS HOJE: {lista_profs}

        --- DADOS DO PACIENTE ATUAL ---
        {bloco_paciente}
        
        Você é a recepcionista da {self.dados_clinica['nome_da_clinica']}.
        
        DATA DE HOJE: {self.dia_hoje} - .
        PROFISSIONAIS DISPONÍVEIS: {lista_profs}.
        
        --- CONTEXTO DO USUÁRIO ---
        {bloco_paciente}
        ---------------------------
        """
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # 4. Criar e Executar o Agente
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

        resposta = agent_executor.invoke({
            "input": mensagem_usuario,
            "chat_history": historico_conversa
        })

        return resposta["output"]