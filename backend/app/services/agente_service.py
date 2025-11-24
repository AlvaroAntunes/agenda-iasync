"""
    Serviço do Agente de Agendamento para Clínicas.
    Utiliza LangChain para criar um agente que interage com o usuário,
    Verifica disponibilidade e realiza agendamentos no Calendar.
"""

import os
import datetime as dt
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
    telefone: str = Field(description="Telefone com DDD")
    data_hora: str = Field(description="Data e hora ISO (ex: 2024-11-25T14:30:00)")
    nome_profissional: str = Field(description="Nome do médico escolhido")
    
class AgenteClinica:
    def __init__(self, clinic_id: str, session_id: str):
        self.clinic_id = clinic_id
        self.session_id = session_id
        self.calendar_service = get_calendar_service(clinic_id)
        
        # Carregar dados da clínica (Nome, Prompt, Profissionais)
        self.clinic_data = self._carregar_dados_clinica()
        self.profissionais = self._carregar_profissionais()
        self.dados_paciente = self._identificar_paciente()

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
            response = supabase.table('pacientes')\
                .select('nome')\
                .eq('clinic_id', self.clinic_id)\
                .eq('telefone', telefone_busca)\
                .maybe_single()\
                .execute()
            
            return response.data # Retorna o dict {nome: 'João'} ou None
        except Exception:
            return None

    # --- DEFINIÇÃO DAS FERRAMENTAS (TOOLS) ---
    
    def _logic_verificar_disponibilidade(self, data: str, nome_profissional: Optional[str] = None):
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
                    calendar_id = prof['external_calendar_id']
                    break
        
        # Converte string para datetime para busca
        try:
            data_dt = dt.datetime.strptime(data, "%d/%m/%Y")
        except ValueError:
            return "Formato de data inválido. Use dd/mm/aaaa."

        eventos = self.calendar_service.listar_eventos(calendar_id=calendar_id, data=data_dt)
        
        if not eventos:
            return f"A agenda para {data} está completamente livre."
        
        # Formata para o LLM ler fácil
        lista_ocupada = [f"{formatar_hora(e['start'].get('dateTime'))} até {formatar_hora(e['end'].get('dateTime'))} - Ocupado" for e in eventos]
        return f"Horários OCUPADOS em {data}:\n" + "\n".join(lista_ocupada)

    def _logic_realizar_agendamento(self, nome_paciente: str, telefone: str, data_hora: str, nome_profissional: str):
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
        prof_data = next((p for p in self.profissionais if unidecode(nome_profissional).lower() in unidecode(p['nome']).lower()), None)
        
        if not prof_data:
            return "Erro: Profissional não encontrado. Peça para o usuário confirmar o nome do profissional."

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

        # 3. Criar no Calendar
        
        telefone_limpo = ''.join(filter(str.isdigit, telefone))
        
        if len(telefone_limpo) <= 11: 
            telefone_link = f"55{telefone_limpo}"
        else:
            telefone_link = telefone_limpo
        
        descricao_formatada = f"""
        === 📋 DADOS DO CLIENTE ===
        👤 NOME: {nome_paciente}
        📱 TELEFONE: {telefone}

        === ⚡ AÇÕES RÁPIDAS ===
        🔗 WHATSAPP: https://wa.me/{telefone_link}
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

    # --- O CÉREBRO (AGENTE) ---

    def executar(self, mensagem_usuario: str, historico_conversa: List = []):
        
        # 1. Configurar LLM  
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=os.getenv("OPENAI_API_KEY"))

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
            )
        ]

        # 3. Criar o Prompt do Sistema
        # Injetamos a data atual para ele não se perder no tempo
        data_hoje = dt.datetime.now().strftime("%A, %d de %B de %Y")
        lista_profs = ", ".join([f"{p['nome']} ({p['especialidade']})" for p in self.profissionais])
                
        # Lógica de Contexto do Paciente
        if self.dados_paciente:
            bloco_paciente = f"""
            VOCÊ ESTÁ FALANDO COM UM PACIENTE RECORRENTE.
            Nome: {self.dados_paciente['nome']}
            Status: Já cadastrado no sistema.
            
            IMPORTANTE:
            - Chame-o pelo nome ({self.dados_paciente['nome']}).
            - NÃO pergunte o nome dele novamente, pois você já sabe.
            - Se ele quiser agendar, você já pode usar o nome '{self.dados_paciente['nome']}' na ferramenta.
            """
        else:
            bloco_paciente = """
            VOCÊ ESTÁ FALANDO COM UM PACIENTE NOVO (OU NÃO IDENTIFICADO).
            Status: Não cadastrado.
            
            IMPORTANTE:
            - Se ele quiser agendar, você PRECISA perguntar o nome dele primeiro.
            """

        system_prompt = f"""
        Você é a recepcionista da {self.clinic_data['nome_da_clinica']}.
        
        DATA DE HOJE: {data_hoje}.
        PROFISSIONAIS DISPONÍVEIS: {lista_profs}.
        
        --- CONTEXTO DO USUÁRIO ---
        {bloco_paciente}
        ---------------------------
        
        SUAS INSTRUÇÕES GERAIS:
        {self.clinic_data.get('prompt_ia', 'Seja educada e ajude a agendar.')}
        
        REGRAS DE AGENDAMENTO:
        1. Antes de agendar, VERIFIQUE a disponibilidade usando a ferramenta 'verificar_disponibilidade'.
        2. SÓ agende se o horário estiver livre.
        3. Para agendar, você PRECISA coletar: Nome e Telefone.
        4. Se o usuário não disser o profissional, sugira os disponíveis.
        5. Sempre confirme a data e hora final antes de chamar a ferramenta de agendamento.
        6. Caso no dia solicitado não haja disponibilidade, ofereça datas alternativas próximas.
        7. Use o formato dd/mm/aaaa para datas e Data e hora ISO (ex: 2024-11-25T14:30:00) para agendamentos.
        8. Seja sempre educada e profissional.
        9. Responda em português.
        10. Responda com textos menores, pois o cliente deve ter uma experiência rápida e objetiva.
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