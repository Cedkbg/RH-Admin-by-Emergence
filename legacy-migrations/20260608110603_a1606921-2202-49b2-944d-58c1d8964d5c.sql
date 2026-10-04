
DROP POLICY IF EXISTS "Author can delete own" ON public.task_chat_messages;
CREATE POLICY "Author can delete own" ON public.task_chat_messages
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Author or admin can delete perf comments" ON public.performance_review_comments;
CREATE POLICY "Author or admin can delete perf comments" ON public.performance_review_comments
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin delete audit" ON public.audit_logs;
CREATE POLICY "admin delete audit" ON public.audit_logs
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
