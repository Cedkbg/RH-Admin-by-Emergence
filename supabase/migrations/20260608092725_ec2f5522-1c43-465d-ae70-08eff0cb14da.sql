DROP POLICY IF EXISTS "Authenticated can post perf comments" ON public.performance_review_comments;

CREATE POLICY "Scoped insert perf comments"
ON public.performance_review_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND (
    private.is_hr_privileged(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.performance_reviews pr
      WHERE pr.id = review_id
        AND pr.employee_id = private.current_employee_id()
    )
  )
);