-- ============================================================================
-- PRESCRIPTION ACCESS CONTROL SYSTEM
-- Web3 Patient-Owned Prescription Data with Time-Limited Pharmacy Access
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create prescription_access_grants table
CREATE TABLE IF NOT EXISTS prescription_access_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core References
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_wallet_address VARCHAR(42) NOT NULL,
  pharmacist_wallet_address VARCHAR(42),  -- NULL for QR codes (not yet scanned)
  pharmacy_name VARCHAR(255),  -- Optional: pharmacy name
  
  -- Access Control
  access_method VARCHAR(50) NOT NULL CHECK (access_method IN ('quick_approve', 'manual_grant', 'qr_code', 'emergency')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  
  -- Timing
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,  -- When prescription was dispensed
  revoked_at TIMESTAMP,  -- If patient revoked access
  
  -- QR Code Specific
  qr_code_token VARCHAR(255) UNIQUE,  -- Unique token for QR code
  qr_code_validity_hours INTEGER,  -- How long QR code is valid
  qr_code_generated_at TIMESTAMP,
  qr_code_scanned_at TIMESTAMP,
  qr_code_regeneration_count INTEGER DEFAULT 0,  -- Track regenerations
  
  -- Emergency Override
  is_emergency BOOLEAN DEFAULT FALSE,
  emergency_reason TEXT,
  emergency_confirmed_by_patient BOOLEAN DEFAULT FALSE,
  emergency_confirmed_at TIMESTAMP,
  
  -- Audit
  patient_note TEXT,  -- Optional note from patient
  pharmacist_note TEXT,  -- Optional note from pharmacist
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pag_prescription_id ON prescription_access_grants(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pag_patient_wallet ON prescription_access_grants(patient_wallet_address);
CREATE INDEX IF NOT EXISTS idx_pag_pharmacist_wallet ON prescription_access_grants(pharmacist_wallet_address);
CREATE INDEX IF NOT EXISTS idx_pag_qr_token ON prescription_access_grants(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_pag_status ON prescription_access_grants(status);
CREATE INDEX IF NOT EXISTS idx_pag_expires_at ON prescription_access_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_pag_access_method ON prescription_access_grants(access_method);

-- Add new columns to prescriptions table
ALTER TABLE prescriptions 
  ADD COLUMN IF NOT EXISTS access_control_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS suggested_pharmacy_wallet VARCHAR(42),
  ADD COLUMN IF NOT EXISTS suggested_pharmacy_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS requires_patient_approval BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS patient_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS access_grant_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_access_granted_at TIMESTAMP;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prescription_access_grants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_prescription_access_grants_updated_at ON prescription_access_grants;
CREATE TRIGGER trigger_update_prescription_access_grants_updated_at
  BEFORE UPDATE ON prescription_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION update_prescription_access_grants_updated_at();

-- Create function to update prescription access_grant_count
CREATE OR REPLACE FUNCTION update_prescription_access_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prescriptions 
    SET 
      access_grant_count = access_grant_count + 1,
      last_access_granted_at = NEW.granted_at
    WHERE id = NEW.prescription_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prescriptions 
    SET access_grant_count = GREATEST(0, access_grant_count - 1)
    WHERE id = OLD.prescription_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating prescription access count
DROP TRIGGER IF EXISTS trigger_update_prescription_access_count ON prescription_access_grants;
CREATE TRIGGER trigger_update_prescription_access_count
  AFTER INSERT OR DELETE ON prescription_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION update_prescription_access_count();

-- Add comments for documentation
COMMENT ON TABLE prescription_access_grants IS 'Manages time-limited access grants for prescriptions - enables patient-controlled data sharing';
COMMENT ON COLUMN prescription_access_grants.access_method IS 'How access was granted: quick_approve, manual_grant, qr_code, emergency';
COMMENT ON COLUMN prescription_access_grants.status IS 'Current status: active, used, expired, revoked';
COMMENT ON COLUMN prescription_access_grants.qr_code_token IS 'Unique token for QR code-based access (can be regenerated)';
COMMENT ON COLUMN prescription_access_grants.is_emergency IS 'True if this was an emergency override access';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Prescription Access Control System tables created successfully';
  RAISE NOTICE 'Table: prescription_access_grants';
  RAISE NOTICE 'Triggers: Auto-update timestamps and access counts';
  RAISE NOTICE 'Indexes: Optimized for wallet addresses, QR tokens, and status queries';
END $$;
