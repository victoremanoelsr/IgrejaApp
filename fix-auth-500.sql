-- ==============================================================================
-- CORREÇÃO SEGURA (SEM NENHUM DELETE): NÃO APAGA NADA
-- Apenas repara as senhas que ficaram no formato incorreto na tabela interna
-- ==============================================================================

-- 1. Garante a extensão pgcrypto ativa no banco
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. REPARAÇÃO DIRETA (UPDATE): Corrige qualquer senha interna inválida
-- gerando o hash seguro oficial sem apagar nenhum usuário
UPDATE auth.users u
SET 
  encrypted_password = crypt('IA_' || p.id::TEXT, gen_salt('bf')),
  email_confirmed_at = COALESCE(u.email_confirmed_at, NOW()),
  updated_at = NOW()
FROM public.profiles p
WHERE (u.email = LOWER(TRIM(p.username)) || '@igrejaapp.internal' OR u.email = p.username || '@igrejaapp.internal')
  AND (u.encrypted_password = 'IA_PASS_FALLBACK' OR u.encrypted_password NOT LIKE '$2%');

-- 3. Atualiza a função interna para que novos usuários sempre recebam o hash correto
CREATE OR REPLACE FUNCTION public.ensure_auth_for_profile(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_username     TEXT;
  v_email        TEXT;
  v_derived_pass TEXT;
  v_auth_id      UUID;
  v_encrypted    TEXT;
BEGIN
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_profile_id;

  IF v_username IS NULL THEN
    RETURN;
  END IF;

  v_email        := LOWER(TRIM(v_username)) || '@igrejaapp.internal';
  v_derived_pass := 'IA_' || p_profile_id::TEXT;

  -- Gera hash bcrypt seguro usando pgcrypto
  BEGIN
    v_encrypted := crypt(v_derived_pass, gen_salt('bf'));
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_encrypted := public.crypt(v_derived_pass, public.gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
      v_encrypted := NULL;
    END;
  END;

  IF v_encrypted IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    v_auth_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      v_auth_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      v_encrypted,
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      FALSE,
      'authenticated',
      'authenticated'
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password  = v_encrypted,
      email_confirmed_at  = COALESCE(email_confirmed_at, NOW()),
      updated_at          = NOW()
    WHERE id = v_auth_id;
  END IF;

  UPDATE public.profiles
  SET auth_user_id = v_auth_id
  WHERE id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_auth_for_profile(UUID) TO anon, authenticated, service_role;

-- 4. Função auxiliar segura para reparação sob demanda
CREATE OR REPLACE FUNCTION public.fix_corrupted_auth_user(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
  PERFORM public.ensure_auth_for_profile(p_profile_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_corrupted_auth_user(UUID) TO anon, authenticated, service_role;

-- 5. Sincroniza todos os perfis existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE is_active IS NULL OR is_active = true LOOP
    BEGIN
      PERFORM public.ensure_auth_for_profile(r.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;

-- 6. Verificação final
SELECT count(*) as total_usuarios_autenticados FROM auth.users WHERE encrypted_password LIKE '$2%';
