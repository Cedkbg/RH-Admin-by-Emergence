REVOKE EXECUTE ON FUNCTION public.auto_approve_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_matricule() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_net_pay() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_employee_financial_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_roles_on_rejection() FROM PUBLIC, anon, authenticated;