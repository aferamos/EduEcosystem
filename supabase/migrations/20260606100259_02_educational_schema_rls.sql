/*
# Educational Ecosystem – Schema Part 2: Helper Functions and RLS Policies

Adds SECURITY DEFINER helper functions (now that user_roles table exists)
then applies Row Level Security policies to all tables.
*/

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER – bypasses RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_institution_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT coalesce(array_agg(institution_id), '{}')
  FROM user_roles
  WHERE user_id = auth.uid() AND active = true;
$$;

CREATE OR REPLACE FUNCTION is_institution_admin(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND institution_id = inst_id
    AND role IN ('super_admin', 'admin')
    AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_institution_teacher(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND institution_id = inst_id
    AND role = 'teacher'
    AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_institution_member(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND institution_id = inst_id
    AND active = true
  );
$$;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INSTITUTIONS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "institutions_select" ON institutions;
CREATE POLICY "institutions_select" ON institutions FOR SELECT
  TO authenticated USING (id = ANY(get_user_institution_ids()));

DROP POLICY IF EXISTS "institutions_insert" ON institutions;
CREATE POLICY "institutions_insert" ON institutions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "institutions_update" ON institutions;
CREATE POLICY "institutions_update" ON institutions FOR UPDATE
  TO authenticated USING (is_institution_admin(id)) WITH CHECK (is_institution_admin(id));

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- USER_ROLES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR is_institution_admin(institution_id)
  );

DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (
    is_institution_admin(institution_id)
    OR (user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
CREATE POLICY "user_roles_update" ON user_roles FOR UPDATE
  TO authenticated
  USING (is_institution_admin(institution_id))
  WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;
CREATE POLICY "user_roles_delete" ON user_roles FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- ACADEMIC_PERIODS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "academic_periods_select" ON academic_periods;
CREATE POLICY "academic_periods_select" ON academic_periods FOR SELECT
  TO authenticated USING (is_institution_member(institution_id));

DROP POLICY IF EXISTS "academic_periods_insert" ON academic_periods;
CREATE POLICY "academic_periods_insert" ON academic_periods FOR INSERT
  TO authenticated WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "academic_periods_update" ON academic_periods;
CREATE POLICY "academic_periods_update" ON academic_periods FOR UPDATE
  TO authenticated USING (is_institution_admin(institution_id)) WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "academic_periods_delete" ON academic_periods;
CREATE POLICY "academic_periods_delete" ON academic_periods FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- COURSES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "courses_select" ON courses;
CREATE POLICY "courses_select" ON courses FOR SELECT
  TO authenticated USING (is_institution_member(institution_id));

DROP POLICY IF EXISTS "courses_insert" ON courses;
CREATE POLICY "courses_insert" ON courses FOR INSERT
  TO authenticated WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "courses_update" ON courses;
CREATE POLICY "courses_update" ON courses FOR UPDATE
  TO authenticated USING (is_institution_admin(institution_id)) WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "courses_delete" ON courses;
CREATE POLICY "courses_delete" ON courses FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- CLASSES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes FOR SELECT
  TO authenticated USING (is_institution_member(institution_id));

DROP POLICY IF EXISTS "classes_insert" ON classes;
CREATE POLICY "classes_insert" ON classes FOR INSERT
  TO authenticated WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "classes_update" ON classes;
CREATE POLICY "classes_update" ON classes FOR UPDATE
  TO authenticated USING (is_institution_admin(institution_id)) WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "classes_delete" ON classes;
CREATE POLICY "classes_delete" ON classes FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- SUBJECTS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "subjects_select" ON subjects;
CREATE POLICY "subjects_select" ON subjects FOR SELECT
  TO authenticated USING (is_institution_member(institution_id));

DROP POLICY IF EXISTS "subjects_insert" ON subjects;
CREATE POLICY "subjects_insert" ON subjects FOR INSERT
  TO authenticated WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "subjects_update" ON subjects;
CREATE POLICY "subjects_update" ON subjects FOR UPDATE
  TO authenticated USING (is_institution_admin(institution_id)) WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "subjects_delete" ON subjects;
CREATE POLICY "subjects_delete" ON subjects FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- CLASS_SUBJECTS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "class_subjects_select" ON class_subjects;
CREATE POLICY "class_subjects_select" ON class_subjects FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_subjects.class_id
      AND is_institution_member(c.institution_id)
    )
  );

DROP POLICY IF EXISTS "class_subjects_insert" ON class_subjects;
CREATE POLICY "class_subjects_insert" ON class_subjects FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_subjects.class_id
      AND is_institution_admin(c.institution_id)
    )
  );

