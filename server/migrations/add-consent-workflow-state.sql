-- Phase 1: Add consent workflow state columns to appointments table
-- This migration adds the required columns for consent-first consultation flow

-- 1. Add workflow state to appointments
ALTER TABLE appointments 
ADD COLUMN workflowState VARCHAR DEFAULT 'scheduled',
ADD COLUMN requiresConsent BOOLEAN DEFAULT true;

-- 2. Update existing appointments based on current status
UPDATE appointments SET workflowState = 
  CASE 
    WHEN status = 'scheduled' THEN 'scheduled'
    WHEN status = 'completed' THEN 'completed'
    WHEN paymentStatus = 'paid' THEN 'awaiting_consent'
    ELSE 'scheduled'
  END;

-- 3. Enhance consents table for appointment-specific permissions
ALTER TABLE consents 
ADD COLUMN appointmentId UUID REFERENCES appointments(id),
ADD COLUMN scope VARCHAR DEFAULT 'appointment_only';

-- 4. Update permissions structure to include consultation-specific permissions
-- Note: This updates the default permissions structure for new consents
-- Existing consents will keep their current permissions structure
ALTER TABLE consents 
ALTER COLUMN permissions SET DEFAULT '{
  "canVideoCall": false,
  "canChat": false,
  "canViewHistory": false,
  "canWritePrescriptions": false,
  "canOrderTests": false
}';

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_workflow_state ON appointments(workflowState);
CREATE INDEX IF NOT EXISTS idx_appointments_requires_consent ON appointments(requiresConsent);
CREATE INDEX IF NOT EXISTS idx_consents_appointment_id ON consents(appointmentId);
CREATE INDEX IF NOT EXISTS idx_consents_scope ON consents(scope);

-- 6. Add constraint to ensure valid workflow states
ALTER TABLE appointments 
ADD CONSTRAINT chk_workflow_state 
CHECK (workflowState IN (
  'scheduled', 
  'awaiting_consent', 
  'consent_granted', 
  'consultation_started', 
  'completed'
));

-- 7. Add constraint to ensure valid consent scopes
ALTER TABLE consents 
ADD CONSTRAINT chk_consent_scope 
CHECK (scope IN ('appointment_only', 'time_based', 'permanent'));

COMMIT;