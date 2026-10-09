-- ============================================================================
-- SCHÉMA DE LA BASE DE DONNÉES PostgreSQL
-- Application RH — Emergence DRC (Lovable Cloud / Supabase)
-- Généré le 09/10/2026 — schéma public, multi-entreprise (organization_id)
-- ============================================================================
--
-- Architecture :
--   • 39 tables dans le schéma public
--   • 1 type énuméré : app_role
--   • 23 fonctions SQL (triggers + security definer)
--   • Sécurité : Row Level Security (RLS) sur toutes les tables,
--     filtrage par organization_id et par rôle (fonction has_role)
--   • Les rôles sont stockés dans user_roles (jamais sur le profil)
--   • Seuls profiles et user_roles référencent auth.users
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TYPE ÉNUMÉRÉ
-- ----------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM (
  'admin', 'employee', 'secretaire', 'dg', 'dga',
  'manager', 'assistant_direction', 'rh'
);

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  slug text,
  logo_url text,
  address text,
  city text,
  country text,
  phone text,
  email text,
  website text,
  rccm text,
  id_national text,
  tax_number text,
  currency text NOT NULL DEFAULT 'CDF',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approval_status text NOT NULL,
  onboarding_completed boolean NOT NULL,
  organization_id uuid REFERENCES public.organizations(id)
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id),
  UNIQUE (user_id, role)
);

CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.directions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  manager_name text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction_id uuid NOT NULL REFERENCES public.directions(id),
  code text,
  name text NOT NULL,
  description text,
  manager_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.direction_executives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  direction_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  position text,
  direction_id uuid REFERENCES public.directions(id),
  status text NOT NULL DEFAULT 'active',
  hire_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  department_id uuid,
  contract_type text,
  gender text,
  address text,
  birth_date date,
  base_salary numeric DEFAULT 0,
  manager_id uuid,
  hourly_rate numeric DEFAULT 0,
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in time,
  check_out time,
  status text NOT NULL DEFAULT 'present',
  created_at timestamptz NOT NULL DEFAULT now(),
  location_id uuid REFERENCES public.attendance_locations(id),
  scan_method text,
  gps_lat double precision,
  gps_lng double precision,
  distance_meters numeric,
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.attendance_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 50,
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.break_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  organization_id uuid REFERENCES public.organizations(id),
  date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Kinshasa')::date),
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz,
  postponed_minutes integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  leave_type text NOT NULL DEFAULT 'paid',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attachment_url text,
  review_comment text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.absence_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  period text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  period text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric,
  status text NOT NULL DEFAULT 'draft',
  paid_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  hours_worked numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  contract_type text,
  ipr numeric NOT NULL DEFAULT 0,
  inpp numeric NOT NULL DEFAULT 0,
  cnss numeric NOT NULL DEFAULT 0,
  onem numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  days_worked numeric NOT NULL DEFAULT 0,
  daily_rate numeric NOT NULL DEFAULT 0,
  assiette_ipr numeric NOT NULL DEFAULT 0,
  cnss_patronal numeric NOT NULL DEFAULT 0,
  transport numeric NOT NULL DEFAULT 0,
  communication numeric NOT NULL DEFAULT 0,
  loyer numeric NOT NULL DEFAULT 0,
  allocation_familiale numeric NOT NULL DEFAULT 0,
  total_avantages numeric NOT NULL DEFAULT 0,
  bonus_type text,
  bonus_details jsonb,
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  period text NOT NULL,
  score numeric,
  comments text,
  reviewed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.performance_review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id),
  author_id uuid NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  potential text NOT NULL,
  skills text,
  career_plan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  readiness text NOT NULL,
  retention_risk text NOT NULL,
  target_position text,
  strengths text,
  development_areas text,
  mentor_id uuid,
  performance_score numeric,
  review_notes text,
  last_review_at date,
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.talent_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  reward_type text NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric,
  awarded_at date NOT NULL,
  awarded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  trainer text,
  start_date date,
  end_date date,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  direction_id uuid REFERENCES public.directions(id),
  description text,
  location text,
  contract_type text,
  status text NOT NULL DEFAULT 'open',
  posted_at date DEFAULT CURRENT_DATE,
  closing_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_offer_id uuid REFERENCES public.job_offers(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL,
  notes text,
  applied_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  author_id uuid NOT NULL,
  title text NOT NULL,
  report_type text NOT NULL DEFAULT 'journalier',
  period_start date,
  period_end date,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  review_comment text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reference text,
  category text,
  confidentiality text NOT NULL DEFAULT 'confidentiel',
  department_id uuid REFERENCES public.departments(id),
  executive_summary text,
  attachments jsonb NOT NULL DEFAULT '[]',
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assignee_id uuid REFERENCES public.employees(id),
  priority text NOT NULL,
  status text NOT NULL,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  author_id uuid NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.task_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.app_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  location text,
  attendees text,
  for_who text DEFAULT 'manager',
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.assistant_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'dossier',
  description text,
  related_direction text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  due_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  organization text,
  position text,
  email text,
  phone text,
  category text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  file_url text,
  employee_id uuid REFERENCES public.employees(id),
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.legal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text,
  description text,
  status text NOT NULL DEFAULT 'active',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.mail_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL DEFAULT 'incoming',
  reference text,
  subject text NOT NULL,
  sender text,
  recipient text,
  mail_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'received',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  attendees text,
  agenda text,
  decisions text,
  next_steps text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  category text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

CREATE TABLE public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  role app_role NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id)
);

