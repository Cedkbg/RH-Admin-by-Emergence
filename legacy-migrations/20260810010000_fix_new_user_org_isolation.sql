-- ============================================================
-- Isolation stricte des entreprises (tenant) à la création de compte
-- ------------------------------------------------------------
-- Problème : le trigger handle_new_user rattachait automatiquement
-- tout nouvel utilisateur à la première organisation
-- (ORDER BY created_at LIMIT 1) quand aucun employee ne correspondait.
-- Cela provoquait la « fusion » des entreprises : un admin créé pour
-- une nouvelle entreprise pouvait être rattaché à la première entreprise.
--
-- Correctif : le trigger ne rattache plus automatiquement à une
-- organisation. Le rattachement est désormais toujours fait de façon
-- explicite par les edge functions (create-organization via son admin,
-- admin-create-user via l'organisation du créateur).
--
-- Seul cas préservé : si un compte employee correspond par email dans
-- une organisation précise, le nouveau user est rattaché à CETTE
-- organisation (affectation agent → entreprise).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
  assigned_role public.app_role;
  assigned_status text;
  matching_employee_id uuid;
  target_org uuid;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;

  -- Rattachement uniquement si une fiche employee correspond par email
  -- dans une organisation précise. Sinon target_org reste NULL → la
  -- fonction métier (edge function) fera le rattachement explicite.
  SELECT e.id, e.organization_id INTO matching_employee_id, target_org
  FROM public.employees e
  WHERE lower(e.email) = lower(NEW.email)
  LIMIT 1;

  IF user_count = 0 THEN
    assigned_role := 'admin'::public.app_role;
    assigned_status := 'approved';
  ELSIF matching_employee_id IS NOT NULL THEN
    assigned_role := 'employee'::public.app_role;
    assigned_status := 'approved';
  ELSE
    -- Compte en attente : pas d'org, pas de rôle.
    -- L'entreprise sera rattachée par le flux explicite (onboarding / edge function).
    assigned_role := 'employee'::public.app_role;
    assigned_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, approval_status, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    assigned_status,
    target_org
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
      approval_status = CASE
        WHEN public.profiles.approval_status = 'approved' THEN public.profiles.approval_status
        ELSE EXCLUDED.approval_status
      END;

  IF target_org IS NOT NULL THEN
    INSERT INTO public.organization_members (user_id, organization_id)
    VALUES (NEW.id, target_org)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, assigned_role, target_org)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Le trigger reste branché après INSERT sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

