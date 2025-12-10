-- Enhanced Payment System Migration
-- This migration enhances the payment system for Chapa and Telebirr integration

-- First, let's check if the payments table exists and create/update it
DO $$
BEGIN
    -- Create payments table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        CREATE TABLE payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "appointmentId" UUID REFERENCES appointments(id),
            "patientWallet" VARCHAR(255) NOT NULL,
            "doctorWallet" VARCHAR(255),
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'ETB',
            status VARCHAR(20) DEFAULT 'pending',
            "paymentMethod" VARCHAR(50),
            "transactionId" VARCHAR(255),
            "transactionHash" VARCHAR(255),
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created payments table';
    END IF;

    -- Add new columns if they don't exist
    
    -- Provider transaction ID
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'providerTransactionId') THEN
        ALTER TABLE payments ADD COLUMN "providerTransactionId" VARCHAR(255);
        RAISE NOTICE 'Added providerTransactionId column';
    END IF;

    -- Provider data (JSON)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'providerData') THEN
        ALTER TABLE payments ADD COLUMN "providerData" JSONB;
        RAISE NOTICE 'Added providerData column';
    END IF;

    -- Verified at timestamp
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'verifiedAt') THEN
        ALTER TABLE payments ADD COLUMN "verifiedAt" TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added verifiedAt column';
    END IF;

    -- Failure reason
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'failureReason') THEN
        ALTER TABLE payments ADD COLUMN "failureReason" TEXT;
        RAISE NOTICE 'Added failureReason column';
    END IF;

    -- Customer email
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'customerEmail') THEN
        ALTER TABLE payments ADD COLUMN "customerEmail" VARCHAR(255);
        RAISE NOTICE 'Added customerEmail column';
    END IF;

    -- Customer phone
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'customerPhone') THEN
        ALTER TABLE payments ADD COLUMN "customerPhone" VARCHAR(50);
        RAISE NOTICE 'Added customerPhone column';
    END IF;

END $$;

-- Update status enum to include new statuses
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'payments_status_check') THEN
        ALTER TABLE payments DROP CONSTRAINT payments_status_check;
    END IF;
    
    -- Add new constraint with all status values
    ALTER TABLE payments ADD CONSTRAINT payments_status_check 
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'));
    
    RAISE NOTICE 'Updated payment status enum';
END $$;

-- Update paymentMethod to be an enum
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'payments_paymentmethod_check') THEN
        ALTER TABLE payments DROP CONSTRAINT payments_paymentmethod_check;
    END IF;
    
    -- Add new constraint for payment methods
    ALTER TABLE payments ADD CONSTRAINT payments_paymentmethod_check 
    CHECK ("paymentMethod" IN ('chapa', 'telebirr'));
    
    RAISE NOTICE 'Updated paymentMethod enum';
END $$;

-- Make transactionId unique and not null for new records
DO $$
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'payments_transactionid_unique') THEN
        -- First update any NULL transactionIds
        UPDATE payments SET "transactionId" = 'LEGACY-' || id::text WHERE "transactionId" IS NULL;
        
        -- Add unique constraint
        ALTER TABLE payments ADD CONSTRAINT payments_transactionid_unique UNIQUE ("transactionId");
        
        RAISE NOTICE 'Added unique constraint to transactionId';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments("appointmentId");
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments("patientWallet");
CREATE INDEX IF NOT EXISTS idx_payments_doctor ON payments("doctorWallet");
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments("paymentMethod");
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments("transactionId");
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction ON payments("providerTransactionId");
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments("createdAt");

-- Add fee column to appointments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'fee') THEN
        ALTER TABLE appointments ADD COLUMN fee DECIMAL(10,2) DEFAULT 0.00;
        RAISE NOTICE 'Added fee column to appointments';
    END IF;
END $$;

-- Create a view for payment statistics
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    DATE(p."createdAt") as payment_date,
    p."paymentMethod",
    p.status,
    COUNT(*) as transaction_count,
    SUM(p.amount) as total_amount,
    AVG(p.amount) as average_amount
FROM payments p
GROUP BY DATE(p."createdAt"), p."paymentMethod", p.status
ORDER BY payment_date DESC, p."paymentMethod";

-- Create a function to update appointment payment status
CREATE OR REPLACE FUNCTION update_appointment_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update appointment payment status when payment status changes
    IF NEW.status = 'completed' AND NEW."appointmentId" IS NOT NULL THEN
        UPDATE appointments 
        SET "paymentStatus" = 'paid',
            fee = NEW.amount
        WHERE id = NEW."appointmentId";
    ELSIF NEW.status = 'failed' AND NEW."appointmentId" IS NOT NULL THEN
        UPDATE appointments 
        SET "paymentStatus" = 'pending'
        WHERE id = NEW."appointmentId";
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic appointment status updates
DROP TRIGGER IF EXISTS payment_status_update_trigger ON payments;
CREATE TRIGGER payment_status_update_trigger
    AFTER UPDATE OF status ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_payment_status();

RAISE NOTICE 'Enhanced payment system migration completed successfully!';