ALTER TABLE public.invitation_codes ADD CONSTRAINT invitation_codes_single_use CHECK (max_uses = 1);
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
  IF _max_uses IS NULL OR _max_uses <> 1 THEN
    RAISE EXCEPTION 'INVALID_MAX_USES';
  END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  INSERT INTO public.invitation_codes (code, created_by, max_uses)
  VALUES (v_code, auth.uid(), 1);
  RETURN v_code;
END;
$$;