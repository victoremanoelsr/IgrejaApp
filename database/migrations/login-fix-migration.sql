-- CORREÇÃO DE LOGIN — versão final
-- Execute este script INTEIRO no SQL Editor do Supabase
-- NÃO apaga nem altera nenhum dado existente

-- 1. Função de login segura (bypassa RLS para usuários sem conta no Auth)
CREATE OR REPLACE FUNCTION public.login_profile(p_username TEXT, p_password TEXT)
RETURNS SETOF profiles
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM profiles
  WHERE username = p_username
    AND password = p_password
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.login_profile(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.login_profile(TEXT, TEXT) TO authenticated;

-- 2. Função para vincular auth_user_id ao profile (bypassa RLS)
CREATE OR REPLACE FUNCTION public.link_profile_to_auth(p_username TEXT, p_auth_user_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET auth_user_id = p_auth_user_id
  WHERE username = p_username
    AND (auth_user_id IS NULL OR auth_user_id != p_auth_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.link_profile_to_auth(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.link_profile_to_auth(TEXT, UUID) TO authenticated;

-- 3. Função que confirma o e-mail de usuários internos do sistema
--    Diferente de um trigger, esta função é chamada DIRETAMENTE pelo app
--    SECURITY DEFINER garante que ela roda com permissão de postgres (acesso ao auth.users)
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

GRANT EXECUTE ON FUNCTION public.confirm_internal_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_internal_user(TEXT) TO authenticated;
