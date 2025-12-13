-- Create Doctor Payment Settings Table
-- This table stores payment preferences and fee structures for each doctor

CREATE TABLE IF NOT EXISTS doctor_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "doctorWallet" VARCHAR(255) NOT NULL UNIQUE REFERENCES doctors("walletAddress"),
    
    -- Service fees (in ETB)
    "inPersonFee" DECIMAL(10,2) DEFAULT 0.00,
    "videoCallFee" DECIMAL(10,2) DEFAULT 100.00,
    "chatFee" DECIMAL(10,2) DEFAULT 50.00,
    
    -- Payment method preferences
    "acceptsChapa" BOOLEAN DEFAULT true,
    "acceptsTelebirr" BOOLEAN DEFAULT true,
    
    -- Peer-to-peer payment details
    "telebirrNumber" VARCHAR(50),
    "bankAccount" JSONB,
    "paymentInstructions" TEXT,
    
    -- Advanced settings
    "requiresApprovalForPaid" BOOLEAN DEFAULT true,
    "autoApproveUnder" DECIMAL(10,2),
    
    -- Availability settings
    "acceptsEmergency" BOOLEAN DEFAULT false,
    "emergencyMultiplier" DECIMAL(3,2) DEFAULT 1.50,
    
    -- Business hours and pricing
    "businessHours" JSONB,
    "afterHoursMultiplier" DECIMAL(3,2) DEFAULT 1.25,
    
    -- Payment terms
    "paymentDeadline" INTEGER DEFAULT 24, -- hours
    "cancellationPolicy" TEXT,
    
    -- Status
    "isActive" BOOLEAN DEFAULT true,
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doctor_payment_settings_doctor ON doctor_payment_settings("doctorWallet");
CREATE INDEX IF NOT EXISTS idx_doctor_payment_settings_active ON doctor_payment_settings("isActive");

-- Insert default settings for existing doctors
INSERT INTO doctor_payment_settings ("doctorWallet", "inPersonFee", "videoCallFee", "chatFee")
SELECT 
    "walletAddress",
    0.00 as "inPersonFee",
    100.00 as "videoCallFee", 
    50.00 as "chatFee"
FROM doctors 
WHERE "walletAddress" NOT IN (
    SELECT "doctorWallet" FROM doctor_payment_settings
);

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION update_doctor_payment_settings_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doctor_payment_settings_updated_at_trigger ON doctor_payment_settings;
CREATE TRIGGER doctor_payment_settings_updated_at_trigger
    BEFORE UPDATE ON doctor_payment_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_doctor_payment_settings_updated_at();

RAISE NOTICE 'Doctor payment settings table created successfully!';