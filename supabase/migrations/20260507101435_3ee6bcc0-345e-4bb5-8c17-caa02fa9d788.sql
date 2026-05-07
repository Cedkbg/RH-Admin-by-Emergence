CREATE POLICY "Self view own payroll"
ON public.payroll
FOR SELECT
TO authenticated
USING (employee_id = current_employee_id());