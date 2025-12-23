-- ============================================================
-- CORRIGIR POLÍTICAS RLS - Resolver Recursão Infinita
-- ============================================================
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. REMOVER TODAS AS POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Super admins can view all clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Super admins can create clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Super admins can update clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Super admins can delete clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Clinic admins can view own clinic" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. CRIAR FUNÇÃO HELPER PARA VERIFICAR ROLE (SEM RECURSÃO)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
BEGIN
    RETURN (SELECT role::text FROM public.profiles WHERE id = user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. POLÍTICAS PARA PROFILES (SEM RECURSÃO)

-- Permitir que usuários vejam seu próprio perfil
CREATE POLICY "allow_select_own_profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Permitir que usuários atualizem seu próprio perfil
CREATE POLICY "allow_update_own_profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Permitir inserção de profile pelo trigger
CREATE POLICY "allow_insert_profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 4. POLÍTICAS PARA CLINICAS

-- Super admins podem fazer tudo
CREATE POLICY "super_admin_all_clinicas"
    ON public.clinicas
    FOR ALL
    TO authenticated
    USING (public.get_user_role(auth.uid()) = 'super_admin')
    WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

-- Clinic admins podem ver apenas sua clínica
CREATE POLICY "clinic_admin_select_own"
    ON public.clinicas
    FOR SELECT
    TO authenticated
    USING (
        id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    );

-- Clinic admins podem atualizar apenas sua clínica
CREATE POLICY "clinic_admin_update_own"
    ON public.clinicas
    FOR UPDATE
    TO authenticated
    USING (
        id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    );

-- 5. VERIFICAR SE ESTÁ TUDO OK
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'clinicas')
ORDER BY tablename, policyname;

-- 6. TESTAR A FUNÇÃO
SELECT public.get_user_role(auth.uid());
