-- Trigger compute_net_pay sur payroll
DROP TRIGGER IF EXISTS trg_compute_net_pay ON public.payroll;
CREATE TRIGGER trg_compute_net_pay
BEFORE INSERT OR UPDATE ON public.payroll
FOR EACH ROW EXECUTE FUNCTION public.compute_net_pay();

-- Unicité période / employé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_employee_period_unique'
  ) THEN
    ALTER TABLE public.payroll
    ADD CONSTRAINT payroll_employee_period_unique UNIQUE (employee_id, period);
  END IF;
END $$;