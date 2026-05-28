CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (
      _user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'::public.app_role
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION private.is_secretary_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (
      _user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'::public.app_role
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN ('admin'::public.app_role, 'secretaire'::public.app_role)
    )
$$;

CREATE OR REPLACE FUNCTION private.is_hr_privileged(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (
      _user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'::public.app_role
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
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

CREATE OR REPLACE FUNCTION private.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id
  FROM public.employees e
  JOIN public.profiles p ON lower(p.email) = lower(e.email)
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.can_access_direction(_user_id uuid, _direction_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'::public.app_role
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'dg'::public.app_role
    )
    OR (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'dga'::public.app_role)
      AND upper(_direction_code) <> 'DG'
    )
    OR EXISTS (
      SELECT 1
      FROM public.direction_executives de
      JOIN public.directions d ON d.id = de.direction_id
      WHERE de.user_id = _user_id AND upper(d.code) = upper(_direction_code)
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.employees e ON lower(e.email) = lower(p.email)
      JOIN public.directions d ON d.id = e.direction_id
      WHERE p.id = _user_id AND upper(d.code) = upper(_direction_code)
    )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_secretary_or_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_hr_privileged(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_direction(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_secretary_or_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_hr_privileged(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_employee_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_direction(uuid, text) TO authenticated, service_role;

DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~ '(has_role|is_hr_privileged|is_secretary_or_admin|current_employee_id)'
        OR COALESCE(with_check, '') ~ '(has_role|is_hr_privileged|is_secretary_or_admin|current_employee_id)'
      )
  LOOP
    new_qual := r.qual;
    new_check := r.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := replace(new_qual, 'public.has_role', 'private.has_role');
      new_qual := replace(new_qual, 'public.is_hr_privileged', 'private.is_hr_privileged');
      new_qual := replace(new_qual, 'public.is_secretary_or_admin', 'private.is_secretary_or_admin');
      new_qual := replace(new_qual, 'public.current_employee_id', 'private.current_employee_id');
      new_qual := regexp_replace(new_qual, '(^|[^[:alnum:]_\.])has_role\s*\(', '\1private.has_role(', 'g');
      new_qual := regexp_replace(new_qual, '(^|[^[:alnum:]_\.])is_hr_privileged\s*\(', '\1private.is_hr_privileged(', 'g');
      new_qual := regexp_replace(new_qual, '(^|[^[:alnum:]_\.])is_secretary_or_admin\s*\(', '\1private.is_secretary_or_admin(', 'g');
      new_qual := regexp_replace(new_qual, '(^|[^[:alnum:]_\.])current_employee_id\s*\(', '\1private.current_employee_id(', 'g');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := replace(new_check, 'public.has_role', 'private.has_role');
      new_check := replace(new_check, 'public.is_hr_privileged', 'private.is_hr_privileged');
      new_check := replace(new_check, 'public.is_secretary_or_admin', 'private.is_secretary_or_admin');
      new_check := replace(new_check, 'public.current_employee_id', 'private.current_employee_id');
      new_check := regexp_replace(new_check, '(^|[^[:alnum:]_\.])has_role\s*\(', '\1private.has_role(', 'g');
      new_check := regexp_replace(new_check, '(^|[^[:alnum:]_\.])is_hr_privileged\s*\(', '\1private.is_hr_privileged(', 'g');
      new_check := regexp_replace(new_check, '(^|[^[:alnum:]_\.])is_secretary_or_admin\s*\(', '\1private.is_secretary_or_admin(', 'g');
      new_check := regexp_replace(new_check, '(^|[^[:alnum:]_\.])current_employee_id\s*\(', '\1private.current_employee_id(', 'g');
    END IF;

    stmt := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF new_qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || new_qual || ')';
    END IF;
    IF new_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || new_check || ')';
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_direction(_user_id uuid, _direction_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT private.can_access_direction(_user_id, _direction_code)
$$;

GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_direction(uuid, text) FROM anon;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_secretary_or_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_hr_privileged(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon, authenticated;