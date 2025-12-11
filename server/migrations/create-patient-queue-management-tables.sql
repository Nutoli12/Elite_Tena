-- Create patient queue management tables
-- This migration implements the queue management system for appointment scheduling

-- Create ENUM type for queue status
CREATE TYPE queue_status AS ENUM (
  'waiting', 'called', 'in_progress', 'completed', 'no_show'
);

-- Create patient_queues table
CREATE TABLE patient_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_wallet_address VARCHAR(255) NOT NULL,
  queue_date DATE NOT NULL,
  
  -- Queue State
  current_position INTEGER DEFAULT 1 CHECK (current_position > 0),
  total_patients INTEGER DEFAULT 0 CHECK (total_patients >= 0),
  average_wait_time INTEGER DEFAULT 30 CHECK (average_wait_time >= 0), -- minutes
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint for doctor/date combinations
  CONSTRAINT unique_doctor_queue_date UNIQUE (doctor_wallet_address, queue_date)
);

-- Create queue_entries table
CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES patient_queues(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Position Information
  queue_position INTEGER NOT NULL CHECK (queue_position > 0),
  estimated_wait_time INTEGER CHECK (estimated_wait_time >= 0), -- minutes
  
  -- Timing
  check_in_time TIMESTAMP,
  called_time TIMESTAMP,
  consultation_start_time TIMESTAMP,
  consultation_end_time TIMESTAMP,
  
  -- Status
  status queue_status DEFAULT 'waiting',
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique queue position per queue
  CONSTRAINT unique_queue_position UNIQUE (queue_id, queue_position),
  
  -- Ensure unique appointment per queue
  CONSTRAINT unique_appointment_per_queue UNIQUE (queue_id, appointment_id),
  
  -- Ensure consultation_end_time is after consultation_start_time
  CONSTRAINT valid_consultation_times CHECK (
    consultation_end_time IS NULL OR 
    consultation_start_time IS NULL OR 
    consultation_end_time > consultation_start_time
  ),
  
  -- Ensure called_time is after check_in_time
  CONSTRAINT valid_call_time CHECK (
    called_time IS NULL OR 
    check_in_time IS NULL OR 
    called_time >= check_in_time
  ),
  
  -- Ensure consultation_start_time is after called_time
  CONSTRAINT valid_consultation_start_time CHECK (
    consultation_start_time IS NULL OR 
    called_time IS NULL OR 
    consultation_start_time >= called_time
  )
);

-- Create indexes for optimal query performance
CREATE INDEX idx_patient_queues_doctor_wallet ON patient_queues(doctor_wallet_address);
CREATE INDEX idx_patient_queues_queue_date ON patient_queues(queue_date);
CREATE INDEX idx_patient_queues_is_active ON patient_queues(is_active);
CREATE INDEX idx_patient_queues_doctor_date_active ON patient_queues(doctor_wallet_address, queue_date, is_active);

CREATE INDEX idx_queue_entries_queue_id ON queue_entries(queue_id);
CREATE INDEX idx_queue_entries_appointment_id ON queue_entries(appointment_id);
CREATE INDEX idx_queue_entries_queue_position ON queue_entries(queue_position);
CREATE INDEX idx_queue_entries_status ON queue_entries(status);
CREATE INDEX idx_queue_entries_check_in_time ON queue_entries(check_in_time);

-- Create composite index for efficient queue queries
CREATE INDEX idx_queue_entries_queue_position_status ON queue_entries(queue_id, queue_position, status);

-- Add foreign key constraint to doctors table
ALTER TABLE patient_queues 
ADD CONSTRAINT fk_patient_queues_doctor 
FOREIGN KEY (doctor_wallet_address) 
REFERENCES doctors("walletAddress") 
ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE patient_queues IS 'Daily patient queues for each doctor';
COMMENT ON COLUMN patient_queues.doctor_wallet_address IS 'Doctor wallet address who owns this queue';
COMMENT ON COLUMN patient_queues.queue_date IS 'Date of the queue';
COMMENT ON COLUMN patient_queues.current_position IS 'Current position being served';
COMMENT ON COLUMN patient_queues.total_patients IS 'Total number of patients in queue';
COMMENT ON COLUMN patient_queues.average_wait_time IS 'Average wait time in minutes';
COMMENT ON COLUMN patient_queues.is_active IS 'Whether this queue is currently active';
COMMENT ON COLUMN patient_queues.last_updated IS 'When the queue was last updated';

