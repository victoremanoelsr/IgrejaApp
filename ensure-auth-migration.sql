-- MIGRAÇÃO: ensure_auth_for_profile
-- Execute este script no SQL Editor do Supabase
-- Caminho: https://supabase.com → seu projeto → SQL Editor → New Query
-- NÃO apaga nem altera nenhum dado existente

-- Habilita extensão pgcrypto (necessária para bcrypt de senha)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função principal: cria ou corrige o usuário Auth para um perfil existente
-- Chamada pelo app ao criar usuários e durante o fluxo de login de fallback
CREATE OR REPLACE FUNCTION public.ensure_auth_for_profile(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_username    TEXT;
  v_email       TEXT;
  v_derived_pass TEXT;
  v_auth_id     UUID;
BEGIN
  -- Busca username do perfil
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_profile_id;

  IF v_username IS NULL THEN
    RETURN; -- perfil não encontrado, sai silenciosamente
  END IF;

  v_email        := v_username || '@igrejaapp.internal';
  v_derived_pass := 'IA_' || p_profile_id::TEXT;

  -- Verifica se já existe usuário Auth com esse e-mail
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    -- Cria novo usuário Auth com senha derivada (bcrypt)
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
      crypt(v_derived_pass, gen_salt('bf')),
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
    -- Atualiza senha derivada e confirma e-mail se necessário
    UPDATE auth.users
    SET
      encrypted_password  = crypt(v_derived_pass, gen_salt('bf')),
      email_confirmed_at  = COALESCE(email_confirmed_at, NOW()),
      updated_at          = NOW()
    WHERE id = v_auth_id;
  END IF;

  -- Vincula auth_user_id ao perfil (garante que RLS funcione após login)
  UPDATE public.profiles
  SET auth_user_id = v_auth_id
  WHERE id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_auth_for_profile(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_auth_for_profile(UUID) TO authenticated;

-- Aplica a função em todos os perfis existentes que ainda não têm auth_user_id
-- (corrige usuários criados antes desta migração)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    BEGIN
      PERFORM public.ensure_auth_for_profile(r.id);
    EXCEPTION WHEN OTHERS THEN
      -- ignora erros individuais, continua com os demais
      NULL;
    END;
  END LOOP;
END;
$$;
