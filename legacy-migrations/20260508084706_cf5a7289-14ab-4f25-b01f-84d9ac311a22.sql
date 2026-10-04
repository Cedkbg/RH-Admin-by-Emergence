CREATE POLICY "HR privileged manage payroll"
ON public.payroll
FOR ALL
TO authenticated
USING (public.is_hr_privileged(auth.uid()))
WITH CHECK (public.is_hr_privileged(auth.uid()));