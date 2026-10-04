
-- Données métier liées aux employés / users
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

-- Configuration entreprise
DELETE FROM public.app_settings;

-- Suppression de TOUS les comptes auth (cascade vers profiles via FK implicite)
DELETE FROM auth.users;
