-- ===========================================================
-- CORREÇÃO: member_login agora retorna sede_pastor_phone
-- e sede_pastor_name para o Pedido de Oração funcionar.
--
-- Execute no SQL Editor do Supabase (painel > SQL Editor)
-- ===========================================================

CREATE OR REPLACE FUNCTION public.member_login(
  p_identifier TEXT,
  p_password   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member      RECORD;
  v_church      RECORD;
  v_sede        RECORD;
  v_is_first    BOOLEAN;
BEGIN
  -- 1. Encontrar o membro por CPF (normalizado) ou username customizado
  --    CPF armazenado pode ser '144.444.444-44'; o usuário pode digitar '14444444444'
  --    regexp_replace garante que ambos os formatos funcionem.
  SELECT *
  INTO v_member
  FROM members
  WHERE
    regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_identifier, '[^0-9]', '', 'g')
    OR member_username = p_identifier
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Usuário não encontrado.');
  END IF;

  -- 2. Verificar senha
  --    Se member_password é NULL => primeiro acesso (senha padrão = data de nascimento DDMMAAAA)
  IF v_member.member_password IS NULL THEN
    IF TO_CHAR(v_member.birth_date, 'DDMMYYYY') != p_password THEN
      RETURN jsonb_build_object('error', 'Senha incorreta.');
    END IF;
    v_is_first := TRUE;
  ELSE
    IF v_member.member_password != p_password THEN
      RETURN jsonb_build_object('error', 'Senha incorreta.');
    END IF;
    v_is_first := FALSE;
  END IF;

  -- 3. Buscar a igreja do membro
  SELECT *
  INTO v_church
  FROM churches
  WHERE id = v_member.church_id
  LIMIT 1;

  -- 4. Determinar a SEDE (se for congregação, pegar a igreja pai)
  IF v_church.parent_id IS NOT NULL THEN
    SELECT *
    INTO v_sede
    FROM churches
    WHERE id = v_church.parent_id
    LIMIT 1;
  ELSE
    v_sede := v_church;
  END IF;

  -- 5. Retornar tudo incluindo sede_pastor_phone e sede_pastor_name
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

-- Garantir permissão de execução para usuários anônimos (portal do membro)
GRANT EXECUTE ON FUNCTION public.member_login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.member_login(TEXT, TEXT) TO authenticated;
