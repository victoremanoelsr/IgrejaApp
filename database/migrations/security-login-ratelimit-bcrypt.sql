-- ============================================================
-- MIGRAÇÃO DE SEGURANÇA: RATE LIMITING & HASH BCRYPT
-- IgrejaApp - Produção
-- ============================================================

-- 1. Garante a extensão de criptografia pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. TABELA DE TENTATIVAS DE LOGIN (RATE LIMITING)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  attempts_count INT NOT NULL DEFAULT 1,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ident ON public.login_attempts(identifier);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. FUNÇÃO: VERIFICAR SE O USUÁRIO/CPF ESTÁ BLOQUEADO
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_login_lockout(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_clean TEXT;
  v_remaining_sec INT;
BEGIN
  v_clean := LOWER(TRIM(regexp_replace(p_identifier, '[^a-zA-Z0-9_.-]', '', 'g')));

  SELECT * INTO v_rec FROM public.login_attempts WHERE identifier = v_clean;

  IF FOUND THEN
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > NOW() THEN
      v_remaining_sec := CEIL(EXTRACT(EPOCH FROM (v_rec.locked_until - NOW())));
      RETURN jsonb_build_object(
        'is_locked', TRUE,
        'remaining_seconds', v_remaining_sec,
        'attempts_left', 0
      );
    END IF;

    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= NOW() THEN
      UPDATE public.login_attempts 
      SET attempts_count = 0, locked_until = NULL 
      WHERE identifier = v_clean;
    END IF;

    RETURN jsonb_build_object(
      'is_locked', FALSE,
      'remaining_seconds', 0,
      'attempts_left', GREATEST(0, 5 - v_rec.attempts_count)
    );
  END IF;

  RETURN jsonb_build_object(
    'is_locked', FALSE,
    'remaining_seconds', 0,
    'attempts_left', 5
  );
END;
$$;

-- ============================================================
-- 4. FUNÇÃO: REGISTRAR TENTATIVA FALHA
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_login_failure(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_rec RECORD;
  v_new_count INT;
BEGIN
  v_clean := LOWER(TRIM(regexp_replace(p_identifier, '[^a-zA-Z0-9_.-]', '', 'g')));

  SELECT * INTO v_rec FROM public.login_attempts WHERE identifier = v_clean;

  IF NOT FOUND THEN
    INSERT INTO public.login_attempts (identifier, attempts_count, last_attempt_at)
    VALUES (v_clean, 1, NOW());
    
    RETURN jsonb_build_object(
      'is_locked', FALSE,
      'remaining_seconds', 0,
      'attempts_left', 4
    );
  END IF;

  IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= NOW() THEN
    v_new_count := 1;
  ELSE
    v_new_count := v_rec.attempts_count + 1;
  END IF;

  IF v_new_count >= 5 THEN
    UPDATE public.login_attempts
    SET attempts_count = v_new_count,
        locked_until = NOW() + INTERVAL '5 minutes',
        last_attempt_at = NOW()
    WHERE identifier = v_clean;

    RETURN jsonb_build_object(
      'is_locked', TRUE,
      'remaining_seconds', 300,
      'attempts_left', 0
    );
  ELSE
    UPDATE public.login_attempts
    SET attempts_count = v_new_count,
        locked_until = NULL,
        last_attempt_at = NOW()
    WHERE identifier = v_clean;

    RETURN jsonb_build_object(
      'is_locked', FALSE,
      'remaining_seconds', 0,
      'attempts_left', GREATEST(0, 5 - v_new_count)
    );
  END IF;
END;
$$;

-- ============================================================
-- 5. FUNÇÃO: RESETAR TENTATIVAS APÓS SUCESSO NO LOGIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.clear_login_lockout(p_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := LOWER(TRIM(regexp_replace(p_identifier, '[^a-zA-Z0-9_.-]', '', 'g')));
  UPDATE public.login_attempts 
  SET attempts_count = 0, locked_until = NULL, last_attempt_at = NOW()
  WHERE identifier = v_clean;
END;
$$;

-- ============================================================
-- 6. LOGIN DE USUÁRIOS/ADMINISTRADORES (login_profile) COM BCRYPT
-- ============================================================
CREATE OR REPLACE FUNCTION public.login_profile(p_username TEXT, p_password TEXT)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_rec profiles%ROWTYPE;
  v_pass_match BOOLEAN := FALSE;
BEGIN
  FOR v_rec IN (
    SELECT * FROM public.profiles
    WHERE (LOWER(TRIM(username)) = LOWER(TRIM(p_username)) OR TRIM(username) = TRIM(p_username))
      AND (is_active IS NULL OR is_active = true)
    LIMIT 1
  ) LOOP
    IF v_rec.password LIKE '$2a$%' OR v_rec.password LIKE '$2b$%' THEN
      IF crypt(p_password, v_rec.password) = v_rec.password THEN
        v_pass_match := TRUE;
      END IF;
    ELSE
      IF v_rec.password = p_password THEN
        v_pass_match := TRUE;
        UPDATE public.profiles
        SET password = crypt(p_password, gen_salt('bf', 10))
        WHERE id = v_rec.id;
      END IF;
    END IF;

    IF v_pass_match THEN
      RETURN NEXT v_rec;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- ============================================================
-- 7. LOGIN DO PORTAL DO MEMBRO (member_login) COM BCRYPT
-- ============================================================
CREATE OR REPLACE FUNCTION public.member_login(
  p_identifier TEXT,
  p_password   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_member       RECORD;
  v_church       RECORD;
  v_sede         RECORD;
  v_is_first     BOOLEAN := FALSE;
  v_pass_valid   BOOLEAN := FALSE;
  v_found_member BOOLEAN := FALSE;
BEGIN
  FOR v_member IN (
    SELECT * FROM members
    WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_identifier, '[^0-9]', '', 'g')
       OR member_username = p_identifier
    LIMIT 1
  ) LOOP
    v_found_member := TRUE;

    IF v_member.member_password IS NULL THEN
      IF TO_CHAR(v_member.birth_date, 'DDMMYYYY') != p_password THEN
        RETURN jsonb_build_object('error', 'Senha incorreta.');
      END IF;
      v_is_first := TRUE;
      v_pass_valid := TRUE;
    ELSE
      IF v_member.member_password LIKE '$2a$%' OR v_member.member_password LIKE '$2b$%' THEN
        IF crypt(p_password, v_member.member_password) = v_member.member_password THEN
          v_pass_valid := TRUE;
        END IF;
      ELSE
        IF v_member.member_password = p_password THEN
          v_pass_valid := TRUE;
          UPDATE public.members
          SET member_password = crypt(p_password, gen_salt('bf', 10))
          WHERE id = v_member.id;
        END IF;
      END IF;

      IF NOT v_pass_valid THEN
        RETURN jsonb_build_object('error', 'Senha incorreta.');
      END IF;
      v_is_first := FALSE;
    END IF;
  END LOOP;

  IF NOT v_found_member THEN
    RETURN jsonb_build_object('error', 'Usuário não encontrado.');
  END IF;

  FOR v_church IN (
    SELECT * FROM churches WHERE id = v_member.church_id LIMIT 1
  ) LOOP
    NULL;
  END LOOP;

  IF v_church.parent_id IS NOT NULL THEN
    FOR v_sede IN (
      SELECT * FROM churches WHERE id = v_church.parent_id LIMIT 1
    ) LOOP
      NULL;
    END LOOP;
  ELSE
    v_sede := v_church;
  END IF;

  RETURN jsonb_build_object(
    'member', jsonb_build_object(
      'id',             v_member.id,
      'church_id',      v_member.church_id,
      'name',           v_member.name,
      'cpf',            v_member.cpf,
      'birth_date',     v_member.birth_date,
      'member_number',  v_member.member_number,
      'is_tither',      v_member.is_tither,
      'baptism_date',   v_member.baptism_date,
      'address',        v_member.address,
      'photo_url',      v_member.photo_url,
      'email',          v_member.email,
      'phone',          v_member.phone,
      'marital_status', v_member.marital_status,
      'status',         v_member.status,
      'is_youth',       v_member.is_youth,
      'is_child',       v_member.is_child,
      'is_lady',        v_member.is_lady,
      'member_username', v_member.member_username
    ),
    'church', jsonb_build_object(
      'id',           v_church.id,
      'name',         v_church.name,
      'active',       v_church.active,
      'pix_key',      v_church.pix_key,
      'logo_url',     v_church.logo_url,
      'pastor_name',  v_church.pastor_name,
      'type',         v_church.type,
      'parent_id',    v_church.parent_id
    ),
    'sede_pastor_phone', v_sede.pastor_phone,
    'sede_pastor_name',  v_sede.pastor_name,
    'is_first_access',   v_is_first
  );
END;
$$;

-- Permissões públicas necessárias
GRANT EXECUTE ON FUNCTION public.check_login_lockout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_failure(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_login_lockout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_profile(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_login(TEXT, TEXT) TO anon, authenticated;
