-- Add comprehensive consultation fields to appointments table
-- This supports the full EMR consultation workflow

-- Past Medical History
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS past_medical_history JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS surgeries JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS hospitalizations JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS immunizations JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS family_history JSONB DEFAULT '{}';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]';

-- Review of Systems
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS review_of_systems JSONB DEFAULT '{}';

-- Physical Examination (Enhanced)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS physical_exam_detailed JSONB DEFAULT '{}';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS vital_signs_history JSONB DEFAULT '[]';

-- Diagnostic Tests
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS test_results JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS imaging_results JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lab_interpretation TEXT;

-- Diagnosis (Enhanced with ICD-10)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS primary_diagnosis JSONB DEFAULT '{}';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS secondary_diagnoses JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS differential_diagnoses JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinical_impression TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS icd10_codes JSONB DEFAULT '[]';

-- Treatment Plan (Enhanced)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS immediate_management JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS procedures_planned JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS prescriptions_issued JSONB DEFAULT '[]';

-- Admission & Referral
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS admission_required BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS admission_details JSONB DEFAULT '{}';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultations_requested JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dietary_orders JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS activity_orders TEXT;

-- Follow-up & Education
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_schedule JSONB DEFAULT '{}';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_education JSONB DEFAULT '[]';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS education_materials_provided JSONB DEFAULT '[]';

-- Final Documentation
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS assessment_summary TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS disposition TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS prognosis TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS additional_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS digital_signature TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS record_locked BOOLEAN DEFAULT FALSE;

-- Metadata
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_duration INTEGER; -- in seconds
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_phase VARCHAR(50) DEFAULT 'not_started';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS last_auto_save TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_consultation_phase ON appointments(consultation_phase);
CREATE INDEX IF NOT EXISTS idx_appointments_record_locked ON appointments(record_locked);
CREATE INDEX IF NOT EXISTS idx_appointments_icd10_codes ON appointments USING GIN(icd10_codes);

-- Comments
COMMENT ON COLUMN appointments.past_medical_history IS 'Array of past medical conditions';
COMMENT ON COLUMN appointments.review_of_systems IS 'Structured review of systems checklist';
COMMENT ON COLUMN appointments.test_results IS 'Array of diagnostic test results';
COMMENT ON COLUMN appointments.icd10_codes IS 'Array of ICD-10 diagnosis codes';
COMMENT ON COLUMN appointments.consultation_phase IS 'Current phase: not_started, history, examination, diagnosis, treatment, follow_up, completed';
COMMENT ON COLUMN appointments.record_locked IS 'True when consultation is finalized and signed';
