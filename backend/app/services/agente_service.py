"""
    Serviço do Agente de Agendamento para Clínicas.
    Utiliza LangChain para criar um agente que interage com o usuário,
    Verifica disponibilidade e realiza agendamentos no Google Calendar.
"""

import os
import datetime as dt
from typing import List, Optional
from pydantic import BaseModel, Field
from unidecode import unidecode

# LangChain Imports
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage

# Seus serviços
from app.services.google_calendar_service import GoogleCalendarService
from supabase import create_client, Client
from app.utils.date_utils import formatar_hora

# Configuração do Supabase 
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class AgenteClinica:
    def __init__(self, clinic_id: str, session_id: str):
        self.clinic_id = clinic_id
        self.session_id = session_id
        self.calendar_service = GoogleCalendarService(clinic_id)
        
        # Carregar dados da clínica (Nome, Prompt, Profissionais)
        self.clinic_data = self._carregar_dados_clinica()
        self.profissionais = self._carregar_profissionais()

    def _carregar_dados_clinica(self):
        response = supabase.table('clinicas').select('*').eq('id', self.clinic_id).single().execute()
        return response.data

    def _carregar_profissionais(self):
        # Trazemos os profissionais para injetar no prompt do sistema
        response = supabase.table('profissionais').select('id, nome, especialidade, gcal_calendar_id').eq('clinic_id', self.clinic_id).execute()
        return response.data

    # --- DEFINIÇÃO DAS FERRAMENTAS (TOOLS) ---
    
    @tool
    def verificar_disponibilidade(self, data: str, nome_profissional: Optional[str] = None):
        """
        Verifica a agenda.
        Input: 
        - data: string no formato dd/mm/aaaa.
        - nome_profissional: (Opcional) Nome do médico/dentista. Se não informado, verifica todos.
        """
        
        print(f"--- TOOL: Verificando disponibilidade para {data} ---")
        
        # Se o usuário não especificou médico, pegamos o primeiro (ou lógica de rodízio)
        calendar_id = 'primary'
        
        if nome_profissional:
            # Procura o ID do calendário baseado no nome (busca simples)
            for prof in self.profissionais:
                if unidecode(nome_profissional).lower() in unidecode(prof['nome']).lower():
                    calendar_id = prof['gcal_calendar_id']
                    break
        
        # Converte string para datetime para busca
        try:
            data_dt = dt.datetime.strptime(data, "%d-%m-%Y")
        except ValueError:
            return "Formato de data inválido. Use dd/mm/aaaa."

        eventos = self.calendar_service.listar_eventos(calendar_id=calendar_id, data=data_dt)
        
        if not eventos:
            return f"A agenda para {data} está completamente livre."
        
        # Formata para o LLM ler fácil
        lista_ocupada = [f"{formatar_hora(e['start'].get('dateTime'))} até {formatar_hora(e['end'].get('dateTime'))} - Ocupado" for e in eventos]
        return f"Horários OCUPADOS em {data}:\n" + "\n".join(lista_ocupada)

    @tool
    def realizar_agendamento(self, nome_paciente: str, telefone: str, data_hora: str, nome_profissional: str):
        """
        Realiza o agendamento final.
        Input:
        - nome_paciente: Nome completo.
        - telefone: Telefone com DDD.
        - data_hora: Data e hora ISO (ex: 2024-11-25T14:30:00).
        - nome_profissional: Nome do médico/especialista.
        """
        print(f"--- TOOL: Agendando para {nome_paciente} ---")
        
        # 1. Identificar Profissional e Calendar ID
        prof_data = next((p for p in self.profissionais if nome_profissional.lower() in p['nome'].lower()), None)
        
        if not prof_data:
            return "Erro: Profissional não encontrado. Peça para o usuário confirmar o nome do médico."

        # 2. Verificar/Criar Paciente no Supabase (Upsert)
        # Primeiro buscamos se existe pelo telefone
        paciente_response = supabase.table('pacientes').select('id').eq('clinic_id', self.clinic_id).eq('telefone', telefone).execute()
        
        if paciente_response.data:
            paciente_id = paciente_response.data[0]['id']
        else:
            # Cria novo
            novo_paciente = supabase.table('pacientes').insert({
                'clinic_id': self.clinic_id,
                'nome': nome_paciente,
                'telefone': telefone
            }).execute()
            paciente_id = novo_paciente.data[0]['id']

        # 3. Criar no Google Calendar
        try:
            dt_inicio = dt.datetime.fromisoformat(data_hora)
            evento_gcal = self.calendar_service.criar_evento(
                calendar_id=prof_data['gcal_calendar_id'],
                resumo=f"Consulta: {nome_paciente} ({telefone})",
                inicio_dt=dt_inicio
            )
        except Exception as e:
            return f"Erro ao conectar com Google Calendar: {str(e)}"

        # 4. Salvar Consulta no Supabase
        supabase.table('consultas').insert({
            'clinic_id': self.clinic_id,
            'paciente_id': paciente_id,
            'profissional_id': prof_data['id'],
            'horario_consulta': data_hora,
            'status': 'AGENDADA',
            'origem_agendamento': 'IA',
            'gcal_event_id': evento_gcal.get('id')
        }).execute()

        # 5. Logar Sucesso (KPI)
        supabase.table('ia_logs').insert({
            'clinic_id': self.clinic_id,
            'session_id': self.session_id,
            'event_type': 'INTENT_SCHEDULE_SUCCESS'
        }).execute()

        return "Agendamento realizado com sucesso! Confirme para o usuário."

    # --- O CÉREBRO (AGENTE) ---

    def executar(self, mensagem_usuario: str, historico_conversa: List = []):
        
        # 1. Configurar LLM 
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=os.getenv("OPENAI_API_KEY"))

        # 2. Bind das Ferramentas (Vincula as funções ao LLM)
        tools = [self.verificar_disponibilidade, self.realizar_agendamento]
        
        # 3. Criar o Prompt do Sistema
        # Injetamos a data atual para ele não se perder no tempo
        data_hoje = dt.datetime.now().strftime("%A, %d de %B de %Y")
        lista_profs = ", ".join([f"{p['nome']} ({p['especialidade']})" for p in self.profissionais])
        
        system_prompt = f"""
        Você é a recepcionista virtual da {self.clinic_data['nome_da_clinica']}.
        
        DATA DE HOJE: {data_hoje}.
        PROFISSIONAIS DISPONÍVEIS: {lista_profs}.
        
        SUAS INSTRUÇÕES:
        {self.clinic_data.get('prompt_ia', 'Seja educada e ajude a agendar.')}
        
        REGRAS DE AGENDAMENTO:
        1. Antes de agendar, VERIFIQUE a disponibilidade usando a ferramenta 'verificar_disponibilidade'.
        2. SÓ agende se o horário estiver livre.
        3. Para agendar, você PRECISA coletar: Nome, Telefone e Qual Profissional.
        4. Se o usuário não disser o profissional, sugira os disponíveis.
        5. Sempre confirme a data e hora final antes de chamar a ferramenta de agendamento.
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