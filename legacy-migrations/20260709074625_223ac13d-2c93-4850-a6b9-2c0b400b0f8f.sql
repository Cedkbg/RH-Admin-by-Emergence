-- Protect the principal administrator from accidental demotion.
-- This keeps at least one admin in the system at all times.

CREATE OR REPLACE FUNCTION public.prevent_last_admin_role_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining_admins int;
BEGIN
  IF OLD.role = 'admin'::public.app_role THEN
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

DROP TRIGGER IF EXISTS trg_prevent_last_admin_role_removal ON public.user_roles;
CREATE TRIGGER trg_prevent_last_admin_role_removal
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_admin_role_removal();

CREATE OR REPLACE FUNCTION public.prevent_last_admin_profile_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_is_admin boolean;
  other_admins int;
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NEW.approval_status IN ('rejected', 'pending') THEN
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

DROP TRIGGER IF EXISTS trg_prevent_last_admin_profile_rejection ON public.profiles;
CREATE TRIGGER trg_prevent_last_admin_profile_rejection
BEFORE UPDATE OF approval_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_admin_profile_rejection();

-- Restore/confirm the known principal admin account currently used by the organisation.
INSERT INTO public.user_roles (user_id, role)
VALUES ('0f106f09-b4ea-43e9-9671-cddf96b9ebf7'::uuid, 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET approval_status = 'approved'
WHERE id = '0f106f09-b4ea-43e9-9671-cddf96b9ebf7'::uuid;