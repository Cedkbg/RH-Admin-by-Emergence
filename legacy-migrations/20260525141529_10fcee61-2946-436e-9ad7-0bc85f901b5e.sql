
CREATE OR REPLACE FUNCTION public.revoke_roles_on_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'rejected' AND COALESCE(OLD.approval_status, '') <> 'rejected' THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_roles_on_rejection ON public.profiles;
CREATE TRIGGER trg_revoke_roles_on_rejection
AFTER UPDATE OF approval_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.revoke_roles_on_rejection();

REVOKE EXECUTE ON FUNCTION public.revoke_roles_on_rejection() FROM PUBLIC, anon;
