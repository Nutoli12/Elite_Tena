-- Enhanced Two-Tier Pricing System Schema for PostgreSQL
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
DROP TABLE IF EXISTS enhanced_payment_transactions CASCADE;
CREATE TABLE enhanced_payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL,
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
    completed_at TIMESTAMP
);

-- Create indexes for enhanced_payment_transactions
CREATE INDEX idx_enhanced_payment_appointment_id ON enhanced_payment_transactions (appointment_id);
CREATE INDEX idx_enhanced_payment_patient_id ON enhanced_payment_transactions (patient_id);
CREATE INDEX idx_enhanced_payment_doctor_id ON enhanced_payment_transactions (doctor_id);
CREATE INDEX idx_enhanced_payment_approval_method ON enhanced_payment_transactions (approval_method);
CREATE INDEX idx_enhanced_payment_transaction_status ON enhanced_payment_transactions (transaction_status);
CREATE INDEX idx_enhanced_payment_destination ON enhanced_payment_transactions (payment_destination);
CREATE INDEX idx_enhanced_payment_created_at ON enhanced_payment_transactions (created_at);
CREATE INDEX idx_enhanced_payment_doctor_date ON enhanced_payment_transactions (doctor_id, created_at);
CREATE INDEX idx_enhanced_payment_patient_status ON enhanced_payment_transactions (patient_id, transaction_status);

-- Comprehensive pricing audit log
DROP TABLE IF EXISTS pricing_audit_log CASCADE;
CREATE TABLE pricing_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'suspend')),
    old_amount DECIMAL(10,2),
    new_amount DECIMAL(10,2),
    changed_by VARCHAR(255) NOT NULL,
    change_reason TEXT,
    is_admin_override BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for pricing_audit_log
CREATE INDEX idx_pricing_audit_doctor_id ON pricing_audit_log (doctor_id);
CREATE INDEX idx_pricing_audit_action_type ON pricing_audit_log (action_type);
CREATE INDEX idx_pricing_audit_changed_by ON pricing_audit_log (changed_by);
CREATE INDEX idx_pricing_audit_created_at ON pricing_audit_log (created_at);
CREATE INDEX idx_pricing_audit_admin_override ON pricing_audit_log (is_admin_override);
CREATE INDEX idx_pricing_audit_doctor_date ON pricing_audit_log (doctor_id, created_at);

-- Market rate analytics for competitive intelligence
DROP TABLE IF EXISTS market_rate_analytics CASCADE;
CREATE TABLE market_rate_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialty VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    avg_rate DECIMAL(10,2) NOT NULL,
    min_rate DECIMAL(10,2) NOT NULL,
    max_rate DECIMAL(10,2) NOT NULL,
    median_rate DECIMAL(10,2) NOT NULL,
    doctor_count INTEGER NOT NULL,
    calculation_date DATE NOT NULL,
    
    UNIQUE (specialty, service_type, calculation_date)
);

-- Create indexes for market_rate_analytics
CREATE INDEX idx_market_analytics_specialty ON market_rate_analytics (specialty);
CREATE INDEX idx_market_analytics_service_type ON market_rate_analytics (service_type);
CREATE INDEX idx_market_analytics_calculation_date ON market_rate_analytics (calculation_date);
CREATE INDEX idx_market_analytics_specialty_date ON market_rate_analytics (specialty, calculation_date);

-- Auto-approval decision log for transparency
DROP TABLE IF EXISTS auto_approval_decisions CASCADE;
CREATE TABLE auto_approval_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL,
    doctor_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL,
    expected_amount DECIMAL(10,2) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('auto_approved', 'manual_review', 'rejected')),
    decision_reason TEXT NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for auto_approval_decisions
CREATE INDEX idx_auto_approval_appointment_id ON auto_approval_decisions (appointment_id);
CREATE INDEX idx_auto_approval_doctor_id ON auto_approval_decisions (doctor_id);
CREATE INDEX idx_auto_approval_decision ON auto_approval_decisions (decision);
CREATE INDEX idx_auto_approval_created_at ON auto_approval_decisions (created_at);

-- Doctor wallet configuration for direct payments
DROP TABLE IF EXISTS doctor_wallet_config CASCADE;
CREATE TABLE doctor_wallet_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for doctor_wallet_config
CREATE INDEX idx_doctor_wallet_doctor_id ON doctor_wallet_config (doctor_id);
CREATE INDEX idx_doctor_wallet_is_verified ON doctor_wallet_config (is_verified);
CREATE INDEX idx_doctor_wallet_is_active ON doctor_wallet_config (is_active);

-- System configuration for pricing rules
DROP TABLE IF EXISTS enhanced_system_config CASCADE;
CREATE TABLE enhanced_system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('decimal', 'integer', 'boolean', 'string')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for enhanced_system_config
CREATE INDEX idx_enhanced_system_config_key ON enhanced_system_config (config_key);
CREATE INDEX idx_enhanced_system_config_active ON enhanced_system_config (is_active);

-- Insert default system configuration
INSERT INTO enhanced_system_config (config_key, config_value, data_type, description) VALUES
('standard_consultation_fee', '400.00', 'decimal', 'Fixed fee for standard in-person consultations'),
('premium_min_fee', '2000.00', 'decimal', 'Minimum fee doctors can set for premium services'),
('premium_max_fee', '20000.00', 'decimal', 'Maximum fee doctors can set for premium services'),
('auto_approval_enabled', 'true', 'boolean', 'Global toggle for auto-approval functionality'),
('payment_timeout_minutes', '5', 'integer', 'Maximum time for payment processing'),
('refund_processing_hours', '24', 'integer', 'Maximum time for refund processing'),
('market_rate_calculation_frequency', '24', 'integer', 'Hours between market rate calculations')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description;

-- Create views for common queries
CREATE OR REPLACE VIEW doctor_pricing_summary AS
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

CREATE OR REPLACE VIEW market_rate_current AS
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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_doctor_service_fees_updated_at 
    BEFORE UPDATE ON doctor_service_fees_enhanced 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_wallet_config_updated_at 
    BEFORE UPDATE ON doctor_wallet_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_system_config_updated_at 
    BEFORE UPDATE ON enhanced_system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();