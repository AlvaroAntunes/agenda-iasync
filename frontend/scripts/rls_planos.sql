-- Política RLS para permitir leitura de planos
-- Executar no SQL Editor do Supabase

-- Habilitar RLS na tabela planos (se ainda não estiver)
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários autenticados leiam os planos
CREATE POLICY "Permitir leitura de planos para usuários autenticados"
ON planos FOR SELECT
TO authenticated
USING (true);

-- Permitir que usuários anônimos também leiam (para página pública)
CREATE POLICY "Permitir leitura de planos para anônimos"
ON planos FOR SELECT
TO anon
USING (true);
