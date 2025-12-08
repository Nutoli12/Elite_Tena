-- Enhanced Consent Management System Migration
-- This migration adds comprehensive consent management features

-- Drop existing consent table if exists and recreate with enhanced fields
DROP TABLE IF EXISTS consents CASCADE;

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  "patientWalletAddress" VARCHAR(255) NOT NULL REFERENCES patients("walletAddress") ON DELETE CASCADE,
  "doctorWalletAddress" VARCHAR(255) NOT NULL REFERENCES doctors("walletAddress") ON DELETE CASCADE,
  "appointmentId" UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Consent Status State Machine
  status VARCHAR(50) NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested',        -- Doctor requested access
    'pending',          -- Waiting patient approval
    'active',           -- Access granted
    'limited',          -- Restricted access
    'emergency',        -- Emergency override
    'expired',          -- Time limit reached
    'auto_revoked',     -- System auto-revoked
    'patient_revoked',  -- Patient manually revoked
    'doctor_revoked',   -- Doctor ended access
    'admin_revoked'     -- Admin revoked
  )),
  
  -- Access Level Hierarchy
  "accessLevel" VARCHAR(50) NOT NULL DEFAULT 'STANDARD' CHECK ("accessLevel" IN (
    'NONE', 'EMERGENCY', 'LIMITED', 'STANDARD', 'PERMANENT'
  )),
  
  -- Consent Types (stored as array)
  "consentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Granular Permissions (stored as JSONB)
  permissions JSONB NOT NULL DEFAULT '{
    "viewMedicalHistory": false,
    "viewLabResults": false,
    "viewPrescriptions": false,
    "addConsultationNotes": false,
    "orderTests": false,
    "writePrescriptions": false,
    "shareWithColleagues": false,
    "exportRecords": false,
    "deleteRecords": false
  }'::jsonb,
  
  -- Purpose and Justification
  purpose TEXT NOT NULL,
  "requestReason" TEXT,
  
  -- Time Management
  "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "grantedAt" TIMESTAMP WITH TIME ZONE,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "revokedAt" TIMESTAMP WITH TIME ZONE,
  "lastAccessedAt" TIMESTAMP WITH TIME ZONE,
  
  -- Duration Settings
  "durationType" VARCHAR(50) NOT NULL DEFAULT 'hours' CHECK ("durationType" IN (
    'appointment_only', 'hours', 'days', 'weeks', 'months', 'permanent'
  )),
  "durationValue" INTEGER NOT NULL DEFAULT 24,
  
  -- Revocation Details
  "revocationReason" TEXT,
  "revokedBy" VARCHAR(255),
  
  -- Blockchain Integration
  "blockchainTxHash" VARCHAR(255),
  "revocationTxHash" VARCHAR(255),
  
  -- Audit Trail
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "recordsViewed" INTEGER NOT NULL DEFAULT 0,
  "actionsPerformed" JSONB DEFAULT '[]'::jsonb,
  
  -- Emergency Override
  "isEmergency" BOOLEAN NOT NULL DEFAULT false,
  "emergencyJustification" TEXT,
  
  -- Auto-grant Settings
  "isAutoGranted" BOOLEAN NOT NULL DEFAULT false,
  "autoGrantReason" VARCHAR(255),
  
  -- Additional Notes
  notes TEXT,
  "patientNotes" TEXT,
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_consents_patient ON consents("patientWalletAddress");
CREATE INDEX idx_consents_doctor ON consents("doctorWalletAddress");
CREATE INDEX idx_consents_status ON consents(status);
CREATE INDEX idx_consents_appointment ON consents("appointmentId");
CREATE INDEX idx_consents_expires ON consents("expiresAt");
CREATE INDEX idx_consents_active ON consents(status, "expiresAt") WHERE status = 'active';

-- Create audit log table for consent access tracking
CREATE TABLE IF NOT EXISTS consent_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "consentId" UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  "doctorWalletAddress" VARCHAR(255) NOT NULL,
  "patientWalletAddress" VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  "ipAddress" VARCHAR(50),
  "userAgent" TEXT,
  "accessedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_consent ON consent_audit_logs("consentId");
CREATE INDEX idx_audit_doctor ON consent_audit_logs("doctorWalletAddress");
CREATE INDEX idx_audit_patient ON consent_audit_logs("patientWalletAddress");
CREATE INDEX idx_audit_accessed ON consent_audit_logs("accessedAt");

-- Create patient consent preferences table
CREATE TABLE IF NOT EXISTS patient_consent_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientWalletAddress" VARCHAR(255) NOT NULL UNIQUE REFERENCES patients("walletAddress") ON DELETE CASCADE,
  
  -- Default Settings
  "autoPermitEmergency" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnAccess" BOOLEAN NOT NULL DEFAULT true,
  "weeklyAccessReport" BOOLEAN NOT NULL DEFAULT true,
  "autoPermitAnyDoctor" BOOLEAN NOT NULL DEFAULT false,
  
  -- Emergency Override Settings
  "allowERDoctors" BOOLEAN NOT NULL DEFAULT true,
  "maxEmergencyAccessHours" INTEGER NOT NULL DEFAULT 2,
  "notifyImmediatelyEmergency" BOOLEAN NOT NULL DEFAULT true,
  "requireAuditLog" BOOLEAN NOT NULL DEFAULT true,
  
  -- Special Rules (stored as JSONB array)
  "specialRules" JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_prefs_patient ON patient_consent_preferences("patientWalletAddress");

-- Insert default consent preferences for existing patients
INSERT INTO patient_consent_preferences ("patientWalletAddress")
SELECT "walletAddress" FROM patients
ON CONFLICT ("patientWalletAddress") DO NOTHING;

-- Create function to auto-update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updatedAt
CREATE TRIGGER update_consents_updated_at BEFORE UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_prefs_updated_at BEFORE UPDATE ON patient_consent_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-expire consents
CREATE OR REPLACE FUNCTION auto_expire_consents()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE consents
  SET status = 'expired'
  WHERE status = 'active'
    AND "expiresAt" IS NOT NULL
    AND "expiresAt" < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE consents IS 'Comprehensive consent management with state machine and audit trail';
COMMENT ON TABLE consent_audit_logs IS 'Detailed audit log of all consent-related access and actions';
COMMENT ON TABLE patient_consent_preferences IS 'Patient-specific consent preferences and rules';
COMMENT ON FUNCTION auto_expire_consents() IS 'Function to automatically expire old consents (call from cron job)';

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON consents TO your_app_user;
-- GRANT ALL ON consent_audit_logs TO your_app_user;
-- GRANT ALL ON patient_consent_preferences TO your_app_user;
