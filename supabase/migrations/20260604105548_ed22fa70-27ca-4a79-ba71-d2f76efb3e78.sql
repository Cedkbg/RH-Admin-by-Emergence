CREATE TABLE public.task_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_chat_messages TO authenticated;
GRANT ALL ON public.task_chat_messages TO service_role;

ALTER TABLE public.task_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read chat"
  ON public.task_chat_messages FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can post"
  ON public.task_chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author can delete own"
  ON public.task_chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX task_chat_messages_created_at_idx ON public.task_chat_messages (created_at DESC);

ALTER TABLE public.task_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_chat_messages;