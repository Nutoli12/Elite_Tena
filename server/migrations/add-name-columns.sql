-- Add name columns to users and patients tables
-- This allows storing patient names directly instead of only in profileData

-- Add name column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='name') THEN
        ALTER TABLE users ADD COLUMN name VARCHAR(255);
        COMMENT ON COLUMN users.name IS 'User full name';
    END IF;
END $$;

-- Add name column to patients table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='patients' AND column_name='name') THEN
        ALTER TABLE patients ADD COLUMN name VARCHAR(255);
        COMMENT ON COLUMN patients.name IS 'Patient full name';
    END IF;
END $$;

-- Add name column to doctors table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='doctors' AND column_name='name') THEN
        ALTER TABLE doctors ADD COLUMN name VARCHAR(255);
        COMMENT ON COLUMN doctors.name IS 'Doctor full name';
    END IF;
END $$;

-- Migrate existing names from profileData to name column for users
UPDATE users 
SET name = profileData->>'fullName' 
WHERE name IS NULL 
  AND profileData IS NOT NULL 
  AND profileData->>'fullName' IS NOT NULL
  AND profileData->>'fullName' != 'User';

-- Extract names from email for users without names
UPDATE users 
SET name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE name IS NULL 
  AND email IS NOT NULL;

-- Set default name for any remaining users
UPDATE users 
SET name = 'User'
WHERE name IS NULL;

COMMENT ON TABLE users IS 'Users table with name column for easy access';
COMMENT ON TABLE patients IS 'Patients table with name column for easy access';
COMMENT ON TABLE doctors IS 'Doctors table with name column for easy access';
