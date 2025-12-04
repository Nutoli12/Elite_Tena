-- ============================================
-- CONSULTATION INTERFACE MIGRATION
-- ============================================
-- Adds fields for doctor consultation workflow

-- Add consultation duration
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "consultationDuration" INTEGER;

-- Add consultation notes
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "consultationNotes" TEXT;

-- Add chief complaint
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "chiefComplaint" TEXT;

-- Add history of present illness
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "historyPresentIllness" TEXT;

-- Add examination findings (JSON)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "examFindings" JSONB;

-- Add vital signs (JSON)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "vitalSigns" JSONB;

-- Add provisional diagnosis
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "provisionalDiagnosis" VARCHAR(255);

-- Add final diagnosis
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "finalDiagnosis" VARCHAR(255);

-- Add ICD-10 codes array
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "icd10Codes" TEXT[];

-- Add treatment plan
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS "treatmentPlan" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN appointments."consultationDuration" IS 'Consultation duration in minutes';
COMMENT ON COLUMN appointments."consultationNotes" IS 'Doctor notes during consultation';
COMMENT ON COLUMN appointments."chiefComplaint" IS 'Patient chief complaint';
COMMENT ON COLUMN appointments."historyPresentIllness" IS 'History of present illness';
COMMENT ON COLUMN appointments."examFindings" IS 'Physical examination findings (JSON)';
COMMENT ON COLUMN appointments."vitalSigns" IS 'Vital signs recorded (JSON)';
COMMENT ON COLUMN appointments."provisionalDiagnosis" IS 'Initial diagnosis';
COMMENT ON COLUMN appointments."finalDiagnosis" IS 'Final confirmed diagnosis';
COMMENT ON COLUMN appointments."icd10Codes" IS 'ICD-10 diagnosis codes array';
COMMENT ON COLUMN appointments."treatmentPlan" IS 'Treatment plan and instructions';

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN (
  'consultationDuration',
  'consultationNotes',
  'chiefComplaint',
  'historyPresentIllness',
  'examFindings',
  'vitalSigns',
  'provisionalDiagnosis',
  'finalDiagnosis',
  'icd10Codes',
  'treatmentPlan'
);

COMMIT;
