
-- 1) attendance_locations: restreindre la lecture directe (avec secret) aux admins uniquement
DROP POLICY IF EXISTS "Privileged read locations" ON public.attendance_locations;

-- 2) attendance: politique INSERT pour un agent sur ses propres pointages
DROP POLICY IF EXISTS "Self insert own attendance" ON public.attendance;
CREATE POLICY "Self insert own attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (employee_id = private.current_employee_id());

-- 3) employees: ajouter WITH CHECK à la politique support (le trigger guard_employee_financial_fields
--    empêche déjà la modification des champs sensibles ; on ajoute la clause pour clarifier l'intention).
DROP POLICY IF EXISTS "Support can update employees non-financial" ON public.employees;
CREATE POLICY "Support can update employees non-financial"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  private.has_role(auth.uid(), 'secretaire'::public.app_role)
  OR private.has_role(auth.uid(), 'assistant_direction'::public.app_role)
)
WITH CHECK (
  private.has_role(auth.uid(), 'secretaire'::public.app_role)
  OR private.has_role(auth.uid(), 'assistant_direction'::public.app_role)
);

-- S'assurer que le trigger de garde des champs financiers est actif
DROP TRIGGER IF EXISTS guard_employee_financial_fields_trg ON public.employees;
CREATE TRIGGER guard_employee_financial_fields_trg
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.guard_employee_financial_fields();

-- 4) Simplifier les helpers pour retirer la branche `_user_id = auth.uid() OR admin` inutile.
--    Ces fonctions sont utilisées uniquement dans les politiques RLS avec auth.uid() en paramètre.
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_hr_privileged(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'admin'::public.app_role,
        'rh'::public.app_role,
        'dg'::public.app_role,
        'dga'::public.app_role,
        'manager'::public.app_role,
        'assistant_direction'::public.app_role,
        'secretaire'::public.app_role
      )
  )
$$;

CREATE OR REPLACE FUNCTION private.is_secretary_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'secretaire'::public.app_role)
  )
$$;

-- Conserver l'exécution restreinte (appelées depuis les politiques RLS ; service_role conserve l'accès)
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.is_hr_privileged(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.is_secretary_or_admin(uuid) FROM PUBLIC, anon, authenticated;
