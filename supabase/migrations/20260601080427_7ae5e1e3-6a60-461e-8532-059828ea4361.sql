
-- 1) Colonnes additionnelles sur leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS review_comment text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 2) Permettre RH / secretaire / assistant_direction de valider
DROP POLICY IF EXISTS "Validators update leaves" ON public.leave_requests;
CREATE POLICY "Validators update leaves"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (
  private.has_role(auth.uid(), 'rh'::public.app_role)
  OR private.has_role(auth.uid(), 'secretaire'::public.app_role)
  OR private.has_role(auth.uid(), 'assistant_direction'::public.app_role)
)
WITH CHECK (
  private.has_role(auth.uid(), 'rh'::public.app_role)
  OR private.has_role(auth.uid(), 'secretaire'::public.app_role)
  OR private.has_role(auth.uid(), 'assistant_direction'::public.app_role)
);

-- 3) Table de notifications personnelles
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  category text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manage notifications" ON public.notifications;
CREATE POLICY "Admin manage notifications"
ON public.notifications FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Trigger: notifier les validateurs à la création d'une demande
CREATE OR REPLACE FUNCTION public.notify_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_name text;
BEGIN
  SELECT (first_name || ' ' || last_name) INTO emp_name
  FROM public.employees WHERE id = NEW.employee_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, link, category)
    SELECT ur.user_id,
           'Nouvelle demande de congé',
           COALESCE(emp_name, 'Un agent') || ' a soumis une demande de congé (' || NEW.leave_type || ').',
           '/validation-conges',
           'leave'
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','rh','secretaire','assistant_direction');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, link, category)
    SELECT p.id,
           CASE WHEN NEW.status = 'approved' THEN 'Congé approuvé ✅'
                WHEN NEW.status = 'rejected' THEN 'Congé refusé ❌'
                ELSE 'Mise à jour de votre congé' END,
           COALESCE(NEW.review_comment, 'Votre demande a été traitée.'),
           '/mes-conges',
           'leave'
    FROM public.employees e
    JOIN public.profiles p ON lower(p.email) = lower(e.email)
    WHERE e.id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_leave_request_ins ON public.leave_requests;
CREATE TRIGGER trg_notify_leave_request_ins
AFTER INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_leave_request();

DROP TRIGGER IF EXISTS trg_notify_leave_request_upd ON public.leave_requests;
CREATE TRIGGER trg_notify_leave_request_upd
AFTER UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_leave_request();

-- 5) Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
