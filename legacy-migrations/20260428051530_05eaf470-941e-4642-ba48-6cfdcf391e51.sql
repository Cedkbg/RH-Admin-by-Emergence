
-- 1. Ajout colonnes employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS base_salary numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manager_id uuid;

-- 2. Génération matricule auto
CREATE OR REPLACE FUNCTION public.generate_matricule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.matricule IS NULL OR NEW.matricule = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(matricule, '\D', '', 'g'), '')::int), 0) + 1
      INTO next_num FROM public.employees;
    NEW.matricule := 'EMP-' || LPAD(next_num::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_matricule ON public.employees;
CREATE TRIGGER trg_employees_matricule
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.generate_matricule();

-- 3. Auto-calcul net_pay
CREATE OR REPLACE FUNCTION public.compute_net_pay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.net_pay := COALESCE(NEW.base_salary,0) + COALESCE(NEW.bonus,0) - COALESCE(NEW.deductions,0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payroll_net ON public.payroll;
CREATE TRIGGER trg_payroll_net
  BEFORE INSERT OR UPDATE ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION public.compute_net_pay();

-- 4. Module Assistant de Direction
CREATE TABLE IF NOT EXISTS public.assistant_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'dossier', -- dossier | reporting | coordination
  description text,
  related_direction text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  due_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assistant_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view assistant records" ON public.assistant_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin manage assistant records" ON public.assistant_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_assistant_updated
  BEFORE UPDATE ON public.assistant_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
