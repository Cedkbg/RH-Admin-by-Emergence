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
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;

  SELECT id INTO matching_employee_id
  FROM public.employees
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

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

  INSERT INTO public.profiles (id, full_name, email, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    assigned_status
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      approval_status = CASE
        WHEN public.profiles.approval_status = 'approved' THEN public.profiles.approval_status
        ELSE EXCLUDED.approval_status
      END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();