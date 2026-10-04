-- Purge auth users (cascades to profiles via trigger relations are not set, so clean manually too)
DELETE FROM auth.users;

-- Purge all business tables
TRUNCATE TABLE
  public.attendance,
  public.leave_requests,
  public.payroll,
  public.performance_reviews,
  public.talents,
  public.wellbeing_surveys,
  public.documents,
  public.candidates,
  public.job_offers,
  public.tasks,
  public.appointments,
  public.meeting_minutes,
  public.contacts,
  public.mail_register,
  public.assistant_records,
  public.legal_records,
  public.trainings,
  public.announcements,
  public.audit_logs,
  public.direction_executives,
  public.user_roles,
  public.profiles,
  public.employees,
  public.departments,
  public.directions,
  public.attendance_locations
RESTART IDENTITY CASCADE;

-- Reset onboarding/app settings so the wizard reapparaît
DELETE FROM public.app_settings;
