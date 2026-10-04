
-- Allow authenticated users to write app_settings while company onboarding is not completed yet.
-- Once company_onboarded = true, only admins (existing policy) can modify settings.

CREATE POLICY "Onboarding can write settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.app_settings s
    WHERE s.key = 'company_onboarded'
      AND (s.value = 'true'::jsonb OR s.value = to_jsonb(true))
  )
);

CREATE POLICY "Onboarding can update settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.app_settings s
    WHERE s.key = 'company_onboarded'
      AND (s.value = 'true'::jsonb OR s.value = to_jsonb(true))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.app_settings s
    WHERE s.key = 'company_onboarded'
      AND (s.value = 'true'::jsonb OR s.value = to_jsonb(true))
  )
);
