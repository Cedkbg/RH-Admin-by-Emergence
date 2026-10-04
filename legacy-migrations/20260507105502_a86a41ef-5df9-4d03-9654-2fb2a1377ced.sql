
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_access_direction(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_hr_privileged(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_approve_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_matricule() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.compute_net_pay() FROM anon, authenticated, public;
