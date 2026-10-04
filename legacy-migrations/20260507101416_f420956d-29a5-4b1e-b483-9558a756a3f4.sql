-- Add bonus type to payroll
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS bonus_type text;

-- Update default status (no DB constraint change needed - text field)
-- But update existing 'draft' rows to 'en_attente'
UPDATE public.payroll SET status = 'en_attente' WHERE status = 'draft';