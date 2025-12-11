-- Add appointment note system and reschedule restrictions
-- This migration adds fields for the new no-cancel policy

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patientNote TEXT,
ADD COLUMN IF NOT EXISTS patientNoteDate TIMESTAMP,
ADD COLUMN IF NOT EXISTS canReschedule BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rescheduleDeadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS lastRescheduleDate TIMESTAMP,
ADD COLUMN IF NOT EXISTS rescheduleCount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS isRescheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS originalAppointmentDate TIMESTAMP,
ADD COLUMN IF NOT EXISTS rescheduleReason TEXT;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_appointments_reschedule_deadline ON appointments(rescheduleDeadline);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_note ON appointments(patientNote);

-- Update existing appointments to set reschedule deadline (24 hours before appointment)
UPDATE appointments 
SET rescheduleDeadline = appointmentDate - INTERVAL '24 hours'
WHERE rescheduleDeadline IS NULL AND appointmentDate > NOW();

-- Add comment for documentation
COMMENT ON COLUMN appointments.patientNote IS 'Note left by patient if they cannot attend';
COMMENT ON COLUMN appointments.patientNoteDate IS 'When patient left the note';
COMMENT ON COLUMN appointments.canReschedule IS 'Whether appointment can still be rescheduled';
COMMENT ON COLUMN appointments.rescheduleDeadline IS 'Deadline for rescheduling (24 hours before appointment)';
COMMENT ON COLUMN appointments.rescheduleCount IS 'Number of times appointment has been rescheduled';
COMMENT ON COLUMN appointments.isRescheduled IS 'Whether this appointment was rescheduled from another';
COMMENT ON COLUMN appointments.originalAppointmentDate IS 'Original appointment date if rescheduled';