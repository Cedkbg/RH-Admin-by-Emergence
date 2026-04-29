CREATE TABLE IF NOT EXISTS public.direction_executives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  direction_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, direction_id, role)
);

ALTER TABLE public.direction_executives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage direction executives" ON public.direction_executives;
CREATE POLICY "Admins manage direction executives"
ON public.direction_executives FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users view their executive assignments" ON public.direction_executives;
CREATE POLICY "Users view their executive assignments"
ON public.direction_executives FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.can_access_direction(_user_id uuid, _direction_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
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
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO authenticated;
