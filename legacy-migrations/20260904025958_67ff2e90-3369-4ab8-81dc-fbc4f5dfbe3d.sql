GRANT SELECT, INSERT, UPDATE, DELETE ON public.break_sessions TO authenticated;
GRANT ALL ON public.break_sessions TO service_role;

DROP POLICY IF EXISTS "Agents manage their own break" ON public.break_sessions;
DROP POLICY IF EXISTS "HR and leadership read breaks" ON public.break_sessions;

CREATE POLICY "Agents manage their own break"
ON public.break_sessions FOR ALL TO authenticated
USING (employee_id = private.current_employee_id())
WITH CHECK (employee_id = private.current_employee_id());

CREATE POLICY "HR and leadership read breaks"
ON public.break_sessions FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'rh'::app_role)
  OR private.has_role(auth.uid(), 'dg'::app_role)
  OR private.has_role(auth.uid(), 'dga'::app_role)
  OR private.has_role(auth.uid(), 'manager'::app_role)
  OR private.has_role(auth.uid(), 'assistant_direction'::app_role)
);