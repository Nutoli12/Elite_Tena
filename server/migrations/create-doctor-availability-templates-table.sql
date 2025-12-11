-- Create doctor availability templates table
-- This migration implements the availability template system for recurring patterns

-- Create doctor_availability_templates table
CREATE TABLE doctor_availability_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_wallet_address VARCHAR(255) NOT NULL,
  
  -- Template Information
  name VARCHAR(100) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0-6 (Sunday-Saturday)
  
  -- Time Slots (JSONB for flexible availability patterns)
  available_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Configuration
  slot_duration INTEGER DEFAULT 30 CHECK (slot_duration > 0), -- minutes
  buffer_time INTEGER DEFAULT 15 CHECK (buffer_time >= 0), -- minutes
  emergency_slot_percentage DECIMAL(3,2) DEFAULT 0.20 CHECK (emergency_slot_percentage >= 0 AND emergency_slot_percentage <= 1), -- 20%
  max_daily_appointments INTEGER DEFAULT 20 CHECK (max_daily_appointments > 0),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure effective_until is after effective_from
  CONSTRAINT valid_effective_period CHECK (
    effective_until IS NULL OR effective_until >= effective_from
  ),
  
  -- Ensure valid day_of_week values
  CONSTRAINT valid_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
  
  -- Unique constraint for active templates per doctor per day
  CONSTRAINT unique_active_template_per_day UNIQUE (
    doctor_wallet_address, day_of_week, effective_from
  ) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for optimal query performance
CREATE INDEX idx_availability_templates_doctor_wallet ON doctor_availability_templates(doctor_wallet_address);
CREATE INDEX idx_availability_templates_day_of_week ON doctor_availability_templates(day_of_week);
CREATE INDEX idx_availability_templates_is_active ON doctor_availability_templates(is_active);
CREATE INDEX idx_availability_templates_effective_dates ON doctor_availability_templates(effective_from, effective_until);

-- Create composite index for efficient template lookup
CREATE INDEX idx_availability_templates_doctor_day_active ON doctor_availability_templates(
  doctor_wallet_address, day_of_week, is_active
);

-- Create GIN index for JSONB available_slots queries
CREATE INDEX idx_availability_templates_available_slots ON doctor_availability_templates USING gin (available_slots);

-- Add foreign key constraint to doctors table
ALTER TABLE doctor_availability_templates 
ADD CONSTRAINT fk_availability_templates_doctor 
FOREIGN KEY (doctor_wallet_address) 
REFERENCES doctors("walletAddress") 
ON DELETE CASCADE;

-- Add reference to availability templates in time_slots table
ALTER TABLE time_slots 
ADD CONSTRAINT fk_time_slots_availability_template 
FOREIGN KEY (availability_template_id) 
REFERENCES doctor_availability_templates(id) 
ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON TABLE doctor_availability_templates IS 'Templates for doctor availability patterns with recurring schedules';
COMMENT ON COLUMN doctor_availability_templates.doctor_wallet_address IS 'Doctor wallet address who owns this template';
COMMENT ON COLUMN doctor_availability_templates.name IS 'Human-readable name for the template';
COMMENT ON COLUMN doctor_availability_templates.day_of_week IS 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)';
COMMENT ON COLUMN doctor_availability_templates.available_slots IS 'JSON array of availability slots with startTime, endTime, and type';
COMMENT ON COLUMN doctor_availability_templates.slot_duration IS 'Default duration for each appointment slot in minutes';
COMMENT ON COLUMN doctor_availability_templates.buffer_time IS 'Buffer time between appointments in minutes';
COMMENT ON COLUMN doctor_availability_templates.emergency_slot_percentage IS 'Percentage of slots reserved for emergencies (0.0-1.0)';
COMMENT ON COLUMN doctor_availability_templates.max_daily_appointments IS 'Maximum number of appointments per day';
COMMENT ON COLUMN doctor_availability_templates.is_active IS 'Whether this template is currently active';
COMMENT ON COLUMN doctor_availability_templates.effective_from IS 'Date when this template becomes effective';
COMMENT ON COLUMN doctor_availability_templates.effective_until IS 'Date when this template expires (NULL = no expiry)';

-- Create a function to validate available_slots JSON structure
CREATE OR REPLACE FUNCTION validate_available_slots(slots JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  slot JSONB;
  start_time TEXT;
  end_time TEXT;
  slot_type TEXT;
BEGIN
  -- Check if slots is an array
  IF jsonb_typeof(slots) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate each slot in the array
  FOR slot IN SELECT jsonb_array_elements(slots)
  LOOP
    -- Check required fields
    IF NOT (slot ? 'startTime' AND slot ? 'endTime' AND slot ? 'type') THEN
      RETURN FALSE;
    END IF;
    
    -- Extract values
    start_time := slot->>'startTime';
    end_time := slot->>'endTime';
    slot_type := slot->>'type';
    
    -- Validate time format (HH:MM)
    IF NOT (start_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' AND 
            end_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$') THEN
      RETURN FALSE;
    END IF;
    
    -- Validate slot type
    IF slot_type NOT IN ('available', 'break', 'lunch', 'unavailable') THEN
      RETURN FALSE;
    END IF;
    
    -- Validate that end_time is after start_time
    IF end_time <= start_time THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate available_slots JSON structure
ALTER TABLE doctor_availability_templates 
ADD CONSTRAINT valid_available_slots_format 
CHECK (validate_available_slots(available_slots));