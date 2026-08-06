CREATE OR REPLACE FUNCTION public.set_attendance_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT e.organization_id INTO NEW.organization_id
    FROM public.employees e WHERE e.id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_attendance_organization ON public.attendance;
CREATE TRIGGER trg_set_attendance_organization
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.set_attendance_organization();

UPDATE public.attendance a
SET organization_id = e.organization_id
FROM public.employees e
WHERE a.employee_id = e.id AND a.organization_id IS NULL;