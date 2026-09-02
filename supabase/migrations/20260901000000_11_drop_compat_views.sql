/*
================================================================================
  EduOne – Migration 11: Remove views de compatibilidade EN
  
  O app agora acessa diretamente as tabelas reais em português.
  As views de compatibilidade em inglês não são mais necessárias.
================================================================================
*/

DROP VIEW IF EXISTS public.audit_logs             CASCADE;
DROP VIEW IF EXISTS public.events                 CASCADE;
DROP VIEW IF EXISTS public.communications         CASCADE;
DROP VIEW IF EXISTS public.notifications          CASCADE;
DROP VIEW IF EXISTS public.occurrences            CASCADE;
DROP VIEW IF EXISTS public.grades                 CASCADE;
DROP VIEW IF EXISTS public.assessments            CASCADE;
DROP VIEW IF EXISTS public.attendance             CASCADE;
DROP VIEW IF EXISTS public.student_enrollments    CASCADE;
DROP VIEW IF EXISTS public.class_subjects         CASCADE;
DROP VIEW IF EXISTS public.subjects               CASCADE;
DROP VIEW IF EXISTS public.classes                CASCADE;
DROP VIEW IF EXISTS public.courses                CASCADE;
DROP VIEW IF EXISTS public.academic_periods       CASCADE;
DROP VIEW IF EXISTS public.role_permissions       CASCADE;
DROP VIEW IF EXISTS public.user_active_context    CASCADE;
DROP VIEW IF EXISTS public.user_settings          CASCADE;
DROP VIEW IF EXISTS public.user_sessions          CASCADE;
DROP VIEW IF EXISTS public.user_roles             CASCADE;
DROP VIEW IF EXISTS public.profiles               CASCADE;
DROP VIEW IF EXISTS public.institutions           CASCADE;
