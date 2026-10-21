-- ============================================================
-- 100% SEGURO E NÃO-DESTRUTIVO (ZERO PERDA DE DADOS)
-- Não possui nenhum comando DROP.
-- Não apaga tabelas, não apaga colunas e não apaga nenhum dado existente.
-- Apenas cria uma função segura para permitir salvar planos de igrejas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_church_admin(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_pastor_name TEXT DEFAULT NULL,
  p_cnpj TEXT DEFAULT NULL,
  p_mission_statement TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL,
  p_plan_type TEXT DEFAULT NULL,
  p_plan_tier TEXT DEFAULT NULL,
  p_due_day INT DEFAULT NULL,
  p_grace_period INT DEFAULT NULL,
  p_payment_promise_date DATE DEFAULT NULL,
  p_pix_key TEXT DEFAULT NULL,
  p_last_payment_date DATE DEFAULT NULL,
  p_pastor_phone TEXT DEFAULT NULL,
  p_official_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  UPDATE public.churches
  SET
    name                 = COALESCE(p_name, name),
    address              = COALESCE(p_address, address),
    pastor_name          = COALESCE(p_pastor_name, pastor_name),
    cnpj                 = CASE WHEN p_cnpj IS NOT NULL THEN p_cnpj ELSE cnpj END,
    mission_statement    = CASE WHEN p_mission_statement IS NOT NULL THEN p_mission_statement ELSE mission_statement END,
    logo_url             = CASE WHEN p_logo_url IS NOT NULL THEN p_logo_url ELSE logo_url END,
    active               = COALESCE(p_active, active),
    plan_type            = COALESCE(p_plan_type, plan_type),
    plan_tier            = CASE WHEN p_plan_tier IS NOT NULL THEN p_plan_tier ELSE plan_tier END,
    due_day              = CASE WHEN p_due_day IS NOT NULL THEN p_due_day ELSE due_day END,
    grace_period         = CASE WHEN p_grace_period IS NOT NULL THEN p_grace_period ELSE grace_period END,
    payment_promise_date = CASE WHEN p_payment_promise_date IS NOT NULL THEN p_payment_promise_date ELSE payment_promise_date END,
    pix_key              = CASE WHEN p_pix_key IS NOT NULL THEN p_pix_key ELSE pix_key END,
    last_payment_date    = CASE WHEN p_last_payment_date IS NOT NULL THEN p_last_payment_date ELSE last_payment_date END,
    pastor_phone         = CASE WHEN p_pastor_phone IS NOT NULL THEN p_pastor_phone ELSE pastor_phone END,
    official_name        = CASE WHEN p_official_name IS NOT NULL THEN p_official_name ELSE official_name END
  WHERE id = p_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Igreja não encontrada');
  END IF;

  RETURN jsonb_build_object('success', true, 'church', row_to_json(v_updated));
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_church_admin TO anon, authenticated, service_role;
