-- Add Appointment Workflow Fields
-- Adds workflow state tracking and consultation session management

-- Add workflow state to appointments table
ALTER TABLE appointments 
ADD COLUMN workflow_state VARCHAR(50) DEFAULT 'scheduled',
ADD COLUMN consultation_started_at TIMESTAMP NULL,
ADD COLUMN consultation_completed_at TIMESTAMP NULL,
ADD COLUMN consultation_notes TEXT NULL,
ADD COLUMN diagnosis TEXT NULL,
ADD COLUMN treatment_plan TEXT NULL,
ADD COLUMN video_call_id UUID NULL,
ADD COLUMN checked_in_at TIMESTAMP NULL,
ADD COLUMN check_in_notes TEXT NULL;

-- Create consultation sessions table
CREATE TABLE IF NOT EXISTS consultation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_wallet_address VARCHAR(255) NOT NULL,
    patient_wallet_address VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    session_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_workflow_state ON appointments(workflow_state);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_workflow ON appointments(doctor_wallet_address, workflow_state);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_appointment ON consultation_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_doctor ON consultation_sessions(doctor_wallet_address);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_status ON consultation_sessions(status);

-- Add foreign key constraint for video call
ALTER TABLE appointments 
ADD CONSTRAINT fk_appointments_video_call 
FOREIGN KEY (video_call_id) REFERENCES video_calls(id) ON DELETE SET NULL;

-- Update existing appointments to have default workflow state
UPDATE appointments 
SET workflow_state = CASE 
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'in_progress' THEN 'consultation_started'
    WHEN status = 'scheduled' THEN 'scheduled'
    ELSE 'scheduled'
END
WHERE workflow_state IS NULL;

-- Add check constraint for workflow states
ALTER TABLE appointments 
ADD CONSTRAINT chk_workflow_state 
CHECK (workflow_state IN (
    'scheduled',
    'patient_checked_in',
    'ready_for_consultation',
    'consultation_started',
    'video_call_active',
    'consultation_completed',
    'follow_up_scheduled',
    'completed'
));

-- Add check constraint for consultation session status
ALTER TABLE consultation_sessions 
ADD CONSTRAINT chk_session_status 
CHECK (status IN ('active', 'paused', 'ended', 'cancelled'));

COMMENT ON COLUMN appointments.workflow_state IS 'Current state in the appointment workflow process';
COMMENT ON COLUMN appointments.consultation_started_at IS 'When the actual consultation began';
COMMENT ON COLUMN appointments.consultation_completed_at IS 'When the consultation was completed';
COMMENT ON COLUMN appointments.video_call_id IS 'Reference to active video call session';
COMMENT ON TABLE consultation_sessions IS 'Tracks active consultation sessions between doctors and patients';