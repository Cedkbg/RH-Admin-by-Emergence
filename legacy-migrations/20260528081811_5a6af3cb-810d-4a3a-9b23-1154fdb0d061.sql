
DROP TRIGGER IF EXISTS trg_guard_employee_financial_fields ON public.employees;
CREATE TRIGGER trg_guard_employee_financial_fields
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.guard_employee_financial_fields();
