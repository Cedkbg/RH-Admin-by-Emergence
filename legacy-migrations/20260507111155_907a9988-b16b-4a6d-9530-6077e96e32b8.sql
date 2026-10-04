
-- 1) Restreindre l'accès au secret HMAC des lieux de pointage.
DROP POLICY IF EXISTS "ops view locations" ON public.attendance_locations;

-- Vue publique sans la colonne `secret` (pour managers, DG, etc.)
CREATE OR REPLACE VIEW public.attendance_locations_public
WITH (security_invoker = on) AS
SELECT id, name, address, latitude, longitude, radius_meters, active, created_at, updated_at
FROM public.attendance_locations;

-- Policy SELECT lecture sans secret via la table de base : seuls admin/rh peuvent lire toutes colonnes
-- (la policy "admin manage locations" couvre déjà admin+rh pour ALL). On ajoute une SELECT explicite limitée :
CREATE POLICY "Privileged read locations"
ON public.attendance_locations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

-- Permettre à la vue d'être lue par les rôles opérationnels (managers, dg, dga, assistant_direction)
GRANT SELECT ON public.attendance_locations_public TO authenticated;

-- 2) Renforcer la confidentialité des PII employés : restreindre la colonne base_salary/hourly_rate
-- via une vue annuaire pour usage non-RH.
CREATE OR REPLACE VIEW public.employees_directory
WITH (security_invoker = on) AS
SELECT id, first_name, last_name, matricule, position, email,
       direction_id, department_id, status, gender
FROM public.employees;

GRANT SELECT ON public.employees_directory TO authenticated;
