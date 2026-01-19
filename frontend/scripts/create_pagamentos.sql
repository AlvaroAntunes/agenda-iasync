-- 1. Tabela de planos disponíveis
CREATE TABLE planos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL, -- 'basic', 'premium', 'enterprise'
  preco_mensal DECIMAL(10,2) NOT NULL,
  preco_anual DECIMAL(10,2) NOT NULL, 
  descricao TEXT,
  funcionalidades JSONB, -- Array de funcionalidades
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar campos na tabela clinicas
ALTER TABLE clinicas 
  ADD COLUMN ciclo_cobranca TEXT CHECK (ciclo_cobranca IN ('mensal', 'anual')),
  ADD COLUMN status_assinatura TEXT CHECK (status_assinatura IN ('ativa', 'vencida', 'cancelada', 'trial')),
  ADD COLUMN inicio_periodo_atual TIMESTAMP WITH TIME ZONE,
  ADD COLUMN fim_periodo_atual TIMESTAMP WITH TIME ZONE,
  ADD COLUMN cancelar_no_fim_periodo BOOLEAN DEFAULT false;

-- 3. Tabela de histórico de pagamentos
CREATE TABLE pagamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinicas(id) ON DELETE CASCADE,
  plano TEXT NOT NULL,
  ciclo_cobranca TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pendente', 'pago', 'falhou', 'reembolsado')),
  metodo_pagamento TEXT,
  id_gateway_pagamento TEXT, -- ID da transação no gateway (Stripe, Asaas, etc)
  pago_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);