/*
# Fix role_permissions table – ensure all required columns exist

The table may exist from a previous schema version without the 'resource',
'action', or 'scope' columns. This migration re-creates it safely using
CREATE TABLE IF NOT EXISTS and ALTER TABLE ADD COLUMN IF NOT EXISTS.
*/

-- Re-create the table if it somehow lacks columns (safe to run multiple times)
CREATE TABLE IF NOT EXISTS role_permissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role       text NOT NULL CHECK (role IN ('super_admin','admin','coordinator','teacher','student','guardian')),
  resource   text NOT NULL,
  action     text NOT NULL CHECK (action IN ('read','create','update','delete','manage','export')),
  scope      text NOT NULL DEFAULT 'own' CHECK (scope IN ('own','institution','all')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- Add columns if they are missing (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_permissions' AND column_name = 'resource'
  ) THEN
    ALTER TABLE role_permissions ADD COLUMN resource text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_permissions' AND column_name = 'action'
  ) THEN
    ALTER TABLE role_permissions ADD COLUMN action text NOT NULL DEFAULT 'read'
      CHECK (action IN ('read','create','update','delete','manage','export'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_permissions' AND column_name = 'scope'
  ) THEN
    ALTER TABLE role_permissions ADD COLUMN scope text NOT NULL DEFAULT 'own'
      CHECK (scope IN ('own','institution','all'));
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Ensure read policy exists
DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT
  TO authenticated USING (true);

-- Re-seed permissions (safe – uses ON CONFLICT DO NOTHING)
INSERT INTO role_permissions (role, resource, action, scope) VALUES
-- super_admin
('super_admin', 'institutions',   'manage', 'all'),
('super_admin', 'users',          'manage', 'all'),
('super_admin', 'roles',          'manage', 'all'),
('super_admin', 'audit_logs',     'read',   'all'),
('super_admin', 'communications', 'manage', 'all'),
('super_admin', 'events',         'manage', 'all'),
('super_admin', 'settings',       'manage', 'all'),
-- admin
('admin', 'institutions',    'read',   'institution'),
('admin', 'institutions',    'update', 'institution'),
('admin', 'users',           'manage', 'institution'),
('admin', 'courses',         'manage', 'institution'),
('admin', 'classes',         'manage', 'institution'),
('admin', 'subjects',        'manage', 'institution'),
('admin', 'academic_periods','manage', 'institution'),
('admin', 'communications',  'manage', 'institution'),
('admin', 'events',          'manage', 'institution'),
('admin', 'audit_logs',      'read',   'institution'),
('admin', 'reports',         'read',   'institution'),
('admin', 'grades',          'manage', 'institution'),
('admin', 'attendance',      'manage', 'institution'),
('admin', 'occurrences',     'manage', 'institution'),
('admin', 'notifications',   'manage', 'institution'),
('admin', 'settings',        'manage', 'institution'),
-- coordinator
('coordinator', 'courses',        'read',   'institution'),
('coordinator', 'classes',        'manage', 'institution'),
('coordinator', 'subjects',       'read',   'institution'),
('coordinator', 'teachers',       'manage', 'institution'),
('coordinator', 'students',       'manage', 'institution'),
('coordinator', 'enrollments',    'manage', 'institution'),
('coordinator', 'reports',        'read',   'institution'),
('coordinator', 'occurrences',    'read',   'institution'),
('coordinator', 'communications', 'create', 'institution'),
('coordinator', 'events',         'read',   'institution'),
-- teacher
('teacher', 'classes',        'read',   'institution'),
('teacher', 'subjects',       'read',   'institution'),
('teacher', 'class_subjects', 'read',   'own'),
('teacher', 'assessments',    'manage', 'own'),
('teacher', 'grades',         'manage', 'own'),
('teacher', 'attendance',     'manage', 'own'),
('teacher', 'occurrences',    'create', 'own'),
('teacher', 'occurrences',    'update', 'own'),
('teacher', 'communications', 'read',   'institution'),
('teacher', 'notifications',  'read',   'own'),
('teacher', 'events',         'read',   'institution'),
-- student
('student', 'classes',        'read', 'own'),
('student', 'grades',         'read', 'own'),
('student', 'attendance',     'read', 'own'),
('student', 'occurrences',    'read', 'own'),
('student', 'communications', 'read', 'institution'),
('student', 'notifications',  'read', 'own'),
('student', 'events',         'read', 'institution'),
-- guardian
('guardian', 'students',      'read', 'own'),
('guardian', 'grades',        'read', 'own'),
('guardian', 'attendance',    'read', 'own'),
('guardian', 'occurrences',   'read', 'own'),
('guardian', 'communications','read', 'institution'),
('guardian', 'notifications', 'read', 'own'),
('guardian', 'events',        'read', 'institution')
ON CONFLICT (role, resource, action) DO NOTHING;
