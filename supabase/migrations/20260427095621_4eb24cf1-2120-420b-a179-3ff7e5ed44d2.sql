DROP POLICY IF EXISTS "admin insert audit" ON public.audit_logs;
CREATE POLICY "user insert own audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());