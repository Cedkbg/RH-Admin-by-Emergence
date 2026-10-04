
ALTER TABLE public.talents
  ADD COLUMN IF NOT EXISTS readiness text NOT NULL DEFAULT '2_3_years',
  ADD COLUMN IF NOT EXISTS retention_risk text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS target_position text,
  ADD COLUMN IF NOT EXISTS strengths text,
  ADD COLUMN IF NOT EXISTS development_areas text,
  ADD COLUMN IF NOT EXISTS mentor_id uuid,
  ADD COLUMN IF NOT EXISTS performance_score numeric,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS last_review_at date;
