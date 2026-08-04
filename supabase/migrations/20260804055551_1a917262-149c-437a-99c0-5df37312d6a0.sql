CREATE OR REPLACE FUNCTION private.can_access_direction(_user_id uuid, _direction_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role IN ('admin'::public.app_role, 'dg'::public.app_role, 'rh'::public.app_role)
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
$function$;