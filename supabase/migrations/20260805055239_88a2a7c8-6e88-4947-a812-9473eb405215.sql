UPDATE public.profiles p
SET organization_id = m.organization_id
FROM public.organization_members m
WHERE m.user_id = p.id AND p.organization_id IS NULL;