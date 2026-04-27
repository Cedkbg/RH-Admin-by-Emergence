-- Departments table linked to directions
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direction_id UUID NOT NULL REFERENCES public.directions(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  manager_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_direction_id ON public.departments(direction_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view departments"
ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();