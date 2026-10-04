
-- 1) Remove sensitive tables from supabase_realtime publication to stop broadcasting full row payloads to all authenticated subscribers.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['payroll','employees','candidates','attendance','leave_requests','job_offers','trainings'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN
      -- table not in publication, ignore
      NULL;
    END;
  END LOOP;
END $$;

-- 2) Tighten onboarding write policies on app_settings to admin-only.
DROP POLICY IF EXISTS "Onboarding can write settings" ON public.app_settings;
DROP POLICY IF EXISTS "Onboarding can update settings" ON public.app_settings;

-- Admin-only insert (the bootstrap admin is created by the complete-onboarding edge function using the service role, which bypasses RLS).
CREATE POLICY "Admin insert settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin update settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
