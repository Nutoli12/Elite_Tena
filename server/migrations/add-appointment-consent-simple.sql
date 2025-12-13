-- Simple appointment consent migration that works with existing schema
-- Add consent status tracking to appointments table

-- Add consent status tracking to appointments table (using VARCHAR since workflow_state is VARCHAR)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS consent_status VARCHAR(50) DEFAULT 'not_requested';

-- Add consent required flag (defaults to true for all consultations)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT TRUE;

-- Add consent expiry tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS consent_expires_at TIMESTAMP WITH TIME ZONE;

-- Add consent granted timestamp
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS consent_granted_at TIMESTAMP WITH TIME ZONE;

-- Update existing appointments to have proper consent status
UPDATE appointments 
SET consent_status = 'not_requested', 
    consent_required = TRUE 
WHERE consent_status IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_consent_status ON appointments(consent_status);
CREATE INDEX IF NOT EXISTS idx_appointments_consent_required ON appointments(consent_required);
CREATE INDEX IF NOT EXISTS idx_appointments_workflow_consent ON appointments(workflow_state, consent_status);

-- Create appointment-specific consent tracking table
CREATE TABLE IF NOT EXISTS appointment_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to appointment and existing consent system
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  consent_id UUID REFERENCES consents(id) ON DELETE SET NULL,
  
  -- Appointment-specific consent data
  patient_wallet_address VARCHAR(255) NOT NULL,
  doctor_wallet_address VARCHAR(255) NOT NULL,
  
  -- Consent workflow tracking
  status VARCHAR(50) NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'granted', 'denied', 'expired', 'revoked'
  )),
  
  -- Appointment-specific permissions
  permissions JSONB NOT NULL DEFAULT '{
    "allow_consultation": true,
    "allow_medical_history_view": true,
    "allow_prescription_write": false,
    "allow_lab_test_order": false,
    "allow_diagnosis_recording": true,
    "allow_video_call": false,
    "allow_chat": false,
    "valid_for_hours": 24,
    "purpose": "Consultation for this appointment"
  }'::jsonb,
  
  -- Purpose and context
  purpose TEXT NOT NULL DEFAULT 'Consultation consent for appointment',
  consultation_type VARCHAR(100),
  
  -- Timing
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  granted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(appointment_id), -- One consent per appointment
  FOREIGN KEY (patient_wallet_address) REFERENCES patients("walletAddress"),
  FOREIGN KEY (doctor_wallet_address) REFERENCES doctors("walletAddress")
);

-- Create indexes for appointment consents
CREATE INDEX IF NOT EXISTS idx_appointment_consents_appointment ON appointment_consents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_consents_patient ON appointment_consents(patient_wallet_address);
CREATE INDEX IF NOT EXISTS idx_appointment_consents_doctor ON appointment_consents(doctor_wallet_address);
CREATE INDEX IF NOT EXISTS idx_appointment_consents_status ON appointment_consents(status);
CREATE INDEX IF NOT EXISTS idx_appointment_consents_expires ON appointment_consents(expires_at);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_appointment_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_appointment_consents_updated_at ON appointment_consents;
CREATE TRIGGER update_appointment_consents_updated_at 
  BEFORE UPDATE ON appointment_consents
  FOR EACH ROW EXECUTE FUNCTION update_appointment_consents_updated_at();

-- Create function to sync appointment consent status
CREATE OR REPLACE FUNCTION sync_appointment_consent_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update appointment consent_status when appointment_consents changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE appointments 
    SET 
      consent_status = NEW.status,
      consent_granted_at = NEW.granted_at,
      consent_expires_at = NEW.expires_at,
      workflow_state = CASE 
        WHEN NEW.status = 'granted' THEN 'consent_granted'
        WHEN NEW.status = 'requested' THEN 'awaiting_consent'
        ELSE workflow_state
      END
    WHERE id = NEW.appointment_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync appointment status
DROP TRIGGER IF EXISTS sync_appointment_consent_status_trigger ON appointment_consents;
CREATE TRIGGER sync_appointment_consent_status_trigger
  AFTER INSERT OR UPDATE ON appointment_consents
  FOR EACH ROW EXECUTE FUNCTION sync_appointment_consent_status();

-- Add comments for documentation
COMMENT ON TABLE appointment_consents IS 'Appointment-specific consent tracking for clean workflow management';
COMMENT ON COLUMN appointments.consent_status IS 'Appointment-specific consent status for clean workflow tracking';
COMMENT ON COLUMN appointments.consent_required IS 'Whether this appointment requires patient consent before consultation';

-- Show completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Appointment consent system migration completed successfully!';
  RAISE NOTICE '📋 Added: appointment_consents table and consent tracking columns';
  RAISE NOTICE '🔄 Triggers created for automatic status synchronization';
END $$;