-- 1) Marquer si l'onboarding entreprise est termin\u00e9 (clef dans app_settings)
-- Pas de changement de schema requis pour app_settings (jsonb).

-- 2) Suivre l'onboarding par utilisateur (a-t-il vu / compl\u00e9t\u00e9 le wizard ?)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 3) Permettre \u00e0 tous les "chefs" (cabinet) + RH + admin d'ajouter des agents
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;

CREATE POLICY "Chiefs can insert employees"
ON public.employees FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'rh'::public.app_role)
  OR public.has_role(auth.uid(), 'dg'::public.app_role)
  OR public.has_role(auth.uid(), 'dga'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'secretaire'::public.app_role)
  OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
);

CREATE POLICY "Chiefs can update employees"
ON public.employees FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'rh'::public.app_role)
  OR public.has_role(auth.uid(), 'dg'::public.app_role)
  OR public.has_role(auth.uid(), 'dga'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'secretaire'::public.app_role)
  OR public.has_role(auth.uid(), 'assistant_direction'::public.app_role)
);

CREATE POLICY "Admins can delete employees"
ON public.employees FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Marquer les profils existants comme onboardingComplet (pour ne pas les forcer)
UPDATE public.profiles SET onboarding_completed = true WHERE approval_status = 'approved';