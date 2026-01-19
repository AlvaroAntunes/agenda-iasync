-- Inserir planos disponíveis
INSERT INTO planos (nome, preco_mensal, preco_anual, descricao, funcionalidades) VALUES
(
  'basic',
  297.00,
  3204.00,
  'Plano ideal para clínicas pequenas',
  '["Até 100 agendamentos/mês", "1 profissional", "IA básica no WhatsApp", "Suporte por email", "Relatórios básicos"]'::jsonb
),
(
  'premium',
  497.00,
  5364.00,
  'Para clínicas em crescimento',
  '["Agendamentos ilimitados", "Até 5 profissionais", "IA avançada no WhatsApp", "Suporte prioritário", "Relatórios completos", "Integração com calendário", "Lembretes automáticos"]'::jsonb
),
(
  'enterprise',
  697.00,
  7524.00,
  'Solução completa para grandes clínicas',
  '["Agendamentos ilimitados", "Profissionais ilimitados", "IA personalizada", "Suporte 24/7", "Relatórios avançados", "API de integração", "Múltiplas unidades", "Gerente de conta dedicado"]'::jsonb
);
