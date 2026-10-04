GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_hr_privileged(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_secretary_or_admin(uuid) TO authenticated;