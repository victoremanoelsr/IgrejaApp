-- CORREÇÃO DE LOGIN: Função segura para autenticar usuários via tabela profiles
-- Execute este script UMA VEZ no SQL Editor do Supabase
-- Isso corrige o erro "Usuário ou senha incorretos" para usuários criados sem conta no Auth

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
