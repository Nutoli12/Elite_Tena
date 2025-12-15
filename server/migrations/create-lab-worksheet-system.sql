-- Lab Worksheet System Migration (PostgreSQL)
-- Creates tables for proper medical lab workflow with worksheets, sample collection, and processing records

-- Create lab_worksheets table
CREATE TABLE IF NOT EXISTS lab_worksheets (
    id SERIAL PRIMARY KEY,
    "accessionNumber" VARCHAR(50) NOT NULL UNIQUE,
    "labOrderId" INTEGER NOT NULL,
    "technicianId" VARCHAR(42) NOT NULL,
    "sampleCollectionStatus" VARCHAR(20) DEFAULT 'pending' CHECK ("sampleCollectionStatus" IN ('pending', 'collected', 'rejected', 'insufficient')),
    "processingStatus" VARCHAR(20) DEFAULT 'queued' CHECK ("processingStatus" IN ('queued', 'in_progress', 'completed', 'failed', 'on_hold')),
    "sampleCollectedAt" TIMESTAMP,
    "processingStartedAt" TIMESTAMP,
    "processingCompletedAt" TIMESTAMP,
    "instrumentUsed" VARCHAR(100),
    "chainOfCustody" JSONB DEFAULT '[]',
    "qualityControlChecks" JSONB DEFAULT '{}',
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sample_collections table
CREATE TABLE IF NOT EXISTS sample_collections (
    id SERIAL PRIMARY KEY,
    "worksheetId" INTEGER NOT NULL,
    "sampleType" VARCHAR(100) NOT NULL,
    "collectionMethod" VARCHAR(100),
    "sampleVolume" DECIMAL(10,2),
    "containerType" VARCHAR(100),
    "storageLocation" VARCHAR(100),
    "collectedBy" VARCHAR(100) NOT NULL,
    "collectionDateTime" TIMESTAMP NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    "specialHandling" TEXT,
    "sampleCondition" VARCHAR(20) DEFAULT 'good' CHECK ("sampleCondition" IN ('good', 'hemolyzed', 'clotted', 'insufficient', 'contaminated')),
    "temperatureAtCollection" DECIMAL(5,2),
    "collectionNotes" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("worksheetId") REFERENCES lab_worksheets(id) ON DELETE CASCADE
);

-- Create processing_records table
CREATE TABLE IF NOT EXISTS processing_records (
    id SERIAL PRIMARY KEY,
    "worksheetId" INTEGER NOT NULL,
    "instrumentId" VARCHAR(100) NOT NULL,
    "operatorId" VARCHAR(42) NOT NULL,
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP,
    "processingMethod" VARCHAR(200),
    "instrumentSettings" JSONB DEFAULT '{}',
    "environmentalConditions" JSONB DEFAULT '{}',
    "qualityControlResults" JSONB DEFAULT '{}',
    "calibrationData" JSONB DEFAULT '{}',
    "processingStatus" VARCHAR(20) DEFAULT 'started' CHECK ("processingStatus" IN ('started', 'in_progress', 'completed', 'failed', 'aborted')),
    "errorLog" TEXT,
    "processingNotes" TEXT,
    "rawDataPath" VARCHAR(500),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("worksheetId") REFERENCES lab_worksheets(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lab_worksheets_accession ON lab_worksheets("accessionNumber");
CREATE INDEX IF NOT EXISTS idx_lab_worksheets_order ON lab_worksheets("labOrderId");
CREATE INDEX IF NOT EXISTS idx_lab_worksheets_technician ON lab_worksheets("technicianId");
CREATE INDEX IF NOT EXISTS idx_lab_worksheets_sample_status ON lab_worksheets("sampleCollectionStatus");
CREATE INDEX IF NOT EXISTS idx_lab_worksheets_processing_status ON lab_worksheets("processingStatus");
CREATE INDEX IF NOT EXISTS idx_lab_worksheets_created ON lab_worksheets("createdAt");

CREATE INDEX IF NOT EXISTS idx_sample_collections_worksheet ON sample_collections("worksheetId");
CREATE INDEX IF NOT EXISTS idx_sample_collections_type ON sample_collections("sampleType");
CREATE INDEX IF NOT EXISTS idx_sample_collections_datetime ON sample_collections("collectionDateTime");
CREATE INDEX IF NOT EXISTS idx_sample_collections_barcode ON sample_collections(barcode);

CREATE INDEX IF NOT EXISTS idx_processing_records_worksheet ON processing_records("worksheetId");
CREATE INDEX IF NOT EXISTS idx_processing_records_instrument ON processing_records("instrumentId");
CREATE INDEX IF NOT EXISTS idx_processing_records_operator ON processing_records("operatorId");
CREATE INDEX IF NOT EXISTS idx_processing_records_start ON processing_records("startTime");
CREATE INDEX IF NOT EXISTS idx_processing_records_status ON processing_records("processingStatus");

-- Insert some sample data for testing (PostgreSQL syntax)
INSERT INTO lab_worksheets (
    "accessionNumber", "labOrderId", "technicianId", "sampleCollectionStatus", "processingStatus", 
    "chainOfCustody", "qualityControlChecks", notes, "createdAt", "updatedAt"
) VALUES 
('LAB-20241215-0001', 1, '0x1234567890123456789012345678901234567890', 'pending', 'queued', 
 '[]'::jsonb, '{}'::jsonb, 'Initial worksheet created', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('LAB-20241215-0002', 2, '0x1234567890123456789012345678901234567890', 'pending', 'queued', 
 '[]'::jsonb, '{}'::jsonb, 'Initial worksheet created', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("accessionNumber") DO NOTHING;

-- Success message
SELECT 'Lab Worksheet System tables created successfully!' as message;