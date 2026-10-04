
-- 1. Restrict documents bucket reads
DROP POLICY IF EXISTS "auth view docs storage" ON storage.objects;

-- 2. Prevent listing of the branding bucket via API (public URLs still work)
DROP POLICY IF EXISTS "Public read branding" ON storage.objects;

-- 3. Lock down SECURITY DEFINER helpers from direct execution by signed-in users
REVOKE EXECUTE ON FUNCTION public.auto_approve_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_matricule() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_net_pay() FROM anon, authenticated;
