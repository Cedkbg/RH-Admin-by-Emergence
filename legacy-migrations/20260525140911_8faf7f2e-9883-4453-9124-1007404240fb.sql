
-- 1) contacts: restrict SELECT
DROP POLICY IF EXISTS "view contacts" ON public.contacts;
CREATE POLICY "Privileged view contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'secretaire'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
    OR public.has_role(auth.uid(), 'dg'::public.app_role)
    OR public.has_role(auth.uid(), 'dga'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
  );

-- 2) assistant_records: restrict SELECT
DROP POLICY IF EXISTS "view assistant records" ON public.assistant_records;
CREATE POLICY "Privileged view assistant records" ON public.assistant_records
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
    OR public.has_role(auth.uid(), 'secretaire'::public.app_role)
    OR public.has_role(auth.uid(), 'dg'::public.app_role)
    OR public.has_role(auth.uid(), 'dga'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- 3) legal_records: restrict SELECT
DROP POLICY IF EXISTS "view legal" ON public.legal_records;
CREATE POLICY "Privileged view legal" ON public.legal_records
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
    OR public.has_role(auth.uid(), 'dg'::public.app_role)
    OR public.has_role(auth.uid(), 'dga'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
  );

-- 4) mail_register: restrict SELECT
DROP POLICY IF EXISTS "view mail" ON public.mail_register;
CREATE POLICY "Privileged view mail" ON public.mail_register
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'secretaire'::public.app_role)
    OR public.has_role(auth.uid(), 'dg'::public.app_role)
    OR public.has_role(auth.uid(), 'dga'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
  );

-- 5) meeting_minutes: restrict SELECT
DROP POLICY IF EXISTS "view minutes" ON public.meeting_minutes;
CREATE POLICY "Privileged view minutes" ON public.meeting_minutes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'secretaire'::public.app_role)
    OR public.has_role(auth.uid(), 'dg'::public.app_role)
    OR public.has_role(auth.uid(), 'dga'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
  );

-- 6) employees: prevent secretaire from updating salary/compensation fields
DROP POLICY IF EXISTS "Chiefs can update employees" ON public.employees;

CREATE POLICY "Privileged can update employees" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
    OR public.has_role(auth.uid(), 'dg'::public.app_role)
    OR public.has_role(auth.uid(), 'dga'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- Trigger to block secretaire/assistant_direction from changing financial fields
CREATE OR REPLACE FUNCTION public.guard_employee_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'rh'::public.app_role)
     OR public.has_role(auth.uid(), 'dg'::public.app_role)
     OR public.has_role(auth.uid(), 'dga'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.base_salary IS DISTINCT FROM OLD.base_salary
     OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
     OR NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
    RAISE EXCEPTION 'Permission refusée: champs financiers/sensibles réservés à admin/RH/DG/DGA';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_employee_financial_fields ON public.employees;
CREATE TRIGGER trg_guard_employee_financial_fields
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.guard_employee_financial_fields();

-- Re-create a separate update policy that still lets secretaire/assistant update non-financial fields
CREATE POLICY "Support can update employees non-financial" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'secretaire'::public.app_role)
    OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
  );

-- 7) audit_logs: restrict insertable actions
DROP POLICY IF EXISTS "user insert own audit" ON public.audit_logs;
CREATE POLICY "user insert own audit" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND action IN ('login','logout','view','export','download','print','attendance_scan')
  );

-- 8) documents storage bucket: explicit UPDATE policy
DROP POLICY IF EXISTS "Admins/HR can update documents bucket" ON storage.objects;
CREATE POLICY "Admins/HR can update documents bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  );

-- 9) Restrict EXECUTE on SECURITY DEFINER functions to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hr_privileged(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_direction(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_net_pay() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_matricule() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_approve_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_employee_financial_fields() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_privileged(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
