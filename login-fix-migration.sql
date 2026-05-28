-- CORREÇÃO DE LOGIN COMPLETA
-- Execute este script INTEIRO no SQL Editor do Supabase
-- Ele NÃO apaga nem altera nenhum dado existente

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
--    Chamada após o signUp para garantir o vínculo mesmo sem sessão ativa
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

-- 3. Trigger que auto-confirma e-mails do domínio interno (@igrejaapp.internal)
--    Sem isso, o Supabase exige confirmação de e-mail antes de liberar o login
CREATE OR REPLACE FUNCTION public.auto_confirm_internal_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF NEW.email LIKE '%@igrejaapp.internal' THEN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_internal ON auth.users;
CREATE TRIGGER trg_auto_confirm_internal
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_internal_email();
