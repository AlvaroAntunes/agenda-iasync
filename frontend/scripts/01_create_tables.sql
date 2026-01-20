-- 1. CRIAR OS TIPOS ENUM (Para campos de status)
-- Isso garante que só possamos inserir os valores que planejamos.

CREATE TYPE public.consulta_status AS ENUM (
    'AGENDADA',
    'COMPARECEU',
    'FALTOU',
    'CANCELADO'
);

CREATE TYPE public.agendamento_origem AS ENUM (
    'IA',
    'MANUAL'
);

CREATE TYPE public.ia_log_event AS ENUM (
    'INTENT_SCHEDULE_START',
    'INTENT_SCHEDULE_FAIL',
    'INTENT_SCHEDULE_SUCCESS'
);

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'clinic_admin'
);

CREATE TYPE public.clinic_plan AS ENUM (
    'basic',
    'premium',
    'enterprise'
);

CREATE TYPE public.tipo_calendario AS ENUM (
    'google',
    'outlook'
);


-- 2. TABELA "clinicas" (A tabela "Mestre" / "Tenant")
-- Armazena o "dono" de todos os outros dados.

CREATE TABLE public.clinicas (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    telefone text NOT NULL,
    email text NOT NULL UNIQUE,
    endereco text,
    uf text,
    cidade text,
    tipo_calendario public.tipo_calendario NOT NULL DEFAULT 'google',
    calendar_refresh_token text, 
    prompt_ia text,
    plano public.clinic_plan NOT NULL DEFAULT 'basic',
    clinica_fechada jsonb DEFAULT NULL,
    ia_ativa boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS) na tabela de clínicas
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

-- 3. TABELA "leads"
-- Armazena os pacientes, cada um "pertencendo" a uma clínica.

CREATE TABLE public.leads (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Chave estrangeira para "amarrar" este paciente a uma clínica
    clinic_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    
    lid text NOT NULL,
    nome text NOT NULL,
    telefone text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ÍNDICES DE VELOCIDADE (Obrigatório para Multi-Tenant):
-- 1. Para o dashboard encontrar "todos os pacientes desta clínica"
CREATE INDEX idx_leads_clinic_id ON public.leads(clinic_id);

-- 2. Para o IA encontrar "este paciente pelo telefone DENTRO desta clínica"
CREATE UNIQUE INDEX idx_leads_clinic_telefone ON public.leads(clinic_id, telefone);

-- 4. TABELA "consultas"
-- O coração do sistema. Armazena os eventos de agendamento.

CREATE TABLE public.consultas (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Chaves estrangeiras
    clinic_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    paciente_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    profissional_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    
    -- Dados da consulta
    horario_consulta timestamptz NOT NULL,
    status public.consulta_status NOT NULL DEFAULT 'AGENDADA',
    origem_agendamento public.agendamento_origem NOT NULL,
    
    -- Chave de sincronização
    external_event_id text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- ÍNDICES DE VELOCIDADE:
-- 1. Para o dashboard/validação encontrar "consultas desta clínica"
CREATE INDEX idx_consultas_clinic_id ON public.consultas(clinic_id);

-- 2. Para o "Painel de Validação" buscar por data (ex: "consultas de hoje")
CREATE INDEX idx_consultas_horario ON public.consultas(horario_consulta);

-- 3. Para o "Sincronizador" encontrar consultas pelo ID do Google Calendar
CREATE INDEX idx_consultas_external_event_id ON public.consultas(external_event_id);

-- 4. Para o dashboard buscar "todas as consultas deste paciente"
CREATE INDEX idx_consultas_paciente_id ON public.consultas(paciente_id);

-- 5. TABELA "ia_logs"
-- Armazena os eventos para o KPI "Taxa de Sucesso do IA".

CREATE TABLE public.ia_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Chave estrangeira
    clinic_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    
    -- Dados do Log
    session_id text NOT NULL, -- Para agrupar uma conversa
    event_type public.ia_log_event NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.ia_logs ENABLE ROW LEVEL SECURITY;

-- ÍNDICES DE VELOCIDADE (Para o Dashboard de KPIs):
-- 1. Para o dashboard calcular "KPIs desta clínica"
CREATE INDEX idx_ia_logs_clinic_id ON public.ia_logs(clinic_id);

-- 2. Para o dashboard filtrar por período (ex: "KPIs dos últimos 30 dias")
CREATE INDEX idx_ia_logs_timestamp ON public.ia_logs(timestamp);

-- CRIAR A TABELA "profissionais"
CREATE TABLE public.profissionais (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Chaves estrangeiras
    clinic_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    
    nome text NOT NULL, 
    especialidade text, 
    external_calendar_id text NOT NULL DEFAULT 'primary',
    
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar segurança (RLS)
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

-- Criar índice para busca rápida
CREATE INDEX idx_profissionais_clinic_id ON public.profissionais(clinic_id);

-- Tabela para armazenar o histórico do chat
CREATE TABLE public.chat_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Para qual clínica é essa conversa?
    clinic_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    
    -- Quem é o usuário? (No WhatsApp, é o número do telefone: 5511999...)
    session_id text NOT NULL,
    
    -- Quem falou? ('user' = paciente, 'ai' = seu bot)
    quem_enviou text NOT NULL CHECK (quem_enviou IN ('user', 'ai')),
    
    -- O que foi dito?
    conteudo text NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ÍNDICE DE VELOCIDADE (CRÍTICO)
-- Precisamos buscar as mensagens de uma sessão específica muito rápido, ordenadas por tempo.
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at DESC);