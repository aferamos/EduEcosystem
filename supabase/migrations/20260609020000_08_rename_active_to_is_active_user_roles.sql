/*
# Rename user_roles.active → user_roles.is_active

The column in the live database is named 'is_active', but migrations and code
referenced it as 'active'. This migration aligns the database with reality by
renaming the column (if it still exists as 'active') or ensuring 'is_active'
exists, then re-creates the helper functions that reference it.
*/

-- Rename column only if the old name still exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_roles RENAME COLUMN active TO is_active;
  END IF;
END $$;

-- Ensure is_active exists with correct default (in case neither existed)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Re-create helper functions using is_active
CREATE OR REPLACE FUNCTION get_user_institution_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT coalesce(array_agg(institution_id), '{}')
  FROM user_roles
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION is_institution_admin(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND institution_id = inst_id
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_institution_teacher(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND institution_id = inst_id
    AND role = 'teacher'
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_institution_member(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND institution_id = inst_id
    AND is_active = true
  );
$$;
