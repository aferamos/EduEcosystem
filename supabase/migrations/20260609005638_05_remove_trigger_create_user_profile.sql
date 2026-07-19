/*
# Remove trigger-based profile creation and handle manual creation

The trigger on_auth_user_created was failing because it runs during auth.signUp
where auth.uid() is null, causing RLS violations on profiles insert.

We remove the trigger and handle profile/settings/mfa creation in the app/API layer.
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function but it won't auto-trigger anymore
-- DROP FUNCTION IF EXISTS handle_new_user();

-- Ensure profiles RLS allows insert for new users (before auth session is active)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'profiles_insert_self'
  ) THEN
    CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
      TO anon WITH CHECK (true);
  END IF;
END $$;

-- Ensure user_settings RLS allows insert for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings'
    AND policyname = 'user_settings_insert_self'
  ) THEN
    CREATE POLICY "user_settings_insert_self" ON user_settings FOR INSERT
      TO anon WITH CHECK (true);
  END IF;
END $$;

-- Ensure user_mfa RLS allows insert for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_mfa'
    AND policyname = 'user_mfa_insert_self'
  ) THEN
    CREATE POLICY "user_mfa_insert_self" ON user_mfa FOR INSERT
      TO anon WITH CHECK (true);
  END IF;
END $$;
