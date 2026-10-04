-- Permettre à un agent d'accéder à la page de SA direction (rattachement via email employee↔profile).
-- Les autres directions restent fermées.
CREATE OR REPLACE FUNCTION public.can_access_direction(_user_id uuid, _direction_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Admin : accès total
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'::public.app_role
    )
    -- DG : accès total
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'dg'::public.app_role
    )
    -- DGA : accès partout sauf DG
    OR (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'dga'::public.app_role)
      AND upper(_direction_code) <> 'DG'
    )
    -- Cabinet (manager / assistant_direction / secretaire) explicitement assigné à cette direction
    OR EXISTS (
      SELECT 1
      FROM public.direction_executives de
      JOIN public.directions d ON d.id = de.direction_id
      WHERE de.user_id = _user_id AND upper(d.code) = upper(_direction_code)
    )
    -- Agent : si son fiche employee (liée par email au profil) est rattachée à cette direction
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.employees e ON lower(e.email) = lower(p.email)
      JOIN public.directions d ON d.id = e.direction_id
      WHERE p.id = _user_id AND upper(d.code) = upper(_direction_code)
    );
$function$;