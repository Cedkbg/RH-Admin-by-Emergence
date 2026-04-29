-- Lieux de pointage avec QR rotatif et coordonnées GPS
CREATE TABLE public.attendance_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 50,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_locations ENABLE ROW LEVEL SECURITY;

-- Lecture pour utilisateurs ops (RH/Manager/DG/Admin) ; secret reste protégé via RLS
CREATE POLICY "ops view locations"
  ON public.attendance_locations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'assistant_direction'::app_role)
    OR has_role(auth.uid(), 'dg'::app_role)
    OR has_role(auth.uid(), 'dga'::app_role)
  );

CREATE POLICY "admin manage locations"
  ON public.attendance_locations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE TRIGGER set_locations_updated_at
  BEFORE UPDATE ON public.attendance_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Champs additionnels sur attendance pour traçabilité du scan
ALTER TABLE public.attendance
  ADD COLUMN location_id uuid REFERENCES public.attendance_locations(id) ON DELETE SET NULL,
  ADD COLUMN scan_method text,
  ADD COLUMN gps_lat double precision,
  ADD COLUMN gps_lng double precision,
  ADD COLUMN distance_meters numeric;

CREATE INDEX idx_attendance_employee_date ON public.attendance(employee_id, date);