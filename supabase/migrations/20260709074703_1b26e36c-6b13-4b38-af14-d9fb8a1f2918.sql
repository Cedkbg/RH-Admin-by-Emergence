-- Store the principal admin explicitly so future changes do not demote it by accident.
INSERT INTO public.app_settings (key, value)
VALUES ('principal_admin_id', to_jsonb('0f106f09-b4ea-43e9-9671-cddf96b9ebf7'::text))
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.principal_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NULLIF(value #>> '{}', '')::uuid
  FROM public.app_settings
  WHERE key = 'principal_admin_id'
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.principal_admin_id() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_last_admin_role_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining_admins int;
  locked_admin_id uuid;
BEGIN
  IF OLD.role = 'admin'::public.app_role THEN
    locked_admin_id := public.principal_admin_id();

    IF locked_admin_id IS NOT NULL AND OLD.user_id = locked_admin_id THEN
      RAISE EXCEPTION 'Impossible de retirer le rôle administrateur du compte principal.';
    END IF;

    SELECT count(*)
      INTO remaining_admins
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role
      AND user_id <> OLD.user_id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Impossible de retirer le dernier administrateur principal.';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_role_removal() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_last_admin_profile_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_is_admin boolean;
  other_admins int;
  locked_admin_id uuid;
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NEW.approval_status IN ('rejected', 'pending') THEN
    locked_admin_id := public.principal_admin_id();

    IF locked_admin_id IS NOT NULL AND OLD.id = locked_admin_id THEN
      RAISE EXCEPTION 'Impossible de désactiver le compte administrateur principal.';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = OLD.id
        AND role = 'admin'::public.app_role
    ) INTO target_is_admin;

    IF target_is_admin THEN
      SELECT count(*)
        INTO other_admins
      FROM public.user_roles
      JOIN public.profiles ON profiles.id = user_roles.user_id
      WHERE user_roles.role = 'admin'::public.app_role
        AND user_roles.user_id <> OLD.id
        AND profiles.approval_status = 'approved';

      IF other_admins = 0 THEN
        RAISE EXCEPTION 'Impossible de désactiver le dernier administrateur principal.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_profile_rejection() FROM PUBLIC, anon, authenticated;

-- Make sure the principal admin is currently approved and has admin rights.
INSERT INTO public.user_roles (user_id, role)
VALUES ('0f106f09-b4ea-43e9-9671-cddf96b9ebf7'::uuid, 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET approval_status = 'approved'
WHERE id = '0f106f09-b4ea-43e9-9671-cddf96b9ebf7'::uuid;