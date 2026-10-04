
-- Ajouter le statut d'approbation aux profils
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending','approved','rejected'));

-- Approuver tous les comptes existants (pour ne pas casser l'usage actuel)
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Auto-approuver tout futur admin
CREATE OR REPLACE FUNCTION public.auto_approve_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    UPDATE public.profiles SET approval_status = 'approved' WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_admin ON public.user_roles;
CREATE TRIGGER trg_auto_approve_admin
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.auto_approve_admin();

-- Permettre à l'admin de mettre à jour le statut d'approbation
DROP POLICY IF EXISTS "Admins can update profiles approval" ON public.profiles;
CREATE POLICY "Admins can update profiles approval"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));
