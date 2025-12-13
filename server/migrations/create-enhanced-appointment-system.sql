-- Enhanced Appointment System with Smart Pricing and Auto-Approval
-- Migration: Enhanced Appointment System
-- Date: 2024-12-13

-- Doctor Service Pricing Table
CREATE TABLE IF NOT EXISTS doctor_service_pricing (
    id SERIAL PRIMARY KEY,
    doctor_wallet VARCHAR(255) NOT NULL,
    doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Service Pricing (ETB)
    in_person_fee DECIMAL(10,2) DEFAULT 400.00, -- Fixed by admin
    video_call_fee DECIMAL(10,2) DEFAULT 0.00,  -- Doctor sets
    chat_fee DECIMAL(10,2) DEFAULT 0.00,         -- Doctor sets
    
    -- Settings
    accepts_in_person BOOLEAN DEFAULT true,
    accepts_video_calls BOOLEAN DEFAULT true,
    accepts_chat BOOLEAN DEFAULT true,
    
    -- Auto-approval settings
    auto_approve_exact_payments BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(doctor_wallet),
    UNIQUE(doctor_id)
);

-- Enhanced Appointments Table
CREATE TABLE IF NOT EXISTS enhanced_appointments (
    id SERIAL PRIMARY KEY,
    
    -- Basic Info
    patient_wallet VARCHAR(255) NOT NULL,
    doctor_wallet VARCHAR(255) NOT NULL,
    patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Appointment Details
    appointment_date TIMESTAMP NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('in_person', 'video_call', 'chat')),
    duration INTEGER DEFAULT 30, -- minutes
    reason TEXT NOT NULL,
    
    -- Pricing & Payment
    expected_fee DECIMAL(10,2) NOT NULL,  -- Doctor's asking price
    paid_amount DECIMAL(10,2) DEFAULT 0.00, -- What patient actually paid
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_reference VARCHAR(255),
    
    -- Approval Logic
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'auto_approved', 'manually_approved', 'rejected')),
    approval_type VARCHAR(50) DEFAULT 'manual' CHECK (approval_type IN ('auto', 'manual')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Refund Policy
    refund_eligible BOOLEAN DEFAULT true,
    refund_status VARCHAR(50) DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'processed', 'failed')),
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_processed_at TIMESTAMP,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_patient_wallet (patient_wallet),
    INDEX idx_doctor_wallet (doctor_wallet),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_approval_status (approval_status),
    INDEX idx_payment_status (payment_status)
);

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS appointment_payments (
    id SERIAL PRIMARY KEY,
    
    -- References
    appointment_id INTEGER REFERENCES enhanced_appointments(id) ON DELETE CASCADE,
    patient_wallet VARCHAR(255) NOT NULL,
    doctor_wallet VARCHAR(255) NOT NULL,
    
    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    expected_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'chapa',
    payment_reference VARCHAR(255) UNIQUE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Auto-approval check
    is_exact_payment BOOLEAN DEFAULT false,
    triggers_auto_approval BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_payment_reference (payment_reference)
);

-- Refund Transactions Table
CREATE TABLE IF NOT EXISTS appointment_refunds (
    id SERIAL PRIMARY KEY,
    
    -- References
    appointment_id INTEGER REFERENCES enhanced_appointments(id) ON DELETE CASCADE,
    payment_id INTEGER REFERENCES appointment_payments(id) ON DELETE CASCADE,
    
    -- Refund Details
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason VARCHAR(255) NOT NULL,
    refund_reference VARCHAR(255) UNIQUE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    
    -- Timestamps
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_refund_reference (refund_reference)
);

-- Approval Audit Log
CREATE TABLE IF NOT EXISTS appointment_approval_log (
    id SERIAL PRIMARY KEY,
    
    -- References
    appointment_id INTEGER REFERENCES enhanced_appointments(id) ON DELETE CASCADE,
    
    -- Approval Details
    action VARCHAR(50) NOT NULL CHECK (action IN ('auto_approved', 'manually_approved', 'rejected', 'payment_mismatch')),
    reason TEXT,
    
    -- Context
    expected_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    amount_difference DECIMAL(10,2),
    
    -- Actor
    performed_by INTEGER REFERENCES users(id),
    performed_by_role VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_action (action)
);

-- Insert default pricing for existing doctors
INSERT INTO doctor_service_pricing (doctor_wallet, doctor_id, in_person_fee, video_call_fee, chat_fee)
SELECT 
    wallet_address,
    id,
    400.00, -- Fixed in-person fee
    2000.00, -- Default video call fee
    1000.00  -- Default chat fee
FROM users 
WHERE role = 'doctor' 
AND wallet_address IS NOT NULL
ON CONFLICT (doctor_wallet) DO NOTHING;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_doctor_service_pricing_updated_at 
    BEFORE UPDATE ON doctor_service_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_appointments_updated_at 
    BEFORE UPDATE ON enhanced_appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_payments_updated_at 
    BEFORE UPDATE ON appointment_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();