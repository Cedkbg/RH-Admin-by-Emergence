-- Reset complet des utilisateurs pour repartir à zéro
DELETE FROM public.user_roles;
DELETE FROM public.direction_executives;
DELETE FROM public.profiles;
DELETE FROM auth.users;
DELETE FROM public.app_settings WHERE key = 'company_onboarded';