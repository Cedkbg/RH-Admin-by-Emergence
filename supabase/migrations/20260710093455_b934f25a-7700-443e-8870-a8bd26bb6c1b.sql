-- Tighten SELECT on public.app_settings: hide sensitive keys from non-privileged users
DROP POLICY IF EXISTS "view settings" ON public.app_settings;

CREATE POLICY "view non-sensitive settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (key NOT IN ('principal_admin_id'));

CREATE POLICY "admin or hr view all settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.has_role(auth.uid(), 'rh'::public.app_role)
);