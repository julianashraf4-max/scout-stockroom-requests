CREATE TABLE public.invitation_codes (
  code text PRIMARY KEY,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (used_count <= max_uses)
);
GRANT SELECT, DELETE ON public.invitation_codes TO authenticated;
GRANT ALL ON public.invitation_codes TO service_role;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view invitation codes"
ON public.invitation_codes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete invitation codes"
ON public.invitation_codes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_invite_code(_max_uses integer DEFAULT 1)
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
  IF _max_uses IS NULL OR _max_uses < 1 THEN
    RAISE EXCEPTION 'INVALID_MAX_USES';
  END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  INSERT INTO public.invitation_codes (code, created_by, max_uses)
  VALUES (v_code, auth.uid(), _max_uses);
  RETURN v_code;
END;
$$;
REVOKE ALL ON FUNCTION public.create_invite_code(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invite_code(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_invite_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE code = upper(trim(coalesce(_code, '')))
      AND used_count < max_uses
  );
$$;
REVOKE ALL ON FUNCTION public.validate_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon, authenticated;

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
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'member');
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_counts()
RETURNS table(items_count bigint, products_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.items),
    (SELECT count(*) FROM public.products);
$$;
REVOKE ALL ON FUNCTION public.get_public_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_counts() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_request_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_available integer;
BEGIN
  IF TG_OP = 'UPDATE'
    AND new.item_id IS NOT DISTINCT FROM old.item_id
    AND new.quantity IS NOT DISTINCT FROM old.quantity THEN
    RETURN new;
  END IF;
  IF new.quantity IS NULL OR new.quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_REQUEST_QUANTITY';
  END IF;
  SELECT quantity INTO v_available FROM public.items WHERE id = new.item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND';
  END IF;
  IF v_available < new.quantity THEN
    RAISE EXCEPTION 'NOT_ENOUGH_STOCK';
  END IF;
  RETURN new;
END;
$$;
CREATE TRIGGER check_request_stock_before_write
BEFORE INSERT OR UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.check_request_stock();