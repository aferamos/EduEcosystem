/*
# Fix institutions RLS for anon signup flow

During signup (via auth.signUp), the user has a session but is not yet
considered 'authenticated' by the auth trigger. We need to allow anon to insert
institutions and user_roles so the signup flow works correctly.

We also add a policy to let any anon insert into user_roles for the same reason.
*/

-- Allow anon to insert institutions (so signup flow works)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'institutions'
    AND policyname = 'institutions_insert_anon'
  ) THEN
    CREATE POLICY "institutions_insert_anon" ON institutions FOR INSERT
      TO anon WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to insert user_roles (so signup flow works)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
    AND policyname = 'user_roles_insert_anon'
  ) THEN
    CREATE POLICY "user_roles_insert_anon" ON user_roles FOR INSERT
      TO anon WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to insert user_active_context (so signup flow works)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_active_context'
    AND policyname = 'user_active_context_insert_anon'
  ) THEN
    CREATE POLICY "user_active_context_insert_anon" ON user_active_context FOR INSERT
      TO anon WITH CHECK (true);
  END IF;
END $$;
