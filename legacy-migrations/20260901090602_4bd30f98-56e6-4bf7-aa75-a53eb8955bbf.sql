-- 1) HR must not be able to write the principal admin designation
DROP POLICY IF EXISTS "HR can insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "HR can update settings" ON public.app_settings;

CREATE POLICY "HR can insert settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'rh'::app_role) AND key <> 'principal_admin_id');

CREATE POLICY "HR can update settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'rh'::app_role) AND key <> 'principal_admin_id')
WITH CHECK (private.has_role(auth.uid(), 'rh'::app_role) AND key <> 'principal_admin_id');

-- 2) Appointments must not be readable by every authenticated member
DROP POLICY IF EXISTS "view appointments" ON public.appointments;

CREATE POLICY "view appointments"
ON public.appointments FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR private.is_secretary_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'dg'::app_role)
  OR private.has_role(auth.uid(), 'dga'::app_role)
  OR private.has_role(auth.uid(), 'rh'::app_role)
  OR private.has_role(auth.uid(), 'manager'::app_role)
  OR private.has_role(auth.uid(), 'assistant_direction'::app_role)
  OR (
    attendees IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.email IS NOT NULL
        AND position(lower(p.email) in lower(appointments.attendees)) > 0
    )
  )
);