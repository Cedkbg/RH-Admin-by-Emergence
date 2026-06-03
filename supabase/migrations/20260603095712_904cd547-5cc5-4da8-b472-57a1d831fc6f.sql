CREATE TABLE public.talent_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  reward_type text NOT NULL DEFAULT 'recognition',
  title text NOT NULL,
  description text,
  amount numeric,
  awarded_at date NOT NULL DEFAULT CURRENT_DATE,
  awarded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_rewards TO authenticated;
GRANT ALL ON public.talent_rewards TO service_role;

ALTER TABLE public.talent_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Privileged view rewards" ON public.talent_rewards
  FOR SELECT TO authenticated
  USING (private.is_hr_privileged(auth.uid()));

CREATE POLICY "Self view own rewards" ON public.talent_rewards
  FOR SELECT TO authenticated
  USING (employee_id = private.current_employee_id());

CREATE POLICY "HR manage rewards" ON public.talent_rewards
  FOR ALL TO authenticated
  USING (private.is_hr_privileged(auth.uid()))
  WITH CHECK (private.is_hr_privileged(auth.uid()));

CREATE POLICY "Admin all rewards" ON public.talent_rewards
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_talent_rewards_updated_at
  BEFORE UPDATE ON public.talent_rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();