-- Lab Workflow System Migration
-- Creates all necessary tables for the complete lab technician workflow

-- 1. Lab Orders Table
CREATE TABLE IF NOT EXISTS lab_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- LAB-2024-001
    patient_wallet_address VARCHAR(255) NOT NULL,
    doctor_wallet_address VARCHAR(255) NOT NULL,
    
    -- Order Details
    test_codes JSONB NOT NULL, -- Array of test codes ["CBC", "Blood Glucose"]
    priority VARCHAR(20) DEFAULT 'routine', -- routine, urgent, stat
    sample_type VARCHAR(50), -- blood, urine, stool, etc.
    collection_date TIMESTAMP WITH TIME ZONE,
    special_instructions TEXT,
    
    -- Status Tracking
    status VARCHAR(30) DEFAULT 'pending', -- pending, collected, processing, completed, cancelled
    status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_changed_by VARCHAR(255),
    
    -- Consent & Approval
    consent_status VARCHAR(20) DEFAULT 'pending', -- pending, granted, denied
    consent_granted_at TIMESTAMP WITH TIME ZONE,
    
    -- Blockchain Integration
    blockchain_tx_hash VARCHAR(255),
    ipfs_order_hash VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    CONSTRAINT fk_lab_orders_doctor FOREIGN KEY (doctor_wallet_address) REFERENCES users(wallet_address) ON DELETE SET NULL
);

-- 2. Lab Results Table
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    lab_order_id INTEGER NOT NULL,
    technician_wallet_address VARCHAR(255),
    
    -- Result Data
    result_data JSONB NOT NULL, -- Structured test results
    interpretation TEXT,
    technician_notes TEXT,
    reference_ranges JSONB, -- Normal ranges for each test
    
    -- Files & Documents
    report_files JSONB, -- Array of IPFS file references
    raw_data_files JSONB, -- Raw analyzer data files
    
    -- Quality Control
    verified_by VARCHAR(255), -- Supervising technician/pathologist
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Critical Values
    has_critical_values BOOLEAN DEFAULT FALSE,
    critical_values JSONB, -- Array of critical findings
    critical_notification_sent BOOLEAN DEFAULT FALSE,
    
    -- Blockchain Integration
    ipfs_result_hash VARCHAR(255),
    blockchain_tx_hash VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    result_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_lab_results_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_results_technician FOREIGN KEY (technician_wallet_address) REFERENCES users(wallet_address) ON DELETE SET NULL
);

-- 3. Medical Record Lab Links Table
CREATE TABLE IF NOT EXISTS medical_record_lab_links (
    id SERIAL PRIMARY KEY,
    medical_record_id INTEGER,
    lab_result_id INTEGER NOT NULL,
    doctor_interpretation TEXT,
    clinical_notes TEXT,
    
    -- Access Control
    visibility_patient BOOLEAN DEFAULT TRUE,
    visibility_doctors JSONB, -- Array of doctor wallet addresses who can view
    
    -- Integration Status
    integration_status VARCHAR(20) DEFAULT 'pending', -- pending, integrated, archived
    integrated_at TIMESTAMP WITH TIME ZONE,
    integrated_by VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_medical_lab_links_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE SET NULL,
    CONSTRAINT fk_medical_lab_links_result FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE CASCADE
);

-- 4. Lab Access Logs Table (Audit Trail)
CREATE TABLE IF NOT EXISTS lab_access_logs (
    id SERIAL PRIMARY KEY,
    lab_result_id INTEGER,
    lab_order_id INTEGER,
    user_wallet_address VARCHAR(255) NOT NULL,
    user_role VARCHAR(50),
    
    -- Access Details
    action VARCHAR(50) NOT NULL, -- view, download, print, share, edit, delete
    resource_type VARCHAR(30), -- order, result, report
    accessed_data JSONB, -- What specific data was accessed
    
    -- Request Details
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Metadata
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_lab_access_result FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_access_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_access_user FOREIGN KEY (user_wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- 5. Lab Consent Logs Table
CREATE TABLE IF NOT EXISTS lab_consent_logs (
    id SERIAL PRIMARY KEY,
    patient_wallet_address VARCHAR(255) NOT NULL,
    doctor_wallet_address VARCHAR(255) NOT NULL,
    lab_order_id INTEGER,
    
    -- Consent Details
    consent_type VARCHAR(50) NOT NULL, -- lab_tests, result_sharing, data_storage
    granted BOOLEAN NOT NULL,
    consent_scope JSONB, -- What specific permissions were granted
    
    -- Timing
    granted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Blockchain Integration
    blockchain_tx_hash VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_lab_consent_patient FOREIGN KEY (patient_wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    CONSTRAINT fk_lab_consent_doctor FOREIGN KEY (doctor_wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    CONSTRAINT fk_lab_consent_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE SET NULL
);

-- 6. Lab Test Catalog Table
CREATE TABLE IF NOT EXISTS lab_test_catalog (
    id SERIAL PRIMARY KEY,
    test_code VARCHAR(20) UNIQUE NOT NULL, -- CBC, GLU, LIPID
    test_name VARCHAR(255) NOT NULL,
    test_category VARCHAR(100), -- Hematology, Chemistry, Microbiology
    
    -- Test Details
    description TEXT,
    sample_type VARCHAR(50), -- blood, urine, stool
    sample_volume VARCHAR(50), -- 5ml, 10ml
    fasting_required BOOLEAN DEFAULT FALSE,
    
    -- Reference Ranges
    reference_ranges JSONB, -- Normal values by age/gender
    critical_values JSONB, -- Values requiring immediate notification
    
    -- Pricing & Timing
    standard_price DECIMAL(10,2),
    turnaround_time_hours INTEGER DEFAULT 24,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Lab Equipment & Workflow Table
CREATE TABLE IF NOT EXISTS lab_equipment_logs (
    id SERIAL PRIMARY KEY,
    lab_result_id INTEGER,
    equipment_id VARCHAR(100),
    equipment_name VARCHAR(255),
    
    -- Processing Details
    batch_number VARCHAR(100),
    run_number VARCHAR(100),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Quality Control
    qc_status VARCHAR(20) DEFAULT 'pending', -- pending, passed, failed
    qc_notes TEXT,
    calibration_status VARCHAR(20), -- current, expired, pending
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_lab_equipment_result FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_wallet_address);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor ON lab_orders(doctor_wallet_address);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_priority ON lab_orders(priority);
CREATE INDEX IF NOT EXISTS idx_lab_orders_created ON lab_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_lab_results_order ON lab_results(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_technician ON lab_results(technician_wallet_address);
CREATE INDEX IF NOT EXISTS idx_lab_results_date ON lab_results(result_date);
CREATE INDEX IF NOT EXISTS idx_lab_results_critical ON lab_results(has_critical_values);

CREATE INDEX IF NOT EXISTS idx_lab_access_logs_user ON lab_access_logs(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_lab_access_logs_action ON lab_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_lab_access_logs_date ON lab_access_logs(accessed_at);

CREATE INDEX IF NOT EXISTS idx_lab_consent_patient ON lab_consent_logs(patient_wallet_address);
CREATE INDEX IF NOT EXISTS idx_lab_consent_doctor ON lab_consent_logs(doctor_wallet_address);

-- Insert Sample Test Catalog Data
INSERT INTO lab_test_catalog (test_code, test_name, test_category, description, sample_type, fasting_required, standard_price, turnaround_time_hours, reference_ranges, critical_values) VALUES
('CBC', 'Complete Blood Count', 'Hematology', 'Comprehensive blood cell analysis including WBC, RBC, Hemoglobin, Hematocrit, and Platelets', 'blood', FALSE, 25.00, 4, 
 '{"WBC": {"min": 4.5, "max": 11.0, "unit": "x10³/μL"}, "RBC": {"min": 4.2, "max": 5.4, "unit": "x10⁶/μL"}, "Hemoglobin": {"min": 12.0, "max": 16.0, "unit": "g/dL"}}',
 '{"WBC": {"critical_low": 2.0, "critical_high": 30.0}, "Hemoglobin": {"critical_low": 7.0, "critical_high": 20.0}}'),

('GLU', 'Blood Glucose', 'Chemistry', 'Fasting blood glucose measurement', 'blood', TRUE, 15.00, 2,
 '{"glucose": {"min": 70, "max": 100, "unit": "mg/dL"}}',
 '{"glucose": {"critical_low": 40, "critical_high": 400}}'),

('LIPID', 'Lipid Profile', 'Chemistry', 'Cholesterol, HDL, LDL, and Triglycerides', 'blood', TRUE, 35.00, 6,
 '{"total_cholesterol": {"max": 200, "unit": "mg/dL"}, "HDL": {"min": 40, "unit": "mg/dL"}, "LDL": {"max": 100, "unit": "mg/dL"}}',
 '{"total_cholesterol": {"critical_high": 300}, "triglycerides": {"critical_high": 500}}'),

('UA', 'Urinalysis', 'Chemistry', 'Complete urine analysis including protein, glucose, and microscopy', 'urine', FALSE, 20.00, 3,
 '{"protein": "negative", "glucose": "negative", "specific_gravity": {"min": 1.003, "max": 1.030}}',
 '{"protein": "3+", "glucose": "3+"}'),

('TSH', 'Thyroid Stimulating Hormone', 'Endocrinology', 'TSH level measurement for thyroid function', 'blood', FALSE, 45.00, 24,
 '{"TSH": {"min": 0.4, "max": 4.0, "unit": "mIU/L"}}',
 '{"TSH": {"critical_low": 0.01, "critical_high": 20.0}}');

-- Add Lab Technician Role to Users (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'users_role_check' 
        AND check_clause LIKE '%lab_technician%'
    ) THEN
        -- This might fail if the constraint exists, but that's okay
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('patient', 'doctor', 'admin', 'lab_technician', 'pharmacist'));
    END IF;
END $$;

-- Create Lab Workflow Status Functions
CREATE OR REPLACE FUNCTION update_lab_order_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.status_changed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_lab_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-log when lab results are accessed
    INSERT INTO lab_access_logs (
        lab_result_id, 
        user_wallet_address, 
        action, 
        resource_type,
        accessed_at
    ) VALUES (
        NEW.id, 
        COALESCE(NEW.technician_wallet_address, 'system'), 
        'create', 
        'result',
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers
DROP TRIGGER IF EXISTS trigger_update_lab_order_status ON lab_orders;
CREATE TRIGGER trigger_update_lab_order_status
    BEFORE UPDATE ON lab_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_lab_order_status();

DROP TRIGGER IF EXISTS trigger_log_lab_access ON lab_results;
CREATE TRIGGER trigger_log_lab_access
    AFTER INSERT ON lab_results
    FOR EACH ROW
    EXECUTE FUNCTION log_lab_access();

-- Grant Permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lab_technician_role;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lab_technician_role;

COMMENT ON TABLE lab_orders IS 'Lab test orders created by doctors for patients';
COMMENT ON TABLE lab_results IS 'Lab test results uploaded by technicians';
COMMENT ON TABLE medical_record_lab_links IS 'Links lab results to patient medical records';
COMMENT ON TABLE lab_access_logs IS 'Audit trail for all lab data access';
COMMENT ON TABLE lab_consent_logs IS 'Patient consent tracking for lab procedures';
COMMENT ON TABLE lab_test_catalog IS 'Master catalog of available lab tests';
COMMENT ON TABLE lab_equipment_logs IS 'Equipment usage and quality control logs';