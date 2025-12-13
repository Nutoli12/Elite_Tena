-- Fix missing consent_id column in appointment_consents table
ALTER TABLE appointment_consents 
ADD COLUMN IF NOT EXISTS consent_id UUID REFERENCES consents(id) ON DELETE SET NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_appointment_consents_consent ON appointment_consents(consent_id);

-- Show completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed appointment_consents schema - added consent_id column';
END $$;