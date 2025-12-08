-- Fix Missing Columns Migration
-- This migration adds columns that were defined in models but missing from the database

-- 1. Add metadata column to medical_records table
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "relatedId" VARCHAR(255) DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "relatedType" VARCHAR(255) DEFAULT NULL;

-- 3. Add expiresAt column to notifications if missing
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 4. Add name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT NULL;

-- 5. Add name and specialty columns to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialty VARCHAR(255) DEFAULT NULL;

-- 6. Add name column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT NULL;

-- Verify columns were added
SELECT 
    'medical_records' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'medical_records' AND column_name = 'metadata'
UNION ALL
SELECT 
    'notifications' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'notifications' AND column_name IN ('data', 'relatedId', 'relatedType', 'expiresAt');

-- Comment for documentation
COMMENT ON COLUMN medical_records.metadata IS 'Additional metadata for the medical record (JSON format)';
COMMENT ON COLUMN notifications.data IS 'Additional data for the notification (JSON format)';
COMMENT ON COLUMN notifications."relatedId" IS 'ID of the related entity (consent, appointment, etc.)';
COMMENT ON COLUMN notifications."relatedType" IS 'Type of the related entity';
