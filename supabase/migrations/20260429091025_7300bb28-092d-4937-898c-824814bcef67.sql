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
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;

  IF user_count = 0 THEN
    -- Tout premier compte = admin de fondation, auto-approuvé
    assigned_role := 'admin'::public.app_role;
    assigned_status := 'approved';
  ELSE
    -- Tous les autres = agent simple, en attente d'approbation
    assigned_role := 'employee'::public.app_role;
    assigned_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    assigned_status
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;