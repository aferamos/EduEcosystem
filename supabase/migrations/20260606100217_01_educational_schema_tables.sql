/*
# Educational Ecosystem – Schema Part 1: Core Tables

Creates all tables first, before any helper functions that reference them.
Tables: institutions, profiles, user_roles, academic_periods, courses, classes,
subjects, class_subjects, student_enrollments, attendance, assessments, grades,
occurrences, notifications, communications, events, audit_logs.
*/

-- ============================================================
-- INSTITUTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS institutions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  logo_url        text,
  primary_color   text NOT NULL DEFAULT '#1A56DB',
  secondary_color text NOT NULL DEFAULT '#0694A2',
  address         text,
  city            text,
  phone           text,
  email           text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL DEFAULT '',
  avatar_url  text,
  phone       text,
  birth_date  date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USER ROLES (RBAC + multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  role           text NOT NULL CHECK (role IN ('super_admin','admin','coordinator','teacher','student','guardian')),
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, institution_id, role)
);

-- ============================================================
-- ACADEMIC PERIODS
-- ============================================================
CREATE TABLE IF NOT EXISTS academic_periods (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           text NOT NULL,
  type           text NOT NULL CHECK (type IN ('bimester','trimester','semester','annual')),
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  year           integer NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           text NOT NULL,
  level          text NOT NULL DEFAULT 'fundamental',
  duration_years integer NOT NULL DEFAULT 1,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CLASSES (TURMAS)
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id      uuid REFERENCES courses(id) ON DELETE SET NULL,
  name           text NOT NULL,
  year           integer NOT NULL,
  shift          text CHECK (shift IN ('morning','afternoon','evening','full')),
  max_students   integer NOT NULL DEFAULT 40,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SUBJECTS (DISCIPLINAS)
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           text NOT NULL,
  code           text,
  workload_hours integer,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CLASS_SUBJECTS (discipline assigned to a class with teacher)
-- ============================================================
CREATE TABLE IF NOT EXISTS class_subjects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id   uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  weekly_hours integer NOT NULL DEFAULT 2,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

-- ============================================================
-- STUDENT_ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS student_enrollments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id          uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  institution_id    uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  enrollment_number text,
  enrollment_date   date NOT NULL DEFAULT CURRENT_DATE,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','transferred','graduated','dropped')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_subject_id uuid NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             date NOT NULL,
  status           text NOT NULL CHECK (status IN ('present','absent','justified','late')),
  note             text,
  recorded_by      uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_subject_id, student_id, date)
);

-- ============================================================
-- ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_subject_id   uuid NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  academic_period_id uuid REFERENCES academic_periods(id) ON DELETE SET NULL,
  title              text NOT NULL,
  type               text NOT NULL CHECK (type IN ('exam','test','assignment','project','quiz','recovery')),
  date               date,
  max_score          numeric(5,2) NOT NULL DEFAULT 10,
  weight             numeric(3,2) NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score         numeric(5,2),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','graded','absent','excused')),
  note          text,
  graded_by     uuid REFERENCES auth.users(id),
  graded_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

-- ============================================================
-- OCCURRENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS occurrences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_by    uuid NOT NULL REFERENCES auth.users(id),
  class_id       uuid REFERENCES classes(id) ON DELETE SET NULL,
  type           text NOT NULL CHECK (type IN ('disciplinary','academic','behavioral','commendation','observation')),
  title          text NOT NULL,
  description    text,
  severity       text CHECK (severity IN ('low','medium','high')),
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  recipient_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id      uuid REFERENCES auth.users(id),
  title          text NOT NULL,
  message        text NOT NULL,
  type           text NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','alert','grade','attendance','occurrence')),
  read           boolean NOT NULL DEFAULT false,
  data           jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMMUNICATIONS (announcements)
-- ============================================================
CREATE TABLE IF NOT EXISTS communications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  sender_id      uuid NOT NULL REFERENCES auth.users(id),
  title          text NOT NULL,
  message        text NOT NULL,
  audience       text[] NOT NULL DEFAULT '{}',
  class_ids      uuid[] NOT NULL DEFAULT '{}',
  pinned         boolean NOT NULL DEFAULT false,
  published_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EVENTS (calendar)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  event_date     date NOT NULL,
  end_date       date,
  type           text NOT NULL DEFAULT 'general' CHECK (type IN ('holiday','exam','meeting','activity','general')),
  class_ids      uuid[] NOT NULL DEFAULT '{}',
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action         text NOT NULL,
  resource_type  text NOT NULL,
  resource_id    uuid,
  old_data       jsonb,
  new_data       jsonb,
  ip_address     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_institution ON user_roles(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_subject ON attendance(class_subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment ON grades(assessment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_occurrences_student ON occurrences(student_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_institution ON occurrences(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_institution ON audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher ON class_subjects(teacher_id);


--===================================================================================


-- ============================================================
--   CONSULTAR USUARIOS
-- ============================================================
Select u.id, u.email, f.full_name, r.role, i.name ,u.encrypted_password, u.phone, u.created_at, u.updated_at 
  From auth.users u, -- USUARIO
         profiles f, -- PERFIL DO USUARIO
       user_roles r, -- FUNÇÕES DO USUARIO
     institutions i  -- INSTITUIÇÃO
 Where u.id = f.id
   And u.id = r.user_id
   And r.institution_id = i.id;

-- ============================================================
-- CONSULTAR USUARIOS
-- ============================================================

SELECT * FROM perfis;
SELECT * FROM profiles;

SELECT * FROM periodos_letivos;
select * from academic_periods;