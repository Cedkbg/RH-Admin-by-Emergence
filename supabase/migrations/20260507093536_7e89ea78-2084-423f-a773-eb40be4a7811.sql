
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0;

ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS hours_worked numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS hourly_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS contract_type text;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS ipr numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS inpp numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS cnss numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS onem numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS other_deductions numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.compute_net_pay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si heures et taux horaire renseignés, recalcule le salaire de base
  IF COALESCE(NEW.hours_worked,0) > 0 AND COALESCE(NEW.hourly_rate,0) > 0 THEN
    NEW.base_salary := NEW.hours_worked * NEW.hourly_rate;
  END IF;

  -- Total des retenues = somme des contributions + autres
  NEW.deductions := COALESCE(NEW.ipr,0) + COALESCE(NEW.inpp,0) + COALESCE(NEW.cnss,0)
                  + COALESCE(NEW.onem,0) + COALESCE(NEW.other_deductions,0);

  NEW.net_pay := COALESCE(NEW.base_salary,0) + COALESCE(NEW.bonus,0) - COALESCE(NEW.deductions,0);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS payroll_compute_net ON public.payroll;
CREATE TRIGGER payroll_compute_net
  BEFORE INSERT OR UPDATE ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION public.compute_net_pay();
