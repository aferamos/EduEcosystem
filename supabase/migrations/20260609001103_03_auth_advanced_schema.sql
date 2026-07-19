/*
# EduOne – Advanced Auth Schema: MFA, Sessions, Settings, Active Context, Permissions

## Summary
Adds support for:
- Multi-Factor Authentication (MFA) ready state
- Session tracking (device, IP, last activity)
- User settings (notifications, language, preferences)
- Active context (profile + institution + role currently selected by the user)
- Role-based permissions matrix (RBAC fine-grained)

## New Tables
1. `user_sessions` – tracks active device sessions for security and logout-all
2. `user_settings` – per-user preferences (notifications, theme, locale)
3. `user_active_context` – stores the currently selected institution/profile/role per user
4. `role_permissions` – defines which roles can perform which actions
5. `user_mfa` – MFA state per user (prepared for future versions)

## Security
- RLS enabled on all new tables
- Policies scoped to authenticated owner or admin
*/

-- ============================================================
-- USER SESSIONS (device-level session tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name    text,
  device_type    text CHECK (device_type IN ('mobile','tablet','desktop','web')),
  os             text,
  ip_address     text,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz
);

-- ============================================================
-- USER SETTINGS (preferences)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications  boolean NOT NULL DEFAULT true,
  sms_notifications   boolean NOT NULL DEFAULT false,
  language            text NOT NULL DEFAULT 'pt-BR',
  theme               text NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark','system')),
  timezone            text NOT NULL DEFAULT 'America/Sao_Paulo',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USER ACTIVE CONTEXT (currently selected institution/role/profile)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_active_context (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id   uuid REFERENCES institutions(id) ON DELETE SET NULL,
  role             text CHECK (role IN ('super_admin','admin','coordinator','teacher','student','guardian')),
  profile_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROLE PERMISSIONS (RBAC fine-grained matrix)
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        text NOT NULL CHECK (role IN ('super_admin','admin','coordinator','teacher','student','guardian')),
  resource    text NOT NULL,
  action      text NOT NULL CHECK (action IN ('read','create','update','delete','manage','export')),
  scope       text NOT NULL DEFAULT 'own' CHECK (scope IN ('own','institution','all')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- ============================================================
-- USER MFA (prepared for future versions)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_mfa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_enabled    boolean NOT NULL DEFAULT false,
  totp_secret     text,
  totp_verified_at  timestamptz,
  backup_codes    text[] NOT NULL DEFAULT '{}',
  method_preference text NOT NULL DEFAULT 'none' CHECK (method_preference IN ('none','totp','sms','email')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, last_active_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER_SESSIONS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "user_sessions_select" ON user_sessions;
CREATE POLICY "user_sessions_select" ON user_sessions FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_sessions_insert" ON user_sessions;
CREATE POLICY "user_sessions_insert" ON user_sessions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_sessions_update" ON user_sessions;
CREATE POLICY "user_sessions_update" ON user_sessions FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_sessions_delete" ON user_sessions;
CREATE POLICY "user_sessions_delete" ON user_sessions FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- USER_SETTINGS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "user_settings_select" ON user_settings;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_settings_insert" ON user_settings;
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_settings_update" ON user_settings;
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- USER_ACTIVE_CONTEXT POLICIES
-- ============================================================
DROP POLICY IF EXISTS "user_active_context_select" ON user_active_context;
CREATE POLICY "user_active_context_select" ON user_active_context FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_active_context_insert" ON user_active_context;
CREATE POLICY "user_active_context_insert" ON user_active_context FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_active_context_update" ON user_active_context;
CREATE POLICY "user_active_context_update" ON user_active_context FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- ROLE_PERMISSIONS POLICIES (readable by all authenticated)
-- ============================================================
DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- USER_MFA POLICIES
-- ============================================================
DROP POLICY IF EXISTS "user_mfa_select" ON user_mfa;
CREATE POLICY "user_mfa_select" ON user_mfa FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_mfa_insert" ON user_mfa;
CREATE POLICY "user_mfa_insert" ON user_mfa FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_mfa_update" ON user_mfa;
CREATE POLICY "user_mfa_update" ON user_mfa FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SEED ROLE PERMISSIONS
-- ============================================================
INSERT INTO role_permissions (role, resource, action, scope) VALUES
-- super_admin
('super_admin', 'institutions', 'manage', 'all'),
('super_admin', 'users', 'manage', 'all'),
('super_admin', 'roles', 'manage', 'all'),
('super_admin', 'audit_logs', 'read', 'all'),
('super_admin', 'communications', 'manage', 'all'),
('super_admin', 'events', 'manage', 'all'),
('super_admin', 'settings', 'manage', 'all'),
-- admin
('admin', 'institutions', 'read', 'institution'),
('admin', 'institutions', 'update', 'institution'),
('admin', 'users', 'manage', 'institution'),
('admin', 'courses', 'manage', 'institution'),
('admin', 'classes', 'manage', 'institution'),
('admin', 'subjects', 'manage', 'institution'),
('admin', 'academic_periods', 'manage', 'institution'),
('admin', 'communications', 'manage', 'institution'),
('admin', 'events', 'manage', 'institution'),
('admin', 'audit_logs', 'read', 'institution'),
('admin', 'reports', 'read', 'institution'),
('admin', 'grades', 'manage', 'institution'),
('admin', 'attendance', 'manage', 'institution'),
('admin', 'occurrences', 'manage', 'institution'),
('admin', 'notifications', 'manage', 'institution'),
('admin', 'settings', 'manage', 'institution'),
-- coordinator
('coordinator', 'courses', 'read', 'institution'),
('coordinator', 'classes', 'manage', 'institution'),
('coordinator', 'subjects', 'read', 'institution'),
('coordinator', 'teachers', 'manage', 'institution'),
('coordinator', 'students', 'manage', 'institution'),
('coordinator', 'enrollments', 'manage', 'institution'),
('coordinator', 'reports', 'read', 'institution'),
('coordinator', 'occurrences', 'read', 'institution'),
('coordinator', 'communications', 'create', 'institution'),
('coordinator', 'events', 'read', 'institution'),
-- teacher
('teacher', 'classes', 'read', 'institution'),
('teacher', 'subjects', 'read', 'institution'),
('teacher', 'class_subjects', 'read', 'own'),
('teacher', 'assessments', 'manage', 'own'),
('teacher', 'grades', 'manage', 'own'),
('teacher', 'attendance', 'manage', 'own'),
('teacher', 'occurrences', 'create', 'own'),
('teacher', 'occurrences', 'update', 'own'),
('teacher', 'communications', 'read', 'institution'),
('teacher', 'notifications', 'read', 'own'),
('teacher', 'events', 'read', 'institution'),
-- student
('student', 'classes', 'read', 'own'),
('student', 'grades', 'read', 'own'),
('student', 'attendance', 'read', 'own'),
('student', 'occurrences', 'read', 'own'),
('student', 'communications', 'read', 'institution'),
('student', 'notifications', 'read', 'own'),
('student', 'events', 'read', 'institution'),
-- guardian
('guardian', 'students', 'read', 'own'),
('guardian', 'grades', 'read', 'own'),
('guardian', 'attendance', 'read', 'own'),
('guardian', 'occurrences', 'read', 'own'),
('guardian', 'communications', 'read', 'institution'),
('guardian', 'notifications', 'read', 'own'),
('guardian', 'events', 'read', 'institution')
ON CONFLICT (role, resource, action) DO NOTHING;

-- ============================================================
-- TRIGGER: auto-create user_settings, user_mfa, profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name) VALUES (NEW.id, '');
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  INSERT INTO user_mfa (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
