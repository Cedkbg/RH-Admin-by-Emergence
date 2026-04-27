-- 1. Add new columns to employees: department_id, contract_type, gender
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS gender text;

-- 2. Helper function: is_secretary_or_admin
CREATE OR REPLACE FUNCTION public.is_secretary_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'secretaire'::app_role)
  )
$$;

-- 3. Appointments (agenda)
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  location text,
  attendees text,
  for_who text DEFAULT 'manager',
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "secretary manage appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (public.is_secretary_or_admin(auth.uid()))
  WITH CHECK (public.is_secretary_or_admin(auth.uid()));
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Mail register
CREATE TABLE IF NOT EXISTS public.mail_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL DEFAULT 'incoming',
  reference text,
  subject text NOT NULL,
  sender text,
  recipient text,
  mail_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'received',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mail_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view mail" ON public.mail_register
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "secretary manage mail" ON public.mail_register
  FOR ALL TO authenticated
  USING (public.is_secretary_or_admin(auth.uid()))
  WITH CHECK (public.is_secretary_or_admin(auth.uid()));
CREATE TRIGGER trg_mail_updated_at
  BEFORE UPDATE ON public.mail_register
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Meeting minutes
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  attendees text,
  agenda text,
  decisions text,
  next_steps text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view minutes" ON public.meeting_minutes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "secretary manage minutes" ON public.meeting_minutes
  FOR ALL TO authenticated
  USING (public.is_secretary_or_admin(auth.uid()))
  WITH CHECK (public.is_secretary_or_admin(auth.uid()));
CREATE TRIGGER trg_minutes_updated_at
  BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Contacts directory
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  organization text,
  position text,
  email text,
  phone text,
  category text DEFAULT 'external',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "secretary manage contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (public.is_secretary_or_admin(auth.uid()))
  WITH CHECK (public.is_secretary_or_admin(auth.uid()));
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();