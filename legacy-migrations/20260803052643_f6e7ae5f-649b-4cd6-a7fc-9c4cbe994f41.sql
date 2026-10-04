-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  slug text UNIQUE,
  logo_url text,
  address text,
  city text,
  country text,
  phone text,
  email text,
  website text,
  rccm text,
  id_national text,
  tax_number text,
  currency text NOT NULL DEFAULT 'CDF',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2. Helpers (private schema, security definer)
CREATE OR REPLACE FUNCTION private.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION private.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id) $$;

GRANT EXECUTE ON FUNCTION private.current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_platform_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = public
AS $$ SELECT private.current_org_id() $$;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public
AS $$ SELECT private.is_platform_admin(auth.uid()) $$;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 3. Policies on the new tables
DROP POLICY IF EXISTS "org members can view their organization" ON public.organizations;
CREATE POLICY "org members can view their organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = private.current_org_id() OR private.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "org admins can update their organization" ON public.organizations;
CREATE POLICY "org admins can update their organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    private.is_platform_admin(auth.uid())
    OR (id = private.current_org_id() AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'rh'::public.app_role)))
  )
  WITH CHECK (
    private.is_platform_admin(auth.uid())
    OR (id = private.current_org_id() AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'rh'::public.app_role)))
  );

DROP POLICY IF EXISTS "platform admins manage organizations" ON public.organizations;
CREATE POLICY "platform admins manage organizations" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins delete organizations" ON public.organizations;
CREATE POLICY "platform admins delete organizations" ON public.organizations
  FOR DELETE TO authenticated USING (private.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "members visible in same org" ON public.organization_members;
CREATE POLICY "members visible in same org" ON public.organization_members
  FOR SELECT TO authenticated
  USING (organization_id = private.current_org_id() OR private.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins view" ON public.platform_admins;
CREATE POLICY "platform admins view" ON public.platform_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_platform_admin(auth.uid()));

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Seed default organization + membership + platform admin
DO $seed$
DECLARE
  default_org uuid;
  principal uuid;
  t text;
  tables text[] := ARRAY[
    'absence_justifications','agent_reports','announcements','appointments','assistant_records',
    'attendance','attendance_locations','audit_logs','candidates','contacts','departments',
    'direction_executives','directions','documents','employees','job_offers','leave_requests',
    'legal_records','mail_register','meeting_minutes','notifications','payroll',
    'performance_review_comments','performance_reviews','role_audit_log','talent_rewards','talents',
    'task_chat_messages','task_comments','tasks','trainings','wellbeing_surveys','profiles','user_roles'
  ];
BEGIN
  SELECT id INTO default_org FROM public.organizations WHERE slug = 'emergence-drc';
  IF default_org IS NULL THEN
    INSERT INTO public.organizations (name, legal_name, slug, country, currency)
    VALUES ('Emergence DRC', 'Emergence DRC', 'emergence-drc', 'RD Congo', 'CDF')
    RETURNING id INTO default_org;
  END IF;

  INSERT INTO public.organization_members (user_id, organization_id)
  SELECT p.id, default_org FROM public.profiles p
  ON CONFLICT (user_id) DO NOTHING;

  principal := public.principal_admin_id();
  IF principal IS NOT NULL THEN
    INSERT INTO public.platform_admins (user_id) VALUES (principal) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.platform_admins (user_id)
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role
    ON CONFLICT DO NOTHING;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', t, default_org);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET DEFAULT private.current_org_id()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)', 'idx_' || t || '_org', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON public.%I AS RESTRICTIVE TO authenticated '
      || 'USING (organization_id IS NOT DISTINCT FROM private.current_org_id() OR private.is_platform_admin(auth.uid())) '
      || 'WITH CHECK (organization_id IS NOT DISTINCT FROM private.current_org_id() OR private.is_platform_admin(auth.uid()))',
      t);
  END LOOP;
END
$seed$;