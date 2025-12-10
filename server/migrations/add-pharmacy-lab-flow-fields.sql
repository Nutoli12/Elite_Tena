-- Add fields for complete pharmacy and lab flow
-- Run this migration to enable full prescription dispensing and lab result uploading

-- ============================================
-- PRESCRIPTIONS TABLE ENHANCEMENTS
-- ============================================

-- Add status field for prescription workflow
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prescriptions' AND column_name='status') THEN
        ALTER TABLE prescriptions ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        COMMENT ON COLUMN prescriptions.status IS 'Prescription status: active, dispensed, expired, cancelled';
    END IF;
END $$;

-- Add dispensing information
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prescriptions' AND column_name='"dispensedBy"') THEN
        ALTER TABLE prescriptions ADD COLUMN "dispensedBy" VARCHAR(255);
        COMMENT ON COLUMN prescriptions."dispensedBy" IS 'Pharmacist wallet address who dispensed';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prescriptions' AND column_name='"dispensedDate"') THEN
        ALTER TABLE prescriptions ADD COLUMN "dispensedDate" TIMESTAMP;
        COMMENT ON COLUMN prescriptions."dispensedDate" IS 'When medication was dispensed';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prescriptions' AND column_name='"dispensedQuantity"') THEN
        ALTER TABLE prescriptions ADD COLUMN "dispensedQuantity" INTEGER;
        COMMENT ON COLUMN prescriptions."dispensedQuantity" IS 'Actual quantity dispensed';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prescriptions' AND column_name='"dispensingNotes"') THEN
        ALTER TABLE prescriptions ADD COLUMN "dispensingNotes" TEXT;
        COMMENT ON COLUMN prescriptions."dispensingNotes" IS 'Pharmacist notes during dispensing';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prescriptions' AND column_name='"batchNumber"') THEN
        ALTER TABLE prescriptions ADD COLUMN "batchNumber" VARCHAR(100);
        COMMENT ON COLUMN prescriptions."batchNumber" IS 'Medication batch number';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prescriptions' AND column_name='"medicationExpiryDate"') THEN
        ALTER TABLE prescriptions ADD COLUMN "medicationExpiryDate" DATE;
        COMMENT ON COLUMN prescriptions."medicationExpiryDate" IS 'Expiry date of dispensed medication';
    END IF;
END $$;

-- ============================================
-- LAB RESULTS TABLE ENHANCEMENTS
-- ============================================

-- Add status field for lab workflow
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='status') THEN
        ALTER TABLE lab_results ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        COMMENT ON COLUMN lab_results.status IS 'Lab test status: pending, in_progress, completed, cancelled';
    END IF;
END $$;

-- Add test ordering information
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"doctorWalletAddress"') THEN
        ALTER TABLE lab_results ADD COLUMN "doctorWalletAddress" VARCHAR(255);
        COMMENT ON COLUMN lab_results."doctorWalletAddress" IS 'Doctor who ordered the test';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"testName"') THEN
        ALTER TABLE lab_results ADD COLUMN "testName" VARCHAR(255);
        COMMENT ON COLUMN lab_results."testName" IS 'Name of the lab test';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"orderedDate"') THEN
        ALTER TABLE lab_results ADD COLUMN "orderedDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        COMMENT ON COLUMN lab_results."orderedDate" IS 'When test was ordered';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"priority"') THEN
        ALTER TABLE lab_results ADD COLUMN priority VARCHAR(50) DEFAULT 'routine';
        COMMENT ON COLUMN lab_results.priority IS 'Test priority: routine, urgent, stat';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='instructions') THEN
        ALTER TABLE lab_results ADD COLUMN instructions TEXT;
        COMMENT ON COLUMN lab_results.instructions IS 'Special instructions for test (e.g., fasting required)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='reason') THEN
        ALTER TABLE lab_results ADD COLUMN reason TEXT;
        COMMENT ON COLUMN lab_results.reason IS 'Reason for ordering test';
    END IF;
END $$;

-- Add sample collection information
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"sampleId"') THEN
        ALTER TABLE lab_results ADD COLUMN "sampleId" VARCHAR(100);
        COMMENT ON COLUMN lab_results."sampleId" IS 'Unique sample identifier';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"collectedAt"') THEN
        ALTER TABLE lab_results ADD COLUMN "collectedAt" TIMESTAMP;
        COMMENT ON COLUMN lab_results."collectedAt" IS 'When sample was collected';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"collectedBy"') THEN
        ALTER TABLE lab_results ADD COLUMN "collectedBy" VARCHAR(255);
        COMMENT ON COLUMN lab_results."collectedBy" IS 'Lab tech who collected sample';
    END IF;
END $$;

-- Add result completion information
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"completedAt"') THEN
        ALTER TABLE lab_results ADD COLUMN "completedAt" TIMESTAMP;
        COMMENT ON COLUMN lab_results."completedAt" IS 'When results were completed';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"completedBy"') THEN
        ALTER TABLE lab_results ADD COLUMN "completedBy" VARCHAR(255);
        COMMENT ON COLUMN lab_results."completedBy" IS 'Lab tech who completed test';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='"normalRange"') THEN
        ALTER TABLE lab_results ADD COLUMN "normalRange" VARCHAR(255);
        COMMENT ON COLUMN lab_results."normalRange" IS 'Normal range for test values';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='unit') THEN
        ALTER TABLE lab_results ADD COLUMN unit VARCHAR(50);
        COMMENT ON COLUMN lab_results.unit IS 'Unit of measurement';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='interpretation') THEN
        ALTER TABLE lab_results ADD COLUMN interpretation TEXT;
        COMMENT ON COLUMN lab_results.interpretation IS 'Lab tech interpretation of results';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lab_results' AND column_name='attachments') THEN
        ALTER TABLE lab_results ADD COLUMN attachments JSONB;
        COMMENT ON COLUMN lab_results.attachments IS 'Array of file URLs/IPFS hashes';
    END IF;
END $$;

-- Update existing records to have default status
UPDATE prescriptions SET status = 'active' WHERE status IS NULL AND "isFilled" = false;
UPDATE prescriptions SET status = 'dispensed' WHERE status IS NULL AND "isFilled" = true;
UPDATE lab_results SET status = 'pending' WHERE status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_dispensed_by ON prescriptions("dispensedBy");
CREATE INDEX IF NOT EXISTS idx_prescriptions_dispensed_date ON prescriptions("dispensedDate");

CREATE INDEX IF NOT EXISTS idx_lab_results_status ON lab_results(status);
CREATE INDEX IF NOT EXISTS idx_lab_results_doctor ON lab_results("doctorWalletAddress");
CREATE INDEX IF NOT EXISTS idx_lab_results_completed_by ON lab_results("completedBy");
CREATE INDEX IF NOT EXISTS idx_lab_results_ordered_date ON lab_results("orderedDate");

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Pharmacy and Lab flow fields added successfully!';
    RAISE NOTICE '📋 Prescriptions table enhanced with dispensing workflow';
    RAISE NOTICE '🧪 Lab results table enhanced with complete test workflow';
END $$;
