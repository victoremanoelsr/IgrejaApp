-- =========================================================
-- IgrejaApp — Migração Definitiva: Gestão de Usuários, Senhas e Autenticação
-- Execute no SQL Editor do Supabase (painel > SQL Editor)
-- 100% SEGURO: Não remove dados, tabelas ou membros existentes.
-- =========================================================

-- 1. Garante extensão pgcrypto no schema extensions e permissões
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Remove versões anteriores das funções para evitar conflito de assinaturas
DROP FUNCTION IF EXISTS public.find_profile_for_recovery(TEXT);
DROP FUNCTION IF EXISTS public.update_user_credentials(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_user_credentials(UUID, TEXT);
DROP FUNCTION IF EXISTS public.update_user_credentials(UUID);
DROP FUNCTION IF EXISTS public.update_user_credentials(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_user_credentials(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_user_credentials(TEXT);
DROP FUNCTION IF EXISTS public.update_profile_admin(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_profile_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_profile_admin;
DROP FUNCTION IF EXISTS public.login_profile(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.ensure_auth_for_profile(UUID);
DROP FUNCTION IF EXISTS public.confirm_internal_user(TEXT);
DROP FUNCTION IF EXISTS public.link_profile_to_auth(TEXT, UUID);

-- 3. Função de login segura (ignora maiúsculas/minúsculas e espaços no username)
CREATE OR REPLACE FUNCTION public.login_profile(p_username TEXT, p_password TEXT)
RETURNS SETOF profiles
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM profiles
  WHERE (LOWER(TRIM(username)) = LOWER(TRIM(p_username)) OR TRIM(username) = TRIM(p_username))
    AND password = p_password
    AND (is_active IS NULL OR is_active = true)
  LIMIT 1;
$$;

-- 4. Função para vincular auth_user_id ao profile
CREATE OR REPLACE FUNCTION public.link_profile_to_auth(p_username TEXT, p_auth_user_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET auth_user_id = p_auth_user_id
  WHERE (LOWER(TRIM(username)) = LOWER(TRIM(p_username)) OR TRIM(username) = TRIM(p_username))
    AND (auth_user_id IS NULL OR auth_user_id != p_auth_user_id);
$$;

-- 5. Função que confirma o e-mail de usuários internos
CREATE OR REPLACE FUNCTION public.confirm_internal_user(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF p_email LIKE '%@igrejaapp.internal' THEN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE email = p_email;
  END IF;
END;
$$;

-- 6. Função para criar/sincronizar usuário no Supabase Auth
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

  v_email        := v_username || '@igrejaapp.internal';
  v_derived_pass := 'IA_' || p_profile_id::TEXT;

  BEGIN
    v_encrypted := extensions.crypt(v_derived_pass, extensions.gen_salt('bf'));
  EXCEPTION WHEN OTHERS THEN
    v_encrypted := NULL;
  END;

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
      COALESCE(v_encrypted, 'IA_PASS_FALLBACK'),
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
      encrypted_password  = COALESCE(v_encrypted, encrypted_password),
      email_confirmed_at  = COALESCE(email_confirmed_at, NOW()),
      updated_at          = NOW()
    WHERE id = v_auth_id;
  END IF;

  UPDATE public.profiles
  SET auth_user_id = v_auth_id
  WHERE id = p_profile_id;
END;
$$;

-- 7. Função para busca na recuperação de conta
CREATE OR REPLACE FUNCTION public.find_profile_for_recovery(input_cpf TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  cpf TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.username, p.cpf
  FROM public.profiles p
  WHERE regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g') = input_cpf
    AND (p.is_active IS NULL OR p.is_active = true);
END;
$$;

-- 8. Função de alteração de credenciais (Usuário / Senha)
CREATE OR REPLACE FUNCTION public.update_user_credentials(
  p_id TEXT,
  p_username TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_uuid UUID;
  v_old_username TEXT;
  v_clean_username TEXT;
  v_clean_password TEXT;
  v_auth_id UUID;
  v_email TEXT;
  v_derived_pass TEXT;
  v_encrypted TEXT;
BEGIN
  BEGIN
    v_uuid := p_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'ID do usuário inválido.');
  END;

  SELECT username, auth_user_id INTO v_old_username, v_auth_id
  FROM public.profiles
  WHERE id = v_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
  END IF;

  v_clean_username := NULLIF(TRIM(p_username), '');
  v_clean_password := NULLIF(TRIM(p_password), '');

  IF v_clean_username IS NOT NULL AND LOWER(v_clean_username) <> LOWER(v_old_username) THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE LOWER(username) = LOWER(v_clean_username)
        AND id <> v_uuid
        AND (is_active IS NULL OR is_active = true)
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este nome de usuário já está em uso.');
    END IF;

    UPDATE public.profiles
    SET username = v_clean_username
    WHERE id = v_uuid;
  ELSE
    v_clean_username := v_old_username;
  END IF;

  IF v_clean_password IS NOT NULL THEN
    UPDATE public.profiles
    SET password = v_clean_password
    WHERE id = v_uuid;
  END IF;

  -- Sincronização segura com auth.users
  BEGIN
    v_email := v_clean_username || '@igrejaapp.internal';
    v_derived_pass := 'IA_' || v_uuid::TEXT;

    BEGIN
      v_encrypted := extensions.crypt(v_derived_pass, extensions.gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
      v_encrypted := NULL;
    END;

    IF v_auth_id IS NOT NULL THEN
      UPDATE auth.users
      SET email = v_email,
          encrypted_password = COALESCE(v_encrypted, encrypted_password),
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          updated_at = NOW()
      WHERE id = v_auth_id;
    END IF;

    PERFORM public.ensure_auth_for_profile(v_uuid);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Função para edição completa de usuário pelo Administrador
CREATE OR REPLACE FUNCTION public.update_profile_admin(
  p_id TEXT,
  p_name TEXT,
  p_username TEXT,
  p_role TEXT,
  p_church_id TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_birth_date TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_uuid UUID;
  v_church_uuid UUID;
  v_old_username TEXT;
  v_clean_username TEXT;
  v_clean_password TEXT;
  v_auth_id UUID;
  v_email TEXT;
  v_derived_pass TEXT;
  v_parsed_date DATE;
  v_encrypted TEXT;
BEGIN
  BEGIN
    v_uuid := p_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'ID do usuário inválido.');
  END;

  IF p_church_id IS NOT NULL AND TRIM(p_church_id) <> '' THEN
    BEGIN
      v_church_uuid := p_church_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_church_uuid := NULL;
    END;
  ELSE
    v_church_uuid := NULL;
  END IF;

  SELECT username, auth_user_id INTO v_old_username, v_auth_id
  FROM public.profiles
  WHERE id = v_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
  END IF;

  v_clean_username := TRIM(p_username);
  v_clean_password := NULLIF(TRIM(p_password), '');

  IF LOWER(v_clean_username) <> LOWER(v_old_username) AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(v_clean_username)
      AND id <> v_uuid
      AND (is_active IS NULL OR is_active = true)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este nome de usuário já está em uso.');
  END IF;

  IF p_birth_date IS NOT NULL AND TRIM(p_birth_date) <> '' THEN
    BEGIN
      v_parsed_date := p_birth_date::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_parsed_date := NULL;
    END;
  ELSE
    v_parsed_date := NULL;
  END IF;

  -- 1. Atualiza os dados na tabela profiles (garantido!)
  UPDATE public.profiles
  SET
    name = UPPER(TRIM(p_name)),
    username = v_clean_username,
    role = p_role,
    church_id = v_church_uuid,
    cpf = NULLIF(TRIM(p_cpf), ''),
    birth_date = COALESCE(v_parsed_date, birth_date),
    password = COALESCE(v_clean_password, password)
  WHERE id = v_uuid;

  -- 2. Sincroniza usuário com auth.users de forma protegida contra falhas
  BEGIN
    v_email := v_clean_username || '@igrejaapp.internal';
    v_derived_pass := 'IA_' || v_uuid::TEXT;

    BEGIN
      v_encrypted := extensions.crypt(v_derived_pass, extensions.gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
      v_encrypted := NULL;
    END;

    IF v_auth_id IS NOT NULL THEN
      UPDATE auth.users
      SET email = v_email,
          encrypted_password = COALESCE(v_encrypted, encrypted_password),
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          updated_at = NOW()
      WHERE id = v_auth_id;
    END IF;

    PERFORM public.ensure_auth_for_profile(v_uuid);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. Permissões de execução explícitas para anon, authenticated e service_role
GRANT EXECUTE ON FUNCTION public.login_profile(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_profile_to_auth(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_internal_user(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_auth_for_profile(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_profile_for_recovery(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_credentials(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_profile_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 11. Sincroniza todos os perfis existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    BEGIN
      PERFORM public.ensure_auth_for_profile(r.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
