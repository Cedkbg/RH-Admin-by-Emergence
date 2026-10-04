REVOKE EXECUTE ON FUNCTION public.compute_net_pay() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_matricule() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_direction(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) TO authenticated;