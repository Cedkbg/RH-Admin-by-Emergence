
CREATE TABLE public.agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  report_type text NOT NULL DEFAULT 'journalier',
  period_start date,
  period_end date,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  review_comment text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_reports TO authenticated;
GRANT ALL ON public.agent_reports TO service_role;

ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents read own, staff read all"
ON public.agent_reports FOR SELECT TO authenticated
USING (
  employee_id = public.current_employee_id()
  OR public.is_hr_privileged(auth.uid())
);

CREATE POLICY "Agents insert own reports"
ON public.agent_reports FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND employee_id = public.current_employee_id()
);

CREATE POLICY "Agents update own drafts, staff update all"
ON public.agent_reports FOR UPDATE TO authenticated
USING (
  public.is_hr_privileged(auth.uid())
  OR (employee_id = public.current_employee_id() AND status IN ('draft','submitted'))
)
WITH CHECK (
  public.is_hr_privileged(auth.uid())
  OR (employee_id = public.current_employee_id())
);

CREATE POLICY "Agents delete own, staff delete all"
ON public.agent_reports FOR DELETE TO authenticated
USING (
  public.is_hr_privileged(auth.uid())
  OR employee_id = public.current_employee_id()
);

CREATE TRIGGER agent_reports_updated_at
BEFORE UPDATE ON public.agent_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_agent_reports_employee ON public.agent_reports(employee_id);
CREATE INDEX idx_agent_reports_status ON public.agent_reports(status);
CREATE INDEX idx_agent_reports_created ON public.agent_reports(created_at DESC);