COMMENT ON TABLE queue_entries IS 'Individual patient entries in queues';
COMMENT ON COLUMN queue_entries.queue_id IS 'Reference to the patient queue';
COMMENT ON COLUMN queue_entries.appointment_id IS 'Reference to the appointment';
COMMENT ON COLUMN queue_entries.queue_position IS 'Position in the queue (1-based)';
COMMENT ON COLUMN queue_entries.estimated_wait_time IS 'Estimated wait time in minutes';
COMMENT ON COLUMN queue_entries.check_in_time IS 'When patient checked in';
COMMENT ON COLUMN queue_entries.called_time IS 'When patient was called';
COMMENT ON COLUMN queue_entries.consultation_start_time IS 'When consultation started';
COMMENT ON COLUMN queue_entries.consultation_end_time IS 'When consultation ended';
COMMENT ON COLUMN queue_entries.status IS 'Current status in the queue';

-- Create function to update queue statistics
CREATE OR REPLACE FUNCTION update_queue_statistics(queue_uuid UUID)
RETURNS VOID AS $$
DECLARE
  total_count INTEGER;
  avg_wait INTEGER;
  current_pos INTEGER;
BEGIN
  -- Get total patients in queue
  SELECT COUNT(*) INTO total_count
  FROM queue_entries 
  WHERE queue_id = queue_uuid AND status != 'no_show';
  
  -- Calculate average wait time based on completed entries
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (consultation_start_time - check_in_time)) / 60), 30)::INTEGER
  INTO avg_wait
  FROM queue_entries 
  WHERE queue_id = queue_uuid 
    AND consultation_start_time IS NOT NULL 
    AND check_in_time IS NOT NULL
    AND status = 'completed';
  
  -- Get current position (lowest position that's not completed or no_show)
  SELECT COALESCE(MIN(queue_position), 1) INTO current_pos
  FROM queue_entries 
  WHERE queue_id = queue_uuid 
    AND status NOT IN ('completed', 'no_show');
  
  -- Update queue statistics
  UPDATE patient_queues 
  SET 
    total_patients = total_count,
    average_wait_time = COALESCE(avg_wait, 30),
    current_position = current_pos,
    last_updated = NOW()
  WHERE id = queue_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update queue statistics
CREATE OR REPLACE FUNCTION trigger_update_queue_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update statistics for the affected queue
  IF TG_OP = 'DELETE' THEN
    PERFORM update_queue_statistics(OLD.queue_id);
    RETURN OLD;
  ELSE
    PERFORM update_queue_statistics(NEW.queue_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER queue_entries_statistics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_queue_statistics();

-- Create function to calculate estimated wait time for a queue entry
CREATE OR REPLACE FUNCTION calculate_estimated_wait_time(
  entry_queue_id UUID,
  entry_position INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  avg_wait INTEGER;
  current_pos INTEGER;
  positions_ahead INTEGER;
  estimated_wait INTEGER;
BEGIN
  -- Get queue statistics
  SELECT average_wait_time, current_position 
  INTO avg_wait, current_pos
  FROM patient_queues 
  WHERE id = entry_queue_id;
  
  -- Calculate positions ahead
  positions_ahead = GREATEST(0, entry_position - current_pos);
  
  -- Calculate estimated wait time
  estimated_wait = positions_ahead * avg_wait;
  
  RETURN estimated_wait;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update estimated wait times
CREATE OR REPLACE FUNCTION trigger_update_estimated_wait_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Update estimated wait time for the new/updated entry
  NEW.estimated_wait_time = calculate_estimated_wait_time(NEW.queue_id, NEW.queue_position);
  
  -- Update estimated wait times for all entries in the same queue
  UPDATE queue_entries 
  SET estimated_wait_time = calculate_estimated_wait_time(queue_id, queue_position)
  WHERE queue_id = NEW.queue_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for estimated wait time updates
CREATE TRIGGER queue_entries_wait_time_trigger
  BEFORE INSERT OR UPDATE ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_estimated_wait_time();