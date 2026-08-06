-- Restaure les 10 directions par défaut pour chaque organisation qui n'en
-- possède pas (ou en possède moins). Reproduit exactement la structure définie
-- dans src/data/orgData.ts et dans la fonction edge create-organization.
-- Idempotent : ne crée une direction que si elle est absente pour l'organisation.

DO $$
DECLARE
  org_record RECORD;
  default_dirs text[][] := ARRAY[
    ARRAY['DG',  'Direction Générale'],
    ARRAY['DGA', 'Direction Générale Adjointe'],
    ARRAY['D1',  'Direction Technologie'],
    ARRAY['D2',  'Direction Produits'],
    ARRAY['D3',  'Direction Opérations'],
    ARRAY['D4',  'Direction Financière'],
    ARRAY['D5',  'Direction Risques'],
    ARRAY['D6',  'Direction Commerciale'],
    ARRAY['D7',  'Direction RH'],
    ARRAY['D8',  'Direction Juridique']
  ];
  dir_code text;
  dir_name text;
  new_dir_id uuid;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations LOOP
    FOREACH dir_code SLICE 1 IN ARRAY default_dirs LOOP
      dir_name := dir_code[2];
      dir_code := dir_code[1];

      -- Ne créer la direction que si elle n'existe pas déjà pour cette org
      IF NOT EXISTS (
        SELECT 1 FROM public.directions
        WHERE organization_id IS NOT DISTINCT FROM org_record.id
          AND code = dir_code
      ) THEN
        INSERT INTO public.directions (organization_id, code, name)
        VALUES (org_record.id, dir_code, dir_name)
        RETURNING id INTO new_dir_id;

        -- Départements par défaut pour cette direction
        IF dir_code = 'DG' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'DG-1', 'Secrétariat général'),
            (org_record.id, new_dir_id, 'DG-2', 'Audit interne');
        ELSIF dir_code = 'DGA' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'DGA-1', 'Coordination'),
            (org_record.id, new_dir_id, 'DGA-2', 'Suivi & Évaluation');
        ELSIF dir_code = 'D1' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D1-1', 'Infrastructure & Réseau'),
            (org_record.id, new_dir_id, 'D1-2', 'Développement');
        ELSIF dir_code = 'D2' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D2-1', 'Conception produit'),
            (org_record.id, new_dir_id, 'D2-2', 'Qualité');
        ELSIF dir_code = 'D3' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D3-1', 'Logistique'),
            (org_record.id, new_dir_id, 'D3-2', 'Maintenance');
        ELSIF dir_code = 'D4' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D4-1', 'Comptabilité'),
            (org_record.id, new_dir_id, 'D4-2', 'Trésorerie'),
            (org_record.id, new_dir_id, 'D4-3', 'Budget');
        ELSIF dir_code = 'D5' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D5-1', 'Conformité'),
            (org_record.id, new_dir_id, 'D5-2', 'Sécurité');
        ELSIF dir_code = 'D6' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D6-1', 'Ventes'),
            (org_record.id, new_dir_id, 'D6-2', 'Marketing');
        ELSIF dir_code = 'D7' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D7-1', 'Recrutement'),
            (org_record.id, new_dir_id, 'D7-2', 'Paie & Administration'),
            (org_record.id, new_dir_id, 'D7-3', 'Formation');
        ELSIF dir_code = 'D8' THEN
          INSERT INTO public.departments (organization_id, direction_id, code, name) VALUES
            (org_record.id, new_dir_id, 'D8-1', 'Contentieux'),
            (org_record.id, new_dir_id, 'D8-2', 'Contrats');
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END
$$;
