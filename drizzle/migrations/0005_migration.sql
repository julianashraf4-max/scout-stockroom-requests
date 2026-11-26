ALTER TABLE public.invitation_codes
ADD COLUMN role public.app_role NOT NULL DEFAULT 'member';

CREATE OR REPLACE FUNCTION public.create_role_invite_code(_role public.app_role)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  INSERT INTO public.invitation_codes (code, created_by, max_uses, role)
  VALUES (v_code, auth.uid(), 1, _role);
  RETURN v_code;
END;
$$;
REVOKE ALL ON FUNCTION public.create_role_invite_code(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_role_invite_code(public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_invite public.invitation_codes%rowtype;
BEGIN
  SELECT * INTO v_invite
  FROM public.invitation_codes
  WHERE code = upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')))
    AND used_count < max_uses
  FOR UPDATE;
  IF v_invite.code IS NULL THEN
    RAISE EXCEPTION 'INVALID_INVITE_CODE';
  END IF;
  UPDATE public.invitation_codes
  SET used_count = used_count + 1
  WHERE code = v_invite.code;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, v_invite.role);
  END IF;
  RETURN new;
END;
$$;