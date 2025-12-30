-- ============================================================
-- POLÍTICAS RLS PARA TABELA PROFISSIONAIS
-- ============================================================
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. REMOVER POLÍTICAS ANTIGAS (se existirem)
DROP POLICY IF EXISTS "super_admin_all_profissionais" ON public.profissionais;
DROP POLICY IF EXISTS "clinic_admin_select_own_profissionais" ON public.profissionais;
DROP POLICY IF EXISTS "clinic_admin_insert_own_profissionais" ON public.profissionais;
DROP POLICY IF EXISTS "clinic_admin_update_own_profissionais" ON public.profissionais;
DROP POLICY IF EXISTS "clinic_admin_delete_own_profissionais" ON public.profissionais;

-- 2. POLÍTICAS PARA SUPER ADMINS
-- Super admins podem fazer tudo com profissionais
CREATE POLICY "super_admin_all_profissionais"
    ON public.profissionais
    FOR ALL
    TO authenticated
    USING (public.get_user_role(auth.uid()) = 'super_admin')
    WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

-- 3. POLÍTICAS PARA CLINIC ADMINS

-- Clinic admins podem ver apenas profissionais da sua clínica
CREATE POLICY "clinic_admin_select_own_profissionais"
    ON public.profissionais
    FOR SELECT
    TO authenticated
    USING (
        clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    );

-- Clinic admins podem inserir profissionais na sua clínica
CREATE POLICY "clinic_admin_insert_own_profissionais"
    ON public.profissionais
    FOR INSERT
    TO authenticated
    WITH CHECK (
        clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    );

-- Clinic admins podem atualizar apenas profissionais da sua clínica
CREATE POLICY "clinic_admin_update_own_profissionais"
    ON public.profissionais
    FOR UPDATE
    TO authenticated
    USING (
        clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    );

-- Clinic admins podem deletar apenas profissionais da sua clínica
CREATE POLICY "clinic_admin_delete_own_profissionais"
    ON public.profissionais
    FOR DELETE
    TO authenticated
    USING (
        clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    );

-- 4. VERIFICAR POLÍTICAS CRIADAS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profissionais'
ORDER BY policyname;
