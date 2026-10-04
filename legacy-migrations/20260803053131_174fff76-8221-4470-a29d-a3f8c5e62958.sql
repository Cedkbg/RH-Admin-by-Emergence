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

  SELECT id, organization_id INTO matching_employee_id, target_org
  FROM public.employees
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  IF target_org IS NULL AND user_count = 0 THEN
    SELECT id INTO target_org FROM public.organizations ORDER BY created_at LIMIT 1;
  END IF;

  IF user_count = 0 THEN
    assigned_role := 'admin'::public.app_role;
    assigned_status := 'approved';
  ELSIF matching_employee_id IS NOT NULL THEN
    assigned_role := 'employee'::public.app_role;
    assigned_status := 'approved';
  ELSE
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