DROP POLICY IF EXISTS "class_subjects_update" ON class_subjects;
CREATE POLICY "class_subjects_update" ON class_subjects FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_subjects.class_id
      AND is_institution_admin(c.institution_id)
    )
  );

DROP POLICY IF EXISTS "class_subjects_delete" ON class_subjects;
CREATE POLICY "class_subjects_delete" ON class_subjects FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_subjects.class_id
      AND is_institution_admin(c.institution_id)
    )
  );

-- ============================================================
-- STUDENT_ENROLLMENTS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "student_enrollments_select" ON student_enrollments;
CREATE POLICY "student_enrollments_select" ON student_enrollments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR is_institution_admin(institution_id)
    OR is_institution_teacher(institution_id)
  );

DROP POLICY IF EXISTS "student_enrollments_insert" ON student_enrollments;
CREATE POLICY "student_enrollments_insert" ON student_enrollments FOR INSERT
  TO authenticated WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "student_enrollments_update" ON student_enrollments;
CREATE POLICY "student_enrollments_update" ON student_enrollments FOR UPDATE
  TO authenticated USING (is_institution_admin(institution_id)) WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "student_enrollments_delete" ON student_enrollments;
CREATE POLICY "student_enrollments_delete" ON student_enrollments FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- ATTENDANCE POLICIES
-- ============================================================
DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR recorded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM class_subjects cs
      JOIN classes cl ON cl.id = cs.class_id
      WHERE cs.id = attendance.class_subject_id
      AND (is_institution_admin(cl.institution_id) OR is_institution_teacher(cl.institution_id))
    )
  );

DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_subjects cs
      WHERE cs.id = attendance.class_subject_id
      AND cs.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM class_subjects cs
      JOIN classes cl ON cl.id = cs.class_id
      WHERE cs.id = attendance.class_subject_id
      AND is_institution_admin(cl.institution_id)
    )
  );

DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_update" ON attendance FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM class_subjects cs
      WHERE cs.id = attendance.class_subject_id
      AND cs.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM class_subjects cs
      JOIN classes cl ON cl.id = cs.class_id
      WHERE cs.id = attendance.class_subject_id
      AND is_institution_admin(cl.institution_id)
    )
  );

-- ============================================================
-- ASSESSMENTS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "assessments_select" ON assessments;
CREATE POLICY "assessments_select" ON assessments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM class_subjects cs
      JOIN classes cl ON cl.id = cs.class_id
      WHERE cs.id = assessments.class_subject_id
      AND is_institution_member(cl.institution_id)
    )
  );

DROP POLICY IF EXISTS "assessments_insert" ON assessments;
CREATE POLICY "assessments_insert" ON assessments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_subjects cs
      WHERE cs.id = assessments.class_subject_id
      AND cs.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM class_subjects cs
      JOIN classes cl ON cl.id = cs.class_id
      WHERE cs.id = assessments.class_subject_id
      AND is_institution_admin(cl.institution_id)
    )
  );

DROP POLICY IF EXISTS "assessments_update" ON assessments;
CREATE POLICY "assessments_update" ON assessments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM class_subjects cs
      WHERE cs.id = assessments.class_subject_id
      AND cs.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assessments_delete" ON assessments;
