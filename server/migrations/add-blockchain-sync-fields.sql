-- Add blockchain sync tracking fields
-- This migration adds fields to track the sync status from demo to real blockchain

-- Medical Records sync fields
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS "syncedToBlockchain" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "syncRetryCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastSyncAttempt" TIMESTAMP;

-- Consents sync fields  
ALTER TABLE consents
ADD COLUMN IF NOT EXISTS "syncedToBlockchain" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "syncRetryCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastSyncAttempt" TIMESTAMP;

-- Prescriptions sync fields
ALTER TABLE prescriptions
ADD COLUMN IF NOT EXISTS "syncedToBlockchain" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "syncRetryCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastSyncAttempt" TIMESTAMP;

-- Lab Results sync fields
ALTER TABLE lab_results
ADD COLUMN IF NOT EXISTS "syncedToBlockchain" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "syncRetryCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastSyncAttempt" TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_medical_records_sync_status ON medical_records("onBlockchain", "syncedToBlockchain", "blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_consents_sync_status ON consents("onBlockchain", "syncedToBlockchain", "blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_prescriptions_sync_status ON prescriptions("onBlockchain", "syncedToBlockchain", "blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_lab_results_sync_status ON lab_results("onBlockchain", "syncedToBlockchain", "blockchainTxHash");

-- Add comments
COMMENT ON COLUMN medical_records."syncedToBlockchain" IS 'Whether demo record has been synced to real blockchain';
COMMENT ON COLUMN medical_records."syncedAt" IS 'When the record was successfully synced to real blockchain';
COMMENT ON COLUMN medical_records."syncRetryCount" IS 'Number of sync attempts (max 3)';
COMMENT ON COLUMN medical_records."lastSyncAttempt" IS 'Last time sync was attempted';