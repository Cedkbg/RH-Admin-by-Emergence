
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  action text NOT NULL CHECK (action IN ('granted','revoked')),
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_audit_target ON public.role_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_performed_at ON public.role_audit_log(performed_at DESC);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view role audit"
ON public.role_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "System insert role audit"
ON public.role_audit_log FOR INSERT TO authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log(target_user_id, role, action, performed_by)
    VALUES (NEW.user_id, NEW.role, 'granted', auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log(target_user_id, role, action, performed_by)
    VALUES (OLD.user_id, OLD.role, 'revoked', auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_role_insert ON public.user_roles;
CREATE TRIGGER trg_log_role_insert
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

DROP TRIGGER IF EXISTS trg_log_role_delete ON public.user_roles;
CREATE TRIGGER trg_log_role_delete
AFTER DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();