CREATE POLICY "assessments_delete" ON assessments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM class_subjects cs
      WHERE cs.id = assessments.class_subject_id
      AND cs.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- GRADES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "grades_select" ON grades;
CREATE POLICY "grades_select" ON grades FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR graded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM assessments a
      JOIN class_subjects cs ON cs.id = a.class_subject_id
      JOIN classes cl ON cl.id = cs.class_id
      WHERE a.id = grades.assessment_id
      AND (is_institution_admin(cl.institution_id) OR is_institution_teacher(cl.institution_id))
    )
  );

DROP POLICY IF EXISTS "grades_insert" ON grades;
CREATE POLICY "grades_insert" ON grades FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN class_subjects cs ON cs.id = a.class_subject_id
      WHERE a.id = grades.assessment_id
      AND cs.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM assessments a
      JOIN class_subjects cs ON cs.id = a.class_subject_id
      JOIN classes cl ON cl.id = cs.class_id
      WHERE a.id = grades.assessment_id
      AND is_institution_admin(cl.institution_id)
    )
  );

DROP POLICY IF EXISTS "grades_update" ON grades;
CREATE POLICY "grades_update" ON grades FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN class_subjects cs ON cs.id = a.class_subject_id
      WHERE a.id = grades.assessment_id
      AND cs.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- OCCURRENCES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "occurrences_select" ON occurrences;
CREATE POLICY "occurrences_select" ON occurrences FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR reported_by = auth.uid()
    OR is_institution_admin(institution_id)
    OR is_institution_teacher(institution_id)
  );

DROP POLICY IF EXISTS "occurrences_insert" ON occurrences;
CREATE POLICY "occurrences_insert" ON occurrences FOR INSERT
  TO authenticated WITH CHECK (
    is_institution_admin(institution_id)
    OR is_institution_teacher(institution_id)
  );

DROP POLICY IF EXISTS "occurrences_update" ON occurrences;
CREATE POLICY "occurrences_update" ON occurrences FOR UPDATE
  TO authenticated
  USING (reported_by = auth.uid() OR is_institution_admin(institution_id))
  WITH CHECK (reported_by = auth.uid() OR is_institution_admin(institution_id));

DROP POLICY IF EXISTS "occurrences_delete" ON occurrences;
CREATE POLICY "occurrences_delete" ON occurrences FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  TO authenticated USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    is_institution_admin(institution_id)
    OR is_institution_teacher(institution_id)
  );

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  TO authenticated USING (recipient_id = auth.uid());

-- ============================================================
-- COMMUNICATIONS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "communications_select" ON communications;
CREATE POLICY "communications_select" ON communications FOR SELECT
  TO authenticated USING (is_institution_member(institution_id));

DROP POLICY IF EXISTS "communications_insert" ON communications;
CREATE POLICY "communications_insert" ON communications FOR INSERT
  TO authenticated WITH CHECK (
    is_institution_admin(institution_id)
    OR is_institution_teacher(institution_id)
  );

DROP POLICY IF EXISTS "communications_update" ON communications;
CREATE POLICY "communications_update" ON communications FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR is_institution_admin(institution_id))
  WITH CHECK (sender_id = auth.uid() OR is_institution_admin(institution_id));

DROP POLICY IF EXISTS "communications_delete" ON communications;
CREATE POLICY "communications_delete" ON communications FOR DELETE
  TO authenticated USING (sender_id = auth.uid() OR is_institution_admin(institution_id));

-- ============================================================
-- EVENTS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT
  TO authenticated USING (is_institution_member(institution_id));

DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT
  TO authenticated WITH CHECK (is_institution_admin(institution_id) OR is_institution_teacher(institution_id));

DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE
  TO authenticated USING (is_institution_admin(institution_id)) WITH CHECK (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE
  TO authenticated USING (is_institution_admin(institution_id));

-- ============================================================
-- AUDIT_LOGS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  TO authenticated USING (is_institution_admin(institution_id));

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);
