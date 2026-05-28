-- Révoque EXECUTE des fonctions SECURITY DEFINER aux clients PostgREST.
-- Elles restent appelées par les policies RLS (qui s'exécutent avec des privilèges
-- élevés) et par les edge functions via service_role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_hr_privileged(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_direction(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_hr_privileged(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO service_role;