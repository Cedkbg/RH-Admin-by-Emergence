ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.app_settings SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'emergence-drc')
WHERE organization_id IS NULL;

ALTER TABLE public.app_settings ALTER COLUMN organization_id SET DEFAULT private.current_org_id();

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey CASCADE;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (organization_id, key);

CREATE INDEX IF NOT EXISTS idx_app_settings_org ON public.app_settings (organization_id);

DROP POLICY IF EXISTS "tenant_isolation" ON public.app_settings;
CREATE POLICY "tenant_isolation" ON public.app_settings AS RESTRICTIVE TO authenticated
  USING (organization_id IS NOT DISTINCT FROM private.current_org_id() OR private.is_platform_admin(auth.uid()))
  WITH CHECK (organization_id IS NOT DISTINCT FROM private.current_org_id() OR private.is_platform_admin(auth.uid()));