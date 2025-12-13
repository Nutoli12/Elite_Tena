-- Add missing columns to doctor_payment_settings table
-- These columns are needed for the DoctorSettings frontend

-- Add telebirrEnabled column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "telebirrEnabled" BOOLEAN DEFAULT false;

-- Add cbeBirrEnabled column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "cbeBirrEnabled" BOOLEAN DEFAULT false;

-- Add cbeBirrAccount column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "cbeBirrAccount" VARCHAR(50);

-- Add bankTransferEnabled column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "bankTransferEnabled" BOOLEAN DEFAULT false;

-- Add cashEnabled column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "cashEnabled" BOOLEAN DEFAULT true;

-- Add bankName column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "bankName" VARCHAR(100);

-- Add bankAccountNumber column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "bankAccountNumber" VARCHAR(50);

-- Add bankAccountName column
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS "bankAccountName" VARCHAR(100);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'doctor_payment_settings'
ORDER BY ordinal_position;
