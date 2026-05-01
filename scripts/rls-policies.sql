-- ============================================================
-- IGREJAAPP — POLÍTICAS RLS COMPLETAS
-- ============================================================
-- Execute INTEIRO no SQL Editor do Supabase (em uma única vez)
-- Pré-requisito: usuários já migrados para o Supabase Auth
--   (coluna auth_user_id preenchida na tabela profiles)
-- ============================================================

-- ============================================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER)
-- Rodam com privilégios do dono da função, ignorando o RLS
-- para evitar recursão infinita na tabela profiles
-- ============================================================

-- Verifica se o usuário autenticado é SUPER_ADM
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'SUPER_ADM'
  );
$$;

-- Retorna todos os IDs de igrejas que o usuário pode acessar:
-- a própria igreja + todas as congregações (se for SEDE)
CREATE OR REPLACE FUNCTION public.get_accessible_church_ids()
RETURNS UUID[]
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT c.id FROM public.churches c
    WHERE c.id = (
        SELECT church_id FROM public.profiles
        WHERE auth_user_id = auth.uid() LIMIT 1
      )
      OR c.parent_id = (
        SELECT church_id FROM public.profiles
        WHERE auth_user_id = auth.uid() LIMIT 1
      )
  );
$$;

-- ============================================================
-- 1. PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Super admin vê e edita tudo
CREATE POLICY "sadm_all_profiles" ON public.profiles
FOR ALL USING (public.is_super_admin());

-- Cada usuário vê e edita o próprio perfil
CREATE POLICY "own_profile_select" ON public.profiles
FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "own_profile_update" ON public.profiles
FOR UPDATE USING (auth_user_id = auth.uid());

-- Usuário vê todos os perfis da sua própria igreja
CREATE POLICY "church_profiles_select" ON public.profiles
FOR SELECT USING (
  church_id IS NOT NULL
  AND church_id = ANY(public.get_accessible_church_ids())
);

-- ============================================================
-- 2. CHURCHES
-- ============================================================
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_churches" ON public.churches
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_accessible_churches" ON public.churches
FOR SELECT USING (id = ANY(public.get_accessible_church_ids()));

-- Permite que usuários da igreja atualizem os dados dela
CREATE POLICY "user_update_church" ON public.churches
FOR UPDATE USING (id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 3. MEMBERS
-- ============================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_members" ON public.members
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_members" ON public.members
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 4. TRANSACTIONS
-- ============================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_transactions" ON public.transactions
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_transactions" ON public.transactions
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 5. CAMPAIGNS
-- ============================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_campaigns" ON public.campaigns
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_campaigns" ON public.campaigns
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 6. EVENTS
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_events" ON public.events
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_events" ON public.events
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 7. MINUTES (ATAS)
-- ============================================================
ALTER TABLE public.minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_minutes" ON public.minutes
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_minutes" ON public.minutes
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 8. FIXED_EXPENSES
-- ============================================================
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_fixed_expenses" ON public.fixed_expenses
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_fixed_expenses" ON public.fixed_expenses
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 9. LETTER_HISTORY
-- ============================================================
ALTER TABLE public.letter_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_letter_history" ON public.letter_history
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_letter_history" ON public.letter_history
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 10. PHYSICAL_SPACES
-- ============================================================
ALTER TABLE public.physical_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_physical_spaces" ON public.physical_spaces
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_physical_spaces" ON public.physical_spaces
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 11. INVENTORY_ASSETS
-- ============================================================
ALTER TABLE public.inventory_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_inventory_assets" ON public.inventory_assets
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_inventory_assets" ON public.inventory_assets
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 12. MISSION_CARNET_TEMPLATES
-- ============================================================
ALTER TABLE public.mission_carnet_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_carnet_templates" ON public.mission_carnet_templates
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_carnet_templates" ON public.mission_carnet_templates
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 13. LETTER_TEMPLATES
-- ============================================================
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_letter_templates" ON public.letter_templates
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_letter_templates" ON public.letter_templates
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 14. BOOKLET_SETTINGS
-- ============================================================
ALTER TABLE public.booklet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_all_booklet_settings" ON public.booklet_settings
FOR ALL USING (public.is_super_admin());

CREATE POLICY "user_church_booklet_settings" ON public.booklet_settings
FOR ALL USING (church_id = ANY(public.get_accessible_church_ids()));

-- ============================================================
-- 15. SYSTEM_SETTINGS (somente SUPER_ADM)
-- ============================================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sadm_only_system_settings" ON public.system_settings
FOR ALL USING (public.is_super_admin());

-- ============================================================
-- FIM
-- ============================================================
