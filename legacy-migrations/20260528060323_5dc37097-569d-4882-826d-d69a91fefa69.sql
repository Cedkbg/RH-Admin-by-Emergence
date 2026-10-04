GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_privileged(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_hr_privileged(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_direction(uuid, text) FROM anon;