CREATE TABLE public.wellbeing_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id),
  mood_score integer,
  comments text,
  submitted_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  moment text NOT NULL,
  energy_score integer,
  stress_score integer,
  highlight text,
  organization_id uuid REFERENCES public.organizations(id) DEFAULT private.current_org_id()
);

-- ----------------------------------------------------------------------------
-- FONCTIONS (23)
-- ----------------------------------------------------------------------------
-- auto_approve_admin()                          trigger, security definer
-- can_access_direction(_user_id uuid, _direction_code text) -> boolean
-- compute_net_pay()                             trigger, security definer
-- current_employee_id() -> uuid                 security definer
-- current_org_id() -> uuid
-- generate_matricule()                          trigger, security definer
-- guard_employee_financial_fields()             trigger, security definer
-- guard_profile_self_approval()                 trigger, security definer
-- handle_new_user()                             trigger, security definer
-- has_role(_user_id uuid, _role app_role) -> boolean   security definer
-- is_hr_privileged(_user_id uuid) -> boolean    security definer
-- is_platform_admin() -> boolean
-- is_secretary_or_admin(_user_id uuid) -> boolean      security definer
-- log_role_change()                             trigger, security definer
-- notify_leave_request()                        trigger, security definer
-- prevent_last_admin_profile_rejection()        trigger, security definer
-- prevent_last_admin_role_removal()             trigger, security definer
-- principal_admin_id() -> uuid                  security definer
-- revoke_roles_on_rejection()                   trigger, security definer
-- set_attendance_organization()                 trigger, security definer
-- set_break_organization()                      trigger, security definer
-- set_updated_at()                              trigger, security definer
-- validate_wellbeing_survey()                   trigger, security definer

-- ----------------------------------------------------------------------------
-- SÉCURITÉ (RLS)
-- ----------------------------------------------------------------------------
-- Toutes les tables ont Row Level Security activée. Les policies filtrent
-- par organization_id (isolation multi-entreprise) et par rôle via
-- has_role(auth.uid(), '<role>'). Nombre de policies par table :
--   absence_justifications 6 | agent_reports 5 | announcements 3
--   app_settings 8 | appointments 3 | assistant_records 3 | attendance 5
--   attendance_locations 2 | audit_logs 4 | break_sessions 2 | candidates 3
--   contacts 3 | departments 5 | direction_executives 3 | directions 5
--   documents 4 | employees 7 | job_offers 5 | leave_requests 6
--   legal_records 3 | mail_register 3 | meeting_minutes 3 | notifications 5
--   organization_members 1 | organizations 4 | payroll 5
--   performance_review_comments 4 | performance_reviews 4 | platform_admins 1
--   profiles 5 | role_audit_log 2 | talent_rewards 5 | talents 3
--   task_chat_messages 4 | task_comments 5 | tasks 4 | trainings 3
--   user_roles 5 | wellbeing_surveys 5
-- Chaque CREATE TABLE est accompagné de GRANT (authenticated / service_role)
-- dans la migration correspondante.
-- ============================================================================
