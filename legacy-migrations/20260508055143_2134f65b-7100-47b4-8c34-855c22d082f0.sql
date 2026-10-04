
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_privileged(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO authenticated, anon;
