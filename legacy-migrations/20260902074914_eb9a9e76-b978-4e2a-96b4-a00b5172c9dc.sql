CREATE TABLE public.break_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Kinshasa')::date,
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz,
  postponed_minutes integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT break_sessions_status_check CHECK (status IN ('pending','on_break','postponed','skipped','done')),
  CONSTRAINT break_sessions_unique_day UNIQUE (employee_id, date)
);

GRANT SELECT, INSERT, UPDATE ON public.break_sessions TO authenticated;
GRANT ALL ON public.break_sessions TO service_role;

ALTER TABLE public.break_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage their own break"
ON public.break_sessions FOR ALL TO authenticated
USING (employee_id = public.current_employee_id())
WITH CHECK (employee_id = public.current_employee_id());

CREATE POLICY "HR and leadership read breaks"
ON public.break_sessions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'rh')
  OR public.has_role(auth.uid(), 'dg')
  OR public.has_role(auth.uid(), 'dga')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'assistant_direction')
);

CREATE TRIGGER break_sessions_set_updated_at
BEFORE UPDATE ON public.break_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_break_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT e.organization_id INTO NEW.organization_id FROM public.employees e WHERE e.id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER break_sessions_set_org
BEFORE INSERT ON public.break_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_break_organization();

CREATE INDEX break_sessions_date_idx ON public.break_sessions (date);