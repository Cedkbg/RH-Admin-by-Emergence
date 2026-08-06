-- Élimine les directions dupliquées dans l'organigramme.
-- Pour chaque groupe de directions ayant le même code + même organization_id,
-- on conserve UNIQUEMENT celle qui possède le plus de départements (à égalité,
-- la plus ancienne créée). Les départements, employés et executives des
-- doublons sont ré-affectés à la direction conservée avant suppression.

BEGIN;

DO $$
DECLARE
  grp RECORD;
  keep_id uuid;
  dup_ids uuid[];
BEGIN
  -- 1. Identifier les groupes de directions dupliquées (même org + code)
  FOR grp IN
    SELECT organization_id, code
    FROM public.directions
    WHERE code IS NOT NULL
      AND organization_id IS NOT NULL
    GROUP BY organization_id, code
    HAVING COUNT(*) > 1
  LOOP
    -- 2. Direction à conserver = celle avec le plus de départements
    SELECT d.id INTO keep_id
    FROM public.directions d
    WHERE d.organization_id = grp.organization_id
      AND d.code = grp.code
    ORDER BY
      (SELECT COUNT(*) FROM public.departments dd WHERE dd.direction_id = d.id) DESC,
      d.created_at ASC
    LIMIT 1;

    IF keep_id IS NULL THEN CONTINUE; END IF;

    -- 3. IDs des doublons à supprimer
    SELECT ARRAY_AGG(d.id) INTO dup_ids
    FROM public.directions d
    WHERE d.organization_id = grp.organization_id
      AND d.code = grp.code
      AND d.id <> keep_id;

    IF dup_ids IS NULL THEN CONTINUE; END IF;

    -- 4. Ré-affecter les départements des doublons vers la direction conservée
    UPDATE public.departments
    SET direction_id = keep_id
    WHERE direction_id = ANY(dup_ids);

    -- 5. Ré-affecter les employés des doublons vers la direction conservée
    UPDATE public.employees
    SET direction_id = keep_id
    WHERE direction_id = ANY(dup_ids);

    -- 6. Ré-affecter les executives (direction_executives) vers la direction conservée
    UPDATE public.direction_executives
    SET direction_id = keep_id
    WHERE direction_id = ANY(dup_ids);

    -- 7. Supprimer les doublons
    DELETE FROM public.directions WHERE id = ANY(dup_ids);
  END LOOP;
END $$;

COMMIT;
