
-- Storage : autoriser RH + Admin sur bucket branding
DROP POLICY IF EXISTS "Admins upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins update branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete branding" ON storage.objects;

CREATE POLICY "Admins or HR upload branding" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'rh'::public.app_role)));

CREATE POLICY "Admins or HR update branding" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'rh'::public.app_role)))
  WITH CHECK (bucket_id = 'branding' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'rh'::public.app_role)));

CREATE POLICY "Admins or HR delete branding" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'rh'::public.app_role)));

-- app_settings : autoriser RH à mettre à jour / insérer
DROP POLICY IF EXISTS "HR can update settings" ON public.app_settings;
DROP POLICY IF EXISTS "HR can insert settings" ON public.app_settings;

CREATE POLICY "HR can update settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'rh'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'rh'::public.app_role));

CREATE POLICY "HR can insert settings" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'rh'::public.app_role));
