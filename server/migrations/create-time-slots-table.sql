-- Create time slots table with overlap prevention constraints
-- This migration implements the core time slot management system

-- Enable btree_gist extension for EXCLUDE constraints with text fields
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create ENUM types for slot status and type
CREATE TYPE slot_status AS ENUM (
  'available', 'booked', 'blocked', 'emergency_reserved', 'cancelled'
);

CREATE TYPE slot_type AS ENUM ('regular', 'emergency', 'buffer');

-- Create time_slots table
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_wallet_address VARCHAR(255) NOT NULL,
  
  -- Time Information
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  
  -- Availability
  status slot_status DEFAULT 'available',
  slot_type slot_type DEFAULT 'regular',
  
  -- Relationships
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  availability_template_id UUID,
  
  -- Constraints
  buffer_time INTEGER DEFAULT 15,
  is_bookable BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent overlapping slots for same doctor
  CONSTRAINT no_overlapping_slots EXCLUDE USING gist (
    doctor_wallet_address WITH =,
    tsrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled'),
  
  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  
  -- Ensure duration matches time range
  CONSTRAINT duration_matches_time_range CHECK (
    duration = EXTRACT(EPOCH FROM (end_time - start_time)) / 60
  )
);

-- Create indexes for optimal query performance
CREATE INDEX idx_time_slots_doctor_wallet ON time_slots(doctor_wallet_address);
CREATE INDEX idx_time_slots_start_time ON time_slots(start_time);
CREATE INDEX idx_time_slots_end_time ON time_slots(end_time);
CREATE INDEX idx_time_slots_status ON time_slots(status);
CREATE INDEX idx_time_slots_slot_type ON time_slots(slot_type);
CREATE INDEX idx_time_slots_appointment_id ON time_slots(appointment_id);

-- Create composite index for efficient availability queries
CREATE INDEX idx_time_slots_doctor_time_status ON time_slots(
  doctor_wallet_address, start_time, status
);

-- Create index for time range queries
CREATE INDEX idx_time_slots_time_range ON time_slots USING gist (
  tsrange(start_time, end_time)
);

-- Add foreign key constraint to doctors table
ALTER TABLE time_slots 
ADD CONSTRAINT fk_time_slots_doctor 
FOREIGN KEY (doctor_wallet_address) 
REFERENCES doctors("walletAddress") 
ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE time_slots IS 'Time slots for appointment scheduling with overlap prevention';
COMMENT ON COLUMN time_slots.doctor_wallet_address IS 'Doctor wallet address who owns this time slot';
COMMENT ON COLUMN time_slots.start_time IS 'Start time of the time slot';
COMMENT ON COLUMN time_slots.end_time IS 'End time of the time slot';
COMMENT ON COLUMN time_slots.duration IS 'Duration of the slot in minutes';
COMMENT ON COLUMN time_slots.status IS 'Current status of the time slot';
COMMENT ON COLUMN time_slots.slot_type IS 'Type of slot (regular, emergency, buffer)';
COMMENT ON COLUMN time_slots.appointment_id IS 'Associated appointment ID if booked';
COMMENT ON COLUMN time_slots.buffer_time IS 'Buffer time after this slot in minutes';
COMMENT ON COLUMN time_slots.is_bookable IS 'Whether this slot can be booked by patients';
COMMENT ON CONSTRAINT no_overlapping_slots ON time_slots IS 'Prevents overlapping time slots for the same doctor';