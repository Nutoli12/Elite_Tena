-- Enhanced Chapa Payment Integration Migration
-- Adds comprehensive payment tracking and receipt management

-- 1. Add payment tracking columns to appointments table
DO $$
BEGIN
    -- Payment method tracking
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_method') THEN
        ALTER TABLE appointments ADD COLUMN payment_method VARCHAR(50) DEFAULT NULL;
        RAISE NOTICE 'Added payment_method column to appointments';
    END IF;

    -- Enhanced payment status with more states
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'paymentStatus') THEN
        -- Drop existing constraint if it exists
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_paymentstatus_check;
        
        -- Add new constraint with enhanced states
        ALTER TABLE appointments ADD CONSTRAINT appointments_paymentstatus_check 
        CHECK ("paymentStatus" IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'));
        
        RAISE NOTICE 'Enhanced paymentStatus enum in appointments';
    END IF;

    -- Chapa transaction tracking
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'chapa_transaction_id') THEN
        ALTER TABLE appointments ADD COLUMN chapa_transaction_id VARCHAR(255) DEFAULT NULL;
        RAISE NOTICE 'Added chapa_transaction_id column to appointments';
    END IF;

    -- Payment confirmation tracking
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_confirmed_at') THEN
        ALTER TABLE appointments ADD COLUMN payment_confirmed_at TIMESTAMP DEFAULT NULL;
        RAISE NOTICE 'Added payment_confirmed_at column to appointments';
    END IF;

    -- Receipt URL for manual verification
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_receipt_url') THEN
        ALTER TABLE appointments ADD COLUMN payment_receipt_url TEXT DEFAULT NULL;
        RAISE NOTICE 'Added payment_receipt_url column to appointments';
    END IF;

    -- Payment verification status
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_verified_at') THEN
        ALTER TABLE appointments ADD COLUMN payment_verified_at TIMESTAMP DEFAULT NULL;
        RAISE NOTICE 'Added payment_verified_at column to appointments';
    END IF;

END $$;

-- 2. Create comprehensive payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_wallet VARCHAR(255) NOT NULL,
    doctor_wallet VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ETB',
    payment_method VARCHAR(50) NOT NULL, -- 'chapa', 'telebirr', 'cash', 'bank_transfer'
    
    -- Chapa specific fields
    chapa_transaction_id VARCHAR(255) UNIQUE,
    chapa_checkout_url TEXT,
    chapa_reference VARCHAR(255),
    
    -- Transaction status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, refunded
    provider_transaction_id VARCHAR(255),
    provider_data JSONB,
    
    -- Receipt management
    receipt_url TEXT,
    receipt_uploaded_at TIMESTAMP,
    
    -- Verification
    verified_at TIMESTAMP,
    verified_by VARCHAR(255), -- doctor wallet who verified
    verification_method VARCHAR(50), -- 'automatic', 'manual', 'webhook'
    
    -- Failure handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Customer information
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for payment transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_appointment_id ON payment_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_chapa_transaction_id ON payment_transactions(chapa_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_patient_wallet ON payment_transactions(patient_wallet);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_doctor_wallet ON payment_transactions(doctor_wallet);

-- 3. Create Chapa webhook logs table for debugging
CREATE TABLE IF NOT EXISTS chapa_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_ref VARCHAR(255) NOT NULL,
    webhook_data JSONB NOT NULL,
    status VARCHAR(50),
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapa_webhook_logs_tx_ref ON chapa_webhook_logs(tx_ref);
CREATE INDEX IF NOT EXISTS idx_chapa_webhook_logs_processed ON chapa_webhook_logs(processed);

-- 4. Add consent-payment integration fields to consent table
DO $$
BEGIN
    -- Link consent to specific appointment
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'consents' AND column_name = 'appointment_id') THEN
        ALTER TABLE consents ADD COLUMN appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added appointment_id column to consents';
    END IF;

    -- Track if consent was auto-requested after payment
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'consents' AND column_name = 'auto_requested_after_payment') THEN
        ALTER TABLE consents ADD COLUMN auto_requested_after_payment BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added auto_requested_after_payment column to consents';
    END IF;

    -- Payment-triggered consent metadata
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'consents' AND column_name = 'payment_trigger_data') THEN
        ALTER TABLE consents ADD COLUMN payment_trigger_data JSONB DEFAULT NULL;
        RAISE NOTICE 'Added payment_trigger_data column to consents';
    END IF;

END $$;

