
ALTER TABLE public.directions DROP CONSTRAINT IF EXISTS directions_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS directions_org_code_key ON public.directions (organization_id, code) WHERE code IS NOT NULL;

ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_code_key;
