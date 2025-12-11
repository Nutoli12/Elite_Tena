-- Add blockchain integration fields to all models
-- Migration: Add blockchain fields for TRUE Web3 integration
-- Date: December 10, 2025

-- Medical Records blockchain fields
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS "blockchainTxHash" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "blockNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "gasUsed" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "onBlockchain" BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN medical_records."blockchainTxHash" IS 'Blockchain transaction hash';
COMMENT ON COLUMN medical_records."blockNumber" IS 'Block number where transaction was mined';
COMMENT ON COLUMN medical_records."gasUsed" IS 'Gas used for blockchain transaction';
COMMENT ON COLUMN medical_records."onBlockchain" IS 'Whether this record is stored on blockchain';

-- Prescriptions blockchain fields
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS "ipfsHash" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "blockchainTxHash" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "blockchainPrescriptionId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "blockNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "gasUsed" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "onBlockchain" BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN prescriptions."ipfsHash" IS 'IPFS hash for prescription data';
COMMENT ON COLUMN prescriptions."blockchainTxHash" IS 'Blockchain transaction hash';
COMMENT ON COLUMN prescriptions."blockchainPrescriptionId" IS 'Blockchain-generated prescription ID';
COMMENT ON COLUMN prescriptions."blockNumber" IS 'Block number where transaction was mined';
COMMENT ON COLUMN prescriptions."gasUsed" IS 'Gas used for blockchain transaction';
COMMENT ON COLUMN prescriptions."onBlockchain" IS 'Whether this prescription is stored on blockchain';

-- Consents blockchain fields (some already exist, add missing ones)
ALTER TABLE consents 
ADD COLUMN IF NOT EXISTS "blockNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "gasUsed" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "onBlockchain" BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN consents."blockNumber" IS 'Block number where consent transaction was mined';
COMMENT ON COLUMN consents."gasUsed" IS 'Gas used for blockchain transaction';
COMMENT ON COLUMN consents."onBlockchain" IS 'Whether this consent is stored on blockchain';

-- Lab Results blockchain fields
ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS "ipfsHash" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "blockchainTxHash" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "blockchainLabResultId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "blockNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "gasUsed" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "onBlockchain" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "labTechWalletAddress" VARCHAR(255);

COMMENT ON COLUMN lab_results."ipfsHash" IS 'IPFS hash for lab result data';
COMMENT ON COLUMN lab_results."blockchainTxHash" IS 'Blockchain transaction hash';
COMMENT ON COLUMN lab_results."blockchainLabResultId" IS 'Blockchain-generated lab result ID';
COMMENT ON COLUMN lab_results."blockNumber" IS 'Block number where transaction was mined';
COMMENT ON COLUMN lab_results."gasUsed" IS 'Gas used for blockchain transaction';
COMMENT ON COLUMN lab_results."onBlockchain" IS 'Whether this lab result is stored on blockchain';
COMMENT ON COLUMN lab_results."labTechWalletAddress" IS 'Lab technician wallet address';

-- Appointments blockchain fields (some already exist, add missing ones)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "blockNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "gasUsed" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "onBlockchain" BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN appointments."blockNumber" IS 'Block number where payment transaction was mined';
COMMENT ON COLUMN appointments."gasUsed" IS 'Gas used for blockchain payment transaction';
COMMENT ON COLUMN appointments."onBlockchain" IS 'Whether this appointment payment is on blockchain';

-- Create indexes for blockchain fields for better performance
CREATE INDEX IF NOT EXISTS idx_medical_records_blockchain_tx ON medical_records("blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_medical_records_on_blockchain ON medical_records("onBlockchain");

CREATE INDEX IF NOT EXISTS idx_prescriptions_blockchain_tx ON prescriptions("blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_prescriptions_blockchain_id ON prescriptions("blockchainPrescriptionId");
CREATE INDEX IF NOT EXISTS idx_prescriptions_on_blockchain ON prescriptions("onBlockchain");

CREATE INDEX IF NOT EXISTS idx_consents_blockchain_tx ON consents("blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_consents_on_blockchain ON consents("onBlockchain");

CREATE INDEX IF NOT EXISTS idx_lab_results_blockchain_tx ON lab_results("blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_lab_results_blockchain_id ON lab_results("blockchainLabResultId");
CREATE INDEX IF NOT EXISTS idx_lab_results_on_blockchain ON lab_results("onBlockchain");

CREATE INDEX IF NOT EXISTS idx_appointments_blockchain_tx ON appointments("blockchainTxHash");
CREATE INDEX IF NOT EXISTS idx_appointments_on_blockchain ON appointments("onBlockchain");

-- Update existing records to mark them as non-blockchain (legacy data)
UPDATE medical_records SET "onBlockchain" = FALSE WHERE "blockchainTxHash" IS NULL;
UPDATE prescriptions SET "onBlockchain" = FALSE WHERE "blockchainTxHash" IS NULL;
UPDATE consents SET "onBlockchain" = FALSE WHERE "blockchainTxHash" IS NULL;
UPDATE lab_results SET "onBlockchain" = FALSE WHERE "blockchainTxHash" IS NULL;
UPDATE appointments SET "onBlockchain" = FALSE WHERE "blockchainTxHash" IS NULL;

-- Add constraints to ensure blockchain data integrity
ALTER TABLE medical_records 
ADD CONSTRAINT chk_medical_records_blockchain_integrity 
CHECK (
  ("onBlockchain" = TRUE AND "blockchainTxHash" IS NOT NULL AND "ipfsHash" IS NOT NULL) OR
  ("onBlockchain" = FALSE)
);

ALTER TABLE prescriptions 
ADD CONSTRAINT chk_prescriptions_blockchain_integrity 
CHECK (
  ("onBlockchain" = TRUE AND "blockchainTxHash" IS NOT NULL AND "ipfsHash" IS NOT NULL) OR
  ("onBlockchain" = FALSE)
);

ALTER TABLE consents 
ADD CONSTRAINT chk_consents_blockchain_integrity 
CHECK (
  ("onBlockchain" = TRUE AND "blockchainTxHash" IS NOT NULL) OR
  ("onBlockchain" = FALSE)
);

ALTER TABLE lab_results 
ADD CONSTRAINT chk_lab_results_blockchain_integrity 
CHECK (
  ("onBlockchain" = TRUE AND "blockchainTxHash" IS NOT NULL AND "ipfsHash" IS NOT NULL) OR
  ("onBlockchain" = FALSE)
);

ALTER TABLE appointments 
ADD CONSTRAINT chk_appointments_blockchain_integrity 
CHECK (
  ("onBlockchain" = TRUE AND "blockchainTxHash" IS NOT NULL) OR
  ("onBlockchain" = FALSE)
);

-- Success message
SELECT 'Blockchain fields added successfully to all models' AS migration_status;