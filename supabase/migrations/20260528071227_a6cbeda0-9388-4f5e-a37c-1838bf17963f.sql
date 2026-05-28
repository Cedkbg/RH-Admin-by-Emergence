CREATE TABLE public.absence_justifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  period TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.absence_justifications TO authenticated;
GRANT ALL ON public.absence_justifications TO service_role;

ALTER TABLE public.absence_justifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self view own justifications"
ON public.absence_justifications FOR SELECT TO authenticated
USING (employee_id = private.current_employee_id());

CREATE POLICY "Self insert own justifications"
ON public.absence_justifications FOR INSERT TO authenticated
WITH CHECK (employee_id = private.current_employee_id());

CREATE POLICY "Privileged view justifications"
ON public.absence_justifications FOR SELECT TO authenticated
USING (private.is_hr_privileged(auth.uid()));

CREATE POLICY "Privileged update justifications"
ON public.absence_justifications FOR UPDATE TO authenticated
USING (private.is_hr_privileged(auth.uid()))
WITH CHECK (private.is_hr_privileged(auth.uid()));

CREATE POLICY "Admin all justifications"
ON public.absence_justifications FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_absence_justifications
BEFORE UPDATE ON public.absence_justifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();