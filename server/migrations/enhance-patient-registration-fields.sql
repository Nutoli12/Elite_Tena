-- Enhanced Patient Registration Fields Migration
-- This migration adds comprehensive patient registration fields

-- Add gender field to patients table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'gender') THEN
        ALTER TABLE patients ADD COLUMN gender VARCHAR(20);
    END IF;
END $$;

-- Add phone field to patients table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'phone') THEN
        ALTER TABLE patients ADD COLUMN phone VARCHAR(20);
    END IF;
END $$;

-- Add location field to patients table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'location') THEN
        ALTER TABLE patients ADD COLUMN location JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add preferences field to patients table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'preferences') THEN
        ALTER TABLE patients ADD COLUMN preferences JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add registration metadata fields
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'registration_date') THEN
        ALTER TABLE patients ADD COLUMN registration_date TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'registration_method') THEN
        ALTER TABLE patients ADD COLUMN registration_method VARCHAR(20) DEFAULT 'email';
    END IF;
END $$;

-- Update existing patients with default values
UPDATE patients 
SET 
    location = COALESCE(location, '{}'),
    preferences = COALESCE(preferences, '{"language": "English", "emailNotifications": true, "smsNotifications": true}'),
    registration_date = COALESCE(registration_date, "createdAt"),
    registration_method = COALESCE(registration_method, 'email')
WHERE location IS NULL OR preferences IS NULL OR registration_date IS NULL OR registration_method IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN patients.gender IS 'Patient gender (Male, Female)';
COMMENT ON COLUMN patients.phone IS 'Patient phone number (Ethiopian format: +2519XXXXXXXX)';
COMMENT ON COLUMN patients.location IS 'Patient location data (region, city)';
COMMENT ON COLUMN patients.preferences IS 'Patient preferences (language, notifications)';
COMMENT ON COLUMN patients.registration_date IS 'When the patient registered';
COMMENT ON COLUMN patients.registration_method IS 'How the patient registered (email, wallet)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_location ON patients USING GIN (location);
CREATE INDEX IF NOT EXISTS idx_patients_preferences ON patients USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_patients_registration_date ON patients (registration_date);

COMMIT;