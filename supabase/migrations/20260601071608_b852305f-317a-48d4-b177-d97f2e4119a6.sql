DELETE FROM public.user_roles
WHERE role IN ('admin'::app_role, 'secretaire'::app_role)
  AND user_id IN (
    SELECT id FROM public.profiles
    WHERE lower(email) IN ('kalbydarryl@gmail.com', 'priscilla.amisi@emergencerdc.com')
  );