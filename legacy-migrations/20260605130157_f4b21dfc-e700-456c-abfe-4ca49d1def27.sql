
-- Fix 1: performance_review_comments — restrict SELECT
DROP POLICY IF EXISTS "Authenticated can read perf comments" ON public.performance_review_comments;
DROP POLICY IF EXISTS "perf_comments_select" ON public.performance_review_comments;
DROP POLICY IF EXISTS "Anyone authenticated can read performance review comments" ON public.performance_review_comments;

CREATE POLICY "perf_comments_select_scoped"
ON public.performance_review_comments
FOR SELECT
TO authenticated
USING (
  private.is_hr_privileged(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = performance_review_comments.review_id
      AND pr.employee_id = private.current_employee_id()
  )
  OR author_id = auth.uid()
);

-- Fix 2: agent_reports — qualify function calls with private schema
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agent_reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.agent_reports', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "agent_reports_select"
ON public.agent_reports
FOR SELECT
TO authenticated
USING (
  private.is_hr_privileged(auth.uid())
  OR author_id = auth.uid()
  OR employee_id = private.current_employee_id()
);

CREATE POLICY "agent_reports_insert"
ON public.agent_reports
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
);

CREATE POLICY "agent_reports_update"
ON public.agent_reports
FOR UPDATE
TO authenticated
USING (
  private.is_hr_privileged(auth.uid())
  OR author_id = auth.uid()
)
WITH CHECK (
  private.is_hr_privileged(auth.uid())
  OR author_id = auth.uid()
);

CREATE POLICY "agent_reports_delete"
ON public.agent_reports
FOR DELETE
TO authenticated
USING (
  private.is_hr_privileged(auth.uid())
  OR author_id = auth.uid()
);
