
-- Trigger guard: prevent non-admins from changing approval_status on their own profile
CREATE OR REPLACE FUNCTION public.guard_profile_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Permission refusée: seul un administrateur peut modifier le statut d''approbation.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_self_approval_trg ON public.profiles;
CREATE TRIGGER guard_profile_self_approval_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_approval();

-- Add WITH CHECK on self-update policy to block role/id tampering
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
