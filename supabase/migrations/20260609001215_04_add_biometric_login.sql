/*
# Add biometric_login column to user_settings

Adds a missing column referenced by the biometric authentication service.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'biometric_login'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN biometric_login boolean NOT NULL DEFAULT false;
  END IF;
END $$;
