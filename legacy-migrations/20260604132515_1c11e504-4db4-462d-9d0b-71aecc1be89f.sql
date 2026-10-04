CREATE TABLE public.performance_review_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.performance_review_comments TO authenticated;
GRANT ALL ON public.performance_review_comments TO service_role;

ALTER TABLE public.performance_review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read perf comments"
  ON public.performance_review_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can post perf comments"
  ON public.performance_review_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author or admin can delete perf comments"
  ON public.performance_review_comments FOR DELETE
  TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX perf_review_comments_review_id_idx ON public.performance_review_comments(review_id, created_at);

ALTER TABLE public.performance_review_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_review_comments;