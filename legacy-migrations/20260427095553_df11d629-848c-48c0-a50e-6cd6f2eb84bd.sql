
-- ============================================
-- EMERGENCE DRC - Schéma complet pour tous les modules
-- ============================================

-- Trigger updated_at générique (réutilise set_updated_at déjà existante)

-- ============= 1. RECRUTEMENT =============
CREATE TABLE public.job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  direction_id UUID REFERENCES public.directions(id) ON DELETE SET NULL,
  description TEXT,
  location TEXT,
  contract_type TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  posted_at DATE DEFAULT CURRENT_DATE,
  closing_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view job_offers" ON public.job_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert job_offers" ON public.job_offers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin update job_offers" ON public.job_offers FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete job_offers" ON public.job_offers FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_job_offers_updated BEFORE UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_offer_id UUID REFERENCES public.job_offers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  applied_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all candidates" ON public.candidates FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_candidates_updated BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 2. TÂCHES & PROJETS =============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all tasks" ON public.tasks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 3. PERFORMANCE =============
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL,
  score NUMERIC(3,1),
  comments TEXT,
  reviewed_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view perf" ON public.performance_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all perf" ON public.performance_reviews FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_perf_updated BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 4. FORMATION =============
CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  trainer TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view trainings" ON public.trainings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all trainings" ON public.trainings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_trainings_updated BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 5. PAIE =============
CREATE TABLE public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) GENERATED ALWAYS AS (base_salary + bonus - deductions) STORED,
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view payroll" ON public.payroll FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admin all payroll" ON public.payroll FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payroll_updated BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 6. PRÉSENCE & CONGÉS =============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all attendance" ON public.attendance FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'paid',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view leaves" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all leaves" ON public.leave_requests FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_leaves_updated BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 7. DOCUMENTS =============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  file_url TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all documents" ON public.documents FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO storage.buckets (id, name, public) VALUES ('documents','documents', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "auth view docs storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "admin upload docs storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete docs storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND has_role(auth.uid(),'admin'));

-- ============= 8. JURIDIQUE =============
CREATE TABLE public.legal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view legal" ON public.legal_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all legal" ON public.legal_records FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_legal_updated BEFORE UPDATE ON public.legal_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 9. COMMUNICATION (annonces) =============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all announcements" ON public.announcements FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============= 10. TALENTS =============
CREATE TABLE public.talents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  potential TEXT NOT NULL DEFAULT 'medium',
  skills TEXT,
  career_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.talents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view talents" ON public.talents FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all talents" ON public.talents FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_talents_updated BEFORE UPDATE ON public.talents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= 11. BIEN-ÊTRE (sondages QVT) =============
CREATE TABLE public.wellbeing_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  mood_score INT CHECK (mood_score BETWEEN 1 AND 5),
  comments TEXT,
  submitted_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wellbeing_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view wellbeing" ON public.wellbeing_surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all wellbeing" ON public.wellbeing_surveys FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============= 12. SÉCURITÉ (audit log) =============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view audit" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============= 13. PARAMÈTRES système =============
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
