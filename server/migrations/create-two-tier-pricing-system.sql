-- Two-Tier Pricing System Migration
-- Creates the foundation for Standard (400 ETB) and Premium (Doctor-set) pricing

-- Doctor Service Pricing Table
CREATE TABLE IF NOT EXISTS doctor_service_fees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    doctor_id VARCHAR(255) NOT NULL,
    service_type ENUM('in_person', 'video_call', 'chat') NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL,
    fee_set_by ENUM('admin', 'doctor') NOT NULL DEFAULT 'doctor',
    is_auto_approve BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_doctor_service (doctor_id, service_type),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_service_type (service_type),
    INDEX idx_auto_approve (is_auto_approve)
);

-- Insert default admin-set pricing for in-person consultations
INSERT INTO doctor_service_fees (doctor_id, service_type, fee_amount, fee_set_by, is_auto_approve)
SELECT 
    id as doctor_id,
    'in_person' as service_type,
    400.00 as fee_amount,
    'admin' as fee_set_by,
    false as is_auto_approve
FROM users 
WHERE role = 'doctor'
ON DUPLICATE KEY UPDATE 
    fee_amount = 400.00,
    fee_set_by = 'admin',
    is_auto_approve = false;

-- Enhanced Appointments table for two-tier system
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS service_tier ENUM('standard', 'premium') DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS service_type ENUM('in_person', 'video_call', 'chat') DEFAULT 'in_person',
ADD COLUMN IF NOT EXISTS agreed_fee DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS payment_flow ENUM('escrow', 'direct') DEFAULT 'escrow',
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_reason VARCHAR(500) NULL;

-- Payment routing table for dual payment flows
CREATE TABLE IF NOT EXISTS payment_routing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    payment_method ENUM('escrow', 'direct') NOT NULL,
    chapa_tx_ref VARCHAR(255) NULL,
    doctor_wallet_address VARCHAR(255) NULL,
    system_fee DECIMAL(10,2) DEFAULT 0.00,
    doctor_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_chapa_tx_ref (chapa_tx_ref)
);

-- Doctor premium service settings
CREATE TABLE IF NOT EXISTS doctor_premium_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    doctor_id VARCHAR(255) NOT NULL,
    video_call_enabled BOOLEAN DEFAULT false,
    chat_enabled BOOLEAN DEFAULT false,
    video_call_duration_minutes INT DEFAULT 30,
    chat_session_duration_minutes INT DEFAULT 60,
    availability_buffer_minutes INT DEFAULT 15,
    auto_approve_premium BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_doctor_premium (doctor_id),
    INDEX idx_doctor_id (doctor_id)
);

-- System pricing configuration
CREATE TABLE IF NOT EXISTS system_pricing_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system pricing
INSERT INTO system_pricing_config (config_key, config_value, description) VALUES
('standard_consultation_fee', 400.00, 'Fixed fee for standard in-person consultations'),
('premium_min_fee', 2000.00, 'Minimum fee doctors can set for premium services'),
('premium_max_fee', 20000.00, 'Maximum fee doctors can set for premium services'),
('system_commission_rate', 0.05, 'System commission rate (5%) for premium services')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    description = VALUES(description);