-- Enhanced Two-Tier Pricing System Schema
-- Implements comprehensive auto-approval logic, audit trails, and market analytics

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced doctor_service_fees table with proper constraints
DROP TABLE IF EXISTS doctor_service_fees_enhanced CASCADE;
CREATE TABLE doctor_service_fees_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('in_person', 'video_call', 'chat')),
    fee_amount DECIMAL(10,2) NOT NULL,
    fee_set_by VARCHAR(20) NOT NULL CHECK (fee_set_by IN ('admin', 'doctor')),
    is_auto_approve BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (doctor_id, service_type),
    
    -- Constraint to enforce pricing rules
    CONSTRAINT valid_premium_range CHECK (
        (service_type = 'in_person' AND fee_amount = 400.00) OR
        (service_type IN ('video_call', 'chat') AND fee_amount BETWEEN 2000.00 AND 20000.00)
    ),
    
    -- Constraint to ensure auto-approve logic
    CONSTRAINT auto_approve_logic CHECK (
        (fee_set_by = 'admin' AND is_auto_approve = false) OR
        (fee_set_by = 'doctor' AND service_type IN ('video_call', 'chat'))
    )
);

-- Create indexes for doctor_service_fees_enhanced
CREATE INDEX idx_doctor_service_fees_doctor_id ON doctor_service_fees_enhanced (doctor_id);
CREATE INDEX idx_doctor_service_fees_service_type ON doctor_service_fees_enhanced (service_type);
CREATE INDEX idx_doctor_service_fees_auto_approve ON doctor_service_fees_enhanced (is_auto_approve);
CREATE INDEX idx_doctor_service_fees_fee_set_by ON doctor_service_fees_enhanced (fee_set_by);

-- Enhanced payment transactions table with comprehensive tracking
CREATE TABLE enhanced_payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id CHAR(36) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    doctor_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expected_amount DECIMAL(10,2) NOT NULL,
    is_exact_match BOOLEAN NOT NULL,
    payment_destination VARCHAR(20) NOT NULL CHECK (payment_destination IN ('doctor_wallet', 'system_wallet')),
    approval_method VARCHAR(20) NOT NULL CHECK (approval_method IN ('auto_approved', 'manual_approved', 'rejected')),
    transaction_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    chapa_transaction_id VARCHAR(255),
    doctor_wallet_address VARCHAR(255),
    processing_fees DECIMAL(10,2) DEFAULT 0,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_approval_method (approval_method),
    INDEX idx_transaction_status (transaction_status),
    INDEX idx_payment_destination (payment_destination),
    INDEX idx_created_at (created_at)
);

-- Comprehensive pricing audit log
CREATE TABLE pricing_audit_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'suspend')),
    old_amount DECIMAL(10,2),
    new_amount DECIMAL(10,2),
    changed_by VARCHAR(255) NOT NULL,
    change_reason TEXT,
    is_admin_override BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_action_type (action_type),
    INDEX idx_changed_by (changed_by),
    INDEX idx_created_at (created_at),
    INDEX idx_admin_override (is_admin_override)
);

-- Market rate analytics for competitive intelligence
CREATE TABLE market_rate_analytics (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    specialty VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    avg_rate DECIMAL(10,2) NOT NULL,
    min_rate DECIMAL(10,2) NOT NULL,
    max_rate DECIMAL(10,2) NOT NULL,
    median_rate DECIMAL(10,2) NOT NULL,
    doctor_count INTEGER NOT NULL,
    calculation_date DATE NOT NULL,
    
    UNIQUE KEY unique_specialty_service_date (specialty, service_type, calculation_date),
    INDEX idx_specialty (specialty),
    INDEX idx_service_type (service_type),
    INDEX idx_calculation_date (calculation_date)
);

-- Auto-approval decision log for transparency
CREATE TABLE auto_approval_decisions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id CHAR(36) NOT NULL,
    doctor_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL,
    expected_amount DECIMAL(10,2) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('auto_approved', 'manual_review', 'rejected')),
    decision_reason TEXT NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_decision (decision),
    INDEX idx_created_at (created_at)
);

-- Doctor wallet configuration for direct payments
CREATE TABLE doctor_wallet_config (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id VARCHAR(255) NOT NULL UNIQUE,
    chapa_account_id VARCHAR(255),
    telebirr_account VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_is_verified (is_verified),
    INDEX idx_is_active (is_active)
);

-- System configuration for pricing rules
CREATE TABLE enhanced_system_config (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('decimal', 'integer', 'boolean', 'string')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key),
    INDEX idx_is_active (is_active)
);

-- Insert default system configuration
INSERT INTO enhanced_system_config (config_key, config_value, data_type, description) VALUES
('standard_consultation_fee', '400.00', 'decimal', 'Fixed fee for standard in-person consultations'),
('premium_min_fee', '2000.00', 'decimal', 'Minimum fee doctors can set for premium services'),
('premium_max_fee', '20000.00', 'decimal', 'Maximum fee doctors can set for premium services'),
('auto_approval_enabled', 'true', 'boolean', 'Global toggle for auto-approval functionality'),
('payment_timeout_minutes', '5', 'integer', 'Maximum time for payment processing'),
('refund_processing_hours', '24', 'integer', 'Maximum time for refund processing'),
('market_rate_calculation_frequency', '24', 'integer', 'Hours between market rate calculations')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    description = VALUES(description);

-- Migrate existing data from old table to enhanced table
INSERT INTO doctor_service_fees_enhanced (
    doctor_id, service_type, fee_amount, fee_set_by, is_auto_approve, is_active, created_at, updated_at
)
SELECT 
    doctor_id, 
    service_type, 
    fee_amount, 
    fee_set_by, 
    is_auto_approve, 
    is_active, 
    created_at, 
    updated_at
FROM doctor_service_fees
WHERE NOT EXISTS (
    SELECT 1 FROM doctor_service_fees_enhanced e 
    WHERE e.doctor_id = doctor_service_fees.doctor_id 
    AND e.service_type = doctor_service_fees.service_type
);

-- Create performance indexes for common queries
CREATE INDEX idx_enhanced_payment_doctor_date ON enhanced_payment_transactions(doctor_id, created_at);
CREATE INDEX idx_enhanced_payment_patient_status ON enhanced_payment_transactions(patient_id, transaction_status);
CREATE INDEX idx_audit_log_doctor_date ON pricing_audit_log(doctor_id, created_at);
CREATE INDEX idx_market_analytics_specialty_date ON market_rate_analytics(specialty, calculation_date);

-- Create views for common queries
CREATE VIEW doctor_pricing_summary AS
SELECT 
    dsf.doctor_id,
    dsf.service_type,
    dsf.fee_amount,
    dsf.fee_set_by,
    dsf.is_auto_approve,
    dwc.is_verified as wallet_verified,
    COUNT(ept.id) as total_transactions,
    SUM(CASE WHEN ept.approval_method = 'auto_approved' THEN 1 ELSE 0 END) as auto_approved_count
FROM doctor_service_fees_enhanced dsf
LEFT JOIN doctor_wallet_config dwc ON dsf.doctor_id = dwc.doctor_id
LEFT JOIN enhanced_payment_transactions ept ON dsf.doctor_id = ept.doctor_id 
    AND dsf.service_type = ept.service_type
WHERE dsf.is_active = true
GROUP BY dsf.doctor_id, dsf.service_type, dsf.fee_amount, dsf.fee_set_by, dsf.is_auto_approve, dwc.is_verified;

CREATE VIEW market_rate_current AS
SELECT 
    specialty,
    service_type,
    avg_rate,
    min_rate,
    max_rate,
    median_rate,
    doctor_count
FROM market_rate_analytics
WHERE calculation_date = (
    SELECT MAX(calculation_date) 
    FROM market_rate_analytics mra2 
    WHERE mra2.specialty = market_rate_analytics.specialty 
    AND mra2.service_type = market_rate_analytics.service_type
);