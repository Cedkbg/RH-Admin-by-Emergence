-- Étendre wellbeing_surveys pour supporter check-in matin / check-out soir
ALTER TABLE public.wellbeing_surveys
  ADD COLUMN IF NOT EXISTS moment text NOT NULL DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS energy_score integer,
  ADD COLUMN IF NOT EXISTS stress_score integer,
  ADD COLUMN IF NOT EXISTS highlight text;

-- Validation des plages 1..5 via trigger (pas de CHECK pour rester flexible)
CREATE OR REPLACE FUNCTION public.validate_wellbeing_survey()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.moment NOT IN ('morning','evening','day') THEN
    RAISE EXCEPTION 'moment invalide';
  END IF;
  IF NEW.mood_score IS NOT NULL AND (NEW.mood_score < 1 OR NEW.mood_score > 5) THEN
    RAISE EXCEPTION 'mood_score doit être entre 1 et 5';
  END IF;
  IF NEW.energy_score IS NOT NULL AND (NEW.energy_score < 1 OR NEW.energy_score > 5) THEN
    RAISE EXCEPTION 'energy_score doit être entre 1 et 5';
  END IF;
  IF NEW.stress_score IS NOT NULL AND (NEW.stress_score < 1 OR NEW.stress_score > 5) THEN
    RAISE EXCEPTION 'stress_score doit être entre 1 et 5';
  END IF;
  -- Auto-lier employee_id à l'agent connecté si manquant
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := private.current_employee_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_wellbeing ON public.wellbeing_surveys;
CREATE TRIGGER trg_validate_wellbeing
BEFORE INSERT OR UPDATE ON public.wellbeing_surveys
FOR EACH ROW EXECUTE FUNCTION public.validate_wellbeing_survey();

-- Permettre aux agents d'insérer leur propre fiche
DROP POLICY IF EXISTS "Self insert own wellbeing" ON public.wellbeing_surveys;
CREATE POLICY "Self insert own wellbeing"
ON public.wellbeing_surveys
FOR INSERT
TO authenticated
WITH CHECK (employee_id = private.current_employee_id());

CREATE INDEX IF NOT EXISTS idx_wellbeing_emp_date ON public.wellbeing_surveys(employee_id, submitted_at DESC);