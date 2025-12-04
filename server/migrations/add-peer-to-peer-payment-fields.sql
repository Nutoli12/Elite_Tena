-- ============================================
-- PEER-TO-PEER PAYMENT SYSTEM MIGRATION
-- ============================================
-- This migration adds fields for peer-to-peer payment system
-- System DOES NOT process payments - only facilitates connection

-- ============================================
-- 1. UPDATE APPOINTMENTS TABLE
-- ============================================

-- Add rejection reason for denied requests
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Update payment method enum to include bank_transfer
ALTER TABLE appointments 
ALTER COLUMN "paymentMethod" TYPE VARCHAR(50);

-- Add doctor payment details (JSON)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "doctorPaymentDetails" JSONB;

-- Add payment instructions from doctor
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT;

-- Add payment transaction ID
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "paymentTransactionId" VARCHAR(255);

-- Add payment rejection reason
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "paymentRejectionReason" TEXT;

-- ============================================
-- 2. CREATE DOCTOR PAYMENT SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS doctor_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "doctorWalletAddress" VARCHAR(255) NOT NULL UNIQUE,
  
  -- Telebirr Payment Details
  "telebirrEnabled" BOOLEAN DEFAULT FALSE,
  "telebirrNumber" VARCHAR(50),
  "telebirrName" VARCHAR(255),
  
  -- CBE Birr Payment Details
  "cbeBirrEnabled" BOOLEAN DEFAULT FALSE,
  "cbeBirrAccount" VARCHAR(100),
  "cbeBirrName" VARCHAR(255),
  "cbeBirrBank" VARCHAR(255),
  "cbeBirrBranch" VARCHAR(255),
  
  -- Bank Transfer Details
  "bankTransferEnabled" BOOLEAN DEFAULT FALSE,
  "bankName" VARCHAR(255),
  "bankAccountNumber" VARCHAR(100),
  "bankAccountName" VARCHAR(255),
  "bankBranch" VARCHAR(255),
  
  -- Cash Payment
  "cashEnabled" BOOLEAN DEFAULT TRUE,
  
  -- Service Pricing
  "videoCallFee" DECIMAL(10, 2) DEFAULT 50.00,
  "chatFee" DECIMAL(10, 2) DEFAULT 30.00,
  
  -- Default Instructions
  "defaultPaymentInstructions" TEXT,
  
  -- Auto-approval settings
  "autoApproveVideoCall" BOOLEAN DEFAULT FALSE,
  "autoApproveChat" BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key
  CONSTRAINT fk_doctor_wallet 
    FOREIGN KEY ("doctorWalletAddress") 
    REFERENCES doctors("walletAddress") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctor_payment_settings_wallet 
ON doctor_payment_settings("doctorWalletAddress");

-- ============================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE doctor_payment_settings IS 
'Stores doctor payment details for peer-to-peer payments. System DOES NOT process payments.';

COMMENT ON COLUMN appointments."doctorPaymentDetails" IS 
'Doctor payment details (Telebirr, CBE Birr, etc.) - For patient reference only';

COMMENT ON COLUMN appointments."paymentInstructions" IS 
'Doctor instructions for patient payment - Direct peer-to-peer';

COMMENT ON COLUMN appointments."paymentTransactionId" IS 
'Transaction ID from patient payment receipt';

COMMENT ON COLUMN appointments."paymentRejectionReason" IS 
'Reason if doctor rejects payment proof';

-- ============================================
-- 4. CREATE DEFAULT PAYMENT SETTINGS FOR EXISTING DOCTORS
-- ============================================

INSERT INTO doctor_payment_settings (id, "doctorWalletAddress", "cashEnabled", "videoCallFee", "chatFee")
SELECT 
  gen_random_uuid(),
  "walletAddress",
  TRUE,
  50.00,
  30.00
FROM doctors
WHERE "walletAddress" NOT IN (
  SELECT "doctorWalletAddress" FROM doctor_payment_settings
)
ON CONFLICT ("doctorWalletAddress") DO NOTHING;

-- ============================================
-- 5. UPDATE EXISTING APPOINTMENTS
-- ============================================

-- Set default values for existing appointments
UPDATE appointments
SET 
  "paymentMethod" = 'free'
WHERE "paymentMethod" IS NULL;

UPDATE appointments
SET 
  "requiresApproval" = FALSE
WHERE "requiresApproval" IS NULL;

UPDATE appointments
SET 
  "approvalStatus" = 'pending'
WHERE "approvalStatus" IS NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify tables exist
SELECT 
  'doctor_payment_settings' as table_name,
  COUNT(*) as record_count
FROM doctor_payment_settings
UNION ALL
SELECT 
  'appointments' as table_name,
  COUNT(*) as record_count
FROM appointments;

-- Show sample payment settings
SELECT 
  "doctorWalletAddress",
  "telebirrEnabled",
  "cbeBirrEnabled",
  "videoCallFee",
  "chatFee",
  "cashEnabled"
FROM doctor_payment_settings
LIMIT 5;

COMMIT;
