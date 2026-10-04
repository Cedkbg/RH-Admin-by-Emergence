
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view task comments" ON public.task_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert own comment if can see task" ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'rh'::app_role)
    OR private.has_role(auth.uid(), 'manager'::app_role)
    OR private.has_role(auth.uid(), 'dg'::app_role)
    OR private.has_role(auth.uid(), 'dga'::app_role)
    OR private.has_role(auth.uid(), 'assistant_direction'::app_role)
    OR private.has_role(auth.uid(), 'secretaire'::app_role)
    OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assignee_id = public.current_employee_id())
  )
);

CREATE POLICY "delete own comment or admin" ON public.task_comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "update own comment" ON public.task_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

-- Allow assignee to update their task status
CREATE POLICY "assignee update own task" ON public.tasks FOR UPDATE TO authenticated
USING (assignee_id = public.current_employee_id())
WITH CHECK (assignee_id = public.current_employee_id());

ALTER TABLE public.task_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
