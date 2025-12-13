-- Migration: Create Manual Approval Requests Table
-- Feature: enhanced-two-tier-pricing
-- Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
-- Description: Creates table for tracking manual approval requests that require doctor review

-- Create manual_approval_requests table
CREATE TABLE IF NOT EXISTS manual_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('in_person', 'video_call', 'chat')),
    paid_amount DECIMAL(10, 2) NOT NULL CHECK (paid_amount >= 0),
    expected_amount DECIMAL(10, 2) NOT NULL CHECK (expected_amount >= 0),
    payment_difference DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'timeout_rejected', 'expired')),
    decision_at TIMESTAMP WITH TIME ZONE,
    decision_reason TEXT,
    decision_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approval_context JSONB,
    alternatives JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_appointment_id ON manual_approval_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_doctor_id ON manual_approval_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_patient_id ON manual_approval_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_status ON manual_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_priority ON manual_approval_requests(priority);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_service_type ON manual_approval_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_created_at ON manual_approval_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_expires_at ON manual_approval_requests(expires_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_doctor_status ON manual_approval_requests(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_status_expires ON manual_approval_requests(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_manual_approval_requests_doctor_priority ON manual_approval_requests(doctor_id, priority DESC, created_at ASC);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_manual_approval_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_manual_approval_requests_updated_at
    BEFORE UPDATE ON manual_approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_approval_requests_updated_at();

-- Create trigger to automatically calculate payment_difference
CREATE OR REPLACE FUNCTION calculate_payment_difference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.payment_difference = NEW.paid_amount - NEW.expected_amount;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_payment_difference
    BEFORE INSERT OR UPDATE ON manual_approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_difference();

-- Add comments for documentation
COMMENT ON TABLE manual_approval_requests IS 'Tracks manual approval requests that require doctor review for appointments';
COMMENT ON COLUMN manual_approval_requests.id IS 'Unique identifier for the approval request';
COMMENT ON COLUMN manual_approval_requests.appointment_id IS 'Reference to the appointment requiring approval';
COMMENT ON COLUMN manual_approval_requests.doctor_id IS 'Doctor who needs to approve the request';
COMMENT ON COLUMN manual_approval_requests.patient_id IS 'Patient who made the appointment request';
COMMENT ON COLUMN manual_approval_requests.service_type IS 'Type of service: in_person, video_call, or chat';
COMMENT ON COLUMN manual_approval_requests.paid_amount IS 'Amount paid by the patient';
COMMENT ON COLUMN manual_approval_requests.expected_amount IS 'Expected amount for the service';
COMMENT ON COLUMN manual_approval_requests.payment_difference IS 'Difference between paid and expected amounts (calculated automatically)';
COMMENT ON COLUMN manual_approval_requests.reason IS 'Reason why manual approval is required';
COMMENT ON COLUMN manual_approval_requests.priority IS 'Priority level from 1 (low) to 10 (high)';
COMMENT ON COLUMN manual_approval_requests.status IS 'Current status of the approval request';
COMMENT ON COLUMN manual_approval_requests.decision_at IS 'Timestamp when decision was made';
COMMENT ON COLUMN manual_approval_requests.decision_reason IS 'Reason provided for the decision';
COMMENT ON COLUMN manual_approval_requests.decision_data IS 'Additional data related to the decision (JSON)';
COMMENT ON COLUMN manual_approval_requests.expires_at IS 'When the request expires and gets auto-rejected';
COMMENT ON COLUMN manual_approval_requests.approval_context IS 'Context from auto-approval engine (JSON)';
COMMENT ON COLUMN manual_approval_requests.alternatives IS 'Alternative scheduling suggestions (JSON)';

-- Create view for active approval requests
CREATE OR REPLACE VIEW active_approval_requests AS
SELECT 
    mar.*,
    u_doctor.first_name || ' ' || u_doctor.last_name AS doctor_name,
    u_patient.first_name || ' ' || u_patient.last_name AS patient_name,
    a.appointment_date,
    a.appointment_time,
    EXTRACT(EPOCH FROM (mar.expires_at - NOW()))/60 AS minutes_remaining,
    CASE 
        WHEN mar.priority >= 7 THEN 'high'
        WHEN mar.priority <= 3 THEN 'low'
        ELSE 'medium'
    END AS priority_level,
    (mar.paid_amount - mar.expected_amount) / NULLIF(mar.expected_amount, 0) * 100 AS payment_difference_percentage
FROM manual_approval_requests mar
JOIN users u_doctor ON mar.doctor_id = u_doctor.id
JOIN users u_patient ON mar.patient_id = u_patient.id
JOIN appointments a ON mar.appointment_id = a.id
WHERE mar.status = 'pending' 
AND mar.expires_at > NOW();

COMMENT ON VIEW active_approval_requests IS 'View of active approval requests with calculated fields and user names';

-- Create view for approval statistics
CREATE OR REPLACE VIEW approval_statistics AS
SELECT 
    doctor_id,
    service_type,
    status,
    COUNT(*) as request_count,
    AVG(paid_amount) as avg_paid_amount,
    AVG(expected_amount) as avg_expected_amount,
    AVG(payment_difference) as avg_payment_difference,
    AVG(priority) as avg_priority,
    AVG(EXTRACT(EPOCH FROM (decision_at - created_at))/60) as avg_response_time_minutes,
    MIN(created_at) as first_request,
    MAX(created_at) as last_request
FROM manual_approval_requests
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY doctor_id, service_type, status;

COMMENT ON VIEW approval_statistics IS 'Statistics view for approval requests over the last 30 days';

-- Insert sample data for testing (optional - remove in production)
-- This helps verify the table structure works correctly
/*
INSERT INTO manual_approval_requests (
    appointment_id, 
    doctor_id, 
    patient_id, 
    service_type, 
    paid_amount, 
    expected_amount, 
    reason, 
    priority, 
    expires_at,
    approval_context
) VALUES (
    gen_random_uuid(), 
    'sample-doctor-id', 
    'sample-patient-id', 
    'video_call', 
    2500.00, 
    2000.00, 
    'Payment amount exceeds expected fee - requires manual review', 
    6, 
    NOW() + INTERVAL '24 hours',
    '{"fallback_reason": "payment_mismatch", "percentage_difference": 25}'::jsonb
);
*/