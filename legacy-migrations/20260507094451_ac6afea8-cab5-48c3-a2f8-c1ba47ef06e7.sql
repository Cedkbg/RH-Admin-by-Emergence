ALTER TABLE public.payroll
  ADD COLUMN IF NOT EXISTS days_worked numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assiette_ipr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cnss_patronal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS communication numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyer numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allocation_familiale numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_avantages numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.compute_net_pay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Salaire de base : heures × taux OU jours × taux journalier OU valeur saisie
  IF COALESCE(NEW.hours_worked,0) > 0 AND COALESCE(NEW.hourly_rate,0) > 0 THEN
    NEW.base_salary := NEW.hours_worked * NEW.hourly_rate;
  ELSIF COALESCE(NEW.days_worked,0) > 0 AND COALESCE(NEW.daily_rate,0) > 0 THEN
    NEW.base_salary := NEW.days_worked * NEW.daily_rate;
  END IF;

  -- Total avantages
  NEW.total_avantages := COALESCE(NEW.transport,0) + COALESCE(NEW.communication,0)
                       + COALESCE(NEW.loyer,0) + COALESCE(NEW.allocation_familiale,0)
                       + COALESCE(NEW.bonus,0);

  -- Total retenues
  NEW.deductions := COALESCE(NEW.ipr,0) + COALESCE(NEW.inpp,0) + COALESCE(NEW.cnss,0)
                  + COALESCE(NEW.onem,0) + COALESCE(NEW.other_deductions,0);

  NEW.net_pay := COALESCE(NEW.base_salary,0) + COALESCE(NEW.total_avantages,0) - COALESCE(NEW.deductions,0);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_compute_net_pay ON public.payroll;
CREATE TRIGGER trg_compute_net_pay
BEFORE INSERT OR UPDATE ON public.payroll
FOR EACH ROW EXECUTE FUNCTION public.compute_net_pay();