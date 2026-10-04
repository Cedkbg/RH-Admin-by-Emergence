
-- Helper function: check if current user has a privileged HR role
CREATE OR REPLACE FUNCTION public.is_hr_privileged(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'rh'::app_role, 'dg'::app_role, 'dga'::app_role, 'manager'::app_role, 'assistant_direction'::app_role, 'secretaire'::app_role)
  )
$$;

-- Helper: get employee_id for current user (via email match on profiles)
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id FROM public.employees e
  JOIN public.profiles p ON lower(p.email) = lower(e.email)
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

-- ============== EMPLOYEES ==============
DROP POLICY IF EXISTS "Authenticated can view employees" ON public.employees;
CREATE POLICY "Privileged view all employees" ON public.employees
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));
CREATE POLICY "Self view own employee" ON public.employees
  FOR SELECT TO authenticated
  USING (id = public.current_employee_id());

-- ============== CANDIDATES ==============
DROP POLICY IF EXISTS "view candidates" ON public.candidates;
CREATE POLICY "Privileged view candidates" ON public.candidates
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));

-- ============== WELLBEING ==============
DROP POLICY IF EXISTS "view wellbeing" ON public.wellbeing_surveys;
CREATE POLICY "Privileged view wellbeing" ON public.wellbeing_surveys
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));
CREATE POLICY "Self view own wellbeing" ON public.wellbeing_surveys
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

-- ============== PERFORMANCE ==============
DROP POLICY IF EXISTS "view perf" ON public.performance_reviews;
CREATE POLICY "Privileged view perf" ON public.performance_reviews
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));
CREATE POLICY "Self view own perf" ON public.performance_reviews
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

-- ============== TALENTS ==============
DROP POLICY IF EXISTS "view talents" ON public.talents;
CREATE POLICY "Privileged view talents" ON public.talents
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));

-- ============== LEAVE REQUESTS ==============
DROP POLICY IF EXISTS "view leaves" ON public.leave_requests;
CREATE POLICY "Privileged view leaves" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));
CREATE POLICY "Self view own leaves" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());
CREATE POLICY "Self insert own leaves" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());

-- ============== ATTENDANCE ==============
DROP POLICY IF EXISTS "view attendance" ON public.attendance;
CREATE POLICY "Privileged view attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));
CREATE POLICY "Self view own attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

-- ============== DOCUMENTS table ==============
DROP POLICY IF EXISTS "view documents" ON public.documents;
CREATE POLICY "Privileged view documents" ON public.documents
  FOR SELECT TO authenticated
  USING (public.is_hr_privileged(auth.uid()));
CREATE POLICY "Self view own documents" ON public.documents
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

-- ============== STORAGE: documents bucket ==============
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "documents bucket select" ON storage.objects;

CREATE POLICY "documents privileged read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_hr_privileged(auth.uid()));

CREATE POLICY "documents own folder read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "documents own folder write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "documents privileged write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_hr_privileged(auth.uid()));
