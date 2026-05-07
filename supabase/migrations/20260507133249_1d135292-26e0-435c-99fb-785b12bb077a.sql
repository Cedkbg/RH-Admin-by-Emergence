
DROP POLICY IF EXISTS "System insert role audit" ON public.role_audit_log;

REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM PUBLIC, anon, authenticated;
