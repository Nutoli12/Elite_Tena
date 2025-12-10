-- Add 'in_progress' to appointment status enum
-- This is needed for the consultation workflow

-- First, check if the value already exists (safe to run multiple times)
DO $$
BEGIN
    -- Add 'in_progress' to the status enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'in_progress' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_appointments_status')
    ) THEN
        ALTER TYPE enum_appointments_status ADD VALUE 'in_progress';
        RAISE NOTICE 'Added in_progress to enum_appointments_status';
    ELSE
        RAISE NOTICE 'in_progress already exists in enum_appointments_status';
    END IF;
END$$;

-- Verify the enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_appointments_status')
ORDER BY enumsortorder;