-- 5. Create payment-consent workflow tracking table
CREATE TABLE IF NOT EXISTS payment_consent_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    consent_id UUID REFERENCES consents(id) ON DELETE SET NULL,
    
    -- Workflow state
    current_state VARCHAR(50) NOT NULL, -- 'payment_pending', 'payment_completed', 'consent_requested', 'consent_granted', 'consultation_ready'
    
    -- State transitions
    payment_completed_at TIMESTAMP,
    consent_requested_at TIMESTAMP,
    consent_granted_at TIMESTAMP,
    consultation_started_at TIMESTAMP,
    
    -- Metadata
    workflow_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_consent_workflows_appointment_id ON payment_consent_workflows(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_consent_workflows_current_state ON payment_consent_workflows(current_state);

-- 6. Add Ethiopian payment method preferences
CREATE TABLE IF NOT EXISTS ethiopian_payment_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet VARCHAR(255) NOT NULL UNIQUE,
    
    -- Preferred payment methods
    preferred_method VARCHAR(50) DEFAULT 'chapa', -- 'chapa', 'telebirr', 'cbe_birr'
    
    -- Telebirr details
    telebirr_number VARCHAR(20),
    telebirr_verified BOOLEAN DEFAULT FALSE,
    
    -- Bank details
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_verified BOOLEAN DEFAULT FALSE,
    
    -- Chapa preferences
    chapa_preferred_methods JSONB, -- ['telebirr', 'cbe_birr', 'visa', 'mastercard']
    
    -- Settings
    auto_save_payment_methods BOOLEAN DEFAULT TRUE,
    require_payment_confirmation BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ethiopian_payment_preferences_user_wallet ON ethiopian_payment_preferences(user_wallet);

-- 7. Create notification enhancements for payment-consent flow
DO $$
BEGIN
    -- Add payment-specific notification types
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        -- This will be handled in the application layer for enum updates
        RAISE NOTICE 'Notification types will be enhanced in application layer';
    END IF;

END $$;

-- 8. Add triggers for automatic workflow state updates
CREATE OR REPLACE FUNCTION update_payment_consent_workflow()
RETURNS TRIGGER AS $$
BEGIN
    -- Update workflow when payment status changes
    IF TG_TABLE_NAME = 'payment_transactions' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE payment_consent_workflows 
        SET current_state = 'payment_completed',
            payment_completed_at = NOW(),
            updated_at = NOW()
        WHERE payment_id = NEW.id;
    END IF;
    
    -- Update workflow when consent is granted
    IF TG_TABLE_NAME = 'consents' AND NEW.status = 'active' AND OLD.status != 'active' THEN
        UPDATE payment_consent_workflows 
        SET current_state = 'consultation_ready',
            consent_granted_at = NOW(),
            updated_at = NOW()
        WHERE consent_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_payment_workflow_update ON payment_transactions;
CREATE TRIGGER trigger_payment_workflow_update
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_consent_workflow();

DROP TRIGGER IF EXISTS trigger_consent_workflow_update ON consents;
CREATE TRIGGER trigger_consent_workflow_update
    AFTER UPDATE ON consents
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_consent_workflow();

-- 9. Insert default Ethiopian payment methods
INSERT INTO ethiopian_payment_preferences (user_wallet, preferred_method, chapa_preferred_methods)
SELECT DISTINCT wallet_address, 'chapa', '["telebirr", "cbe_birr", "awash_birr", "visa", "mastercard"]'::jsonb
FROM users 
WHERE wallet_address IS NOT NULL
ON CONFLICT (user_wallet) DO NOTHING;

-- 10. Add helpful views for payment-consent workflow monitoring
CREATE OR REPLACE VIEW payment_consent_workflow_status AS
SELECT 
    a.id as appointment_id,
    a.patient_wallet_address,
    a.doctor_wallet_address,
    a.appointment_date,
    a.service_type,
    a.fee,
    a.approval_status,
    a.payment_status,
    pt.status as payment_transaction_status,
    pt.chapa_transaction_id,
    pt.amount as payment_amount,
    c.status as consent_status,
    c.granted_at as consent_granted_at,
    pcw.current_state as workflow_state,
    pcw.payment_completed_at,
    pcw.consent_requested_at,
    pcw.consent_granted_at,
    CASE 
        WHEN a.fee = 0 AND c.status = 'active' THEN 'ready_for_consultation'
        WHEN a.fee > 0 AND pt.status = 'completed' AND c.status = 'active' THEN 'ready_for_consultation'
        WHEN a.fee > 0 AND pt.status = 'completed' AND c.status = 'pending' THEN 'awaiting_consent'
        WHEN a.fee > 0 AND a.approval_status = 'approved' AND pt.status IN ('pending', 'processing') THEN 'awaiting_payment'
        WHEN a.approval_status = 'pending' THEN 'awaiting_approval'
        ELSE 'unknown'
    END as consultation_readiness
FROM appointments a
LEFT JOIN payment_transactions pt ON a.id = pt.appointment_id
LEFT JOIN consents c ON a.id = c.appointment_id
LEFT JOIN payment_consent_workflows pcw ON a.id = pcw.appointment_id
WHERE a.status != 'cancelled';

COMMENT ON VIEW payment_consent_workflow_status IS 'Comprehensive view of payment-consent workflow status for all appointments';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced Chapa Payment Integration Migration completed successfully!';
    RAISE NOTICE '📋 Added: payment tracking, Chapa integration, consent workflow, Ethiopian preferences';
    RAISE NOTICE '🔍 Use payment_consent_workflow_status view to monitor appointment workflows';
END $$;