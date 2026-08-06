-- =============================================================
-- Corrige les directions dupliquées dans l'organigramme.
-- 1) Nettoie les doublons existants (même organization_id + code).
-- 2) Ajoute une contrainte unique pour empêcher toute recréation.
--
-- Pour chaque groupe de directions ayant le même code + même org,
-- on conserve UNIQUEMENT celle qui possède le plus de départements
-- (à égalité, la plus ancienne). Les départements, employés et
-- executives des doublons sont ré-affectés à la direction conservée
-- avant suppression.
--
-- Idempotent : peut être exécuté plusieurs fois sans danger.
-- =============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. Nettoyage des doublons existants
-- ---------------------------------------------------------------
DO $$
DECLARE
  grp RECORD;
  keep_id uuid;
  dup_ids uuid[];
BEGIN
  FOR grp IN
    SELECT organization_id, code
    FROM public.directions
    WHERE code IS NOT NULL
      AND organization_id IS NOT NULL
    GROUP BY organization_id, code
    HAVING COUNT(*) > 1
  LOOP
    -- Direction à conserver = celle avec le plus de départements
    -- (à égalité, la plus ancienne créée)
    SELECT d.id INTO keep_id
    FROM public.directions d
    WHERE d.organization_id = grp.organization_id
      AND d.code = grp.code
    ORDER BY
      (SELECT COUNT(*) FROM public.departments dd WHERE dd.direction_id = d.id) DESC,
      d.created_at ASC
    LIMIT 1;

    IF keep_id IS NULL THEN CONTINUE; END IF;

    SELECT ARRAY_AGG(d.id) INTO dup_ids
    FROM public.directions d
    WHERE d.organization_id = grp.organization_id
      AND d.code = grp.code
      AND d.id <> keep_id;

    IF dup_ids IS NULL THEN CONTINUE; END IF;

    -- Ré-affecter les départements des doublons vers la direction conservée
    UPDATE public.departments
    SET direction_id = keep_id
    WHERE direction_id = ANY(dup_ids);

    -- Ré-affecter les employés des doublons vers la direction conservée
    UPDATE public.employees
    SET direction_id = keep_id
    WHERE direction_id = ANY(dup_ids);

    -- Ré-affecter les executives vers la direction conservée
    UPDATE public.direction_executives
    SET direction_id = keep_id
    WHERE direction_id = ANY(dup_ids);

    -- Supprimer les doublons
    DELETE FROM public.directions WHERE id = ANY(dup_ids);
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 2. Prévenir définitivement la recréation de doublons
-- ---------------------------------------------------------------
-- Supprime l'ancien index unique global s'il existe (basé sur le code seul),
-- puis crée un index unique par (organization_id, code).
DROP INDEX IF EXISTS public.directions_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS directions_org_code_key
  ON public.directions (organization_id, code)
  WHERE code IS NOT NULL;

COMMIT;
