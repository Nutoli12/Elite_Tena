-- Migration: Update Notification Types
-- Description: Expand notification types to support all user roles
-- Date: 2024-12-05

-- Drop the old enum type and create a new one with all notification types
ALTER TABLE notifications 
ALTER COLUMN type TYPE VARCHAR(50);

-- Update existing notification types to match new schema
UPDATE notifications SET type = 'appointment' WHERE type IN ('appointment', 'appointment_reminder');
UPDATE notifications SET type = 'prescription' WHERE type IN ('prescription', 'prescription_ready');
UPDATE notifications SET type = 'lab_result' WHERE type IN ('lab_result', 'lab_results_ready');

-- Add comment to document the allowed values
COMMENT ON COLUMN notifications.type IS 'Notification type: success, info, warning, error, appointment_reminder, appointment_confirmed, appointment_cancelled, payment_required, payment_confirmed, lab_results_ready, prescription_ready, video_call_ready, chat_message, new_appointment_request, patient_checked_in, lab_results_to_review, prescription_request, payment_received, video_call_request, new_prescription, prescription_picked_up, stock_alert, new_lab_order, urgent_test, results_uploaded, system_update, maintenance_scheduled';

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(userId, isRead) WHERE isRead = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expiresAt) WHERE expiresAt IS NOT NULL;

-- Add data column if it doesn't exist (for storing additional notification data)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='notifications' AND column_name='data') THEN
        ALTER TABLE notifications ADD COLUMN data JSONB;
        CREATE INDEX idx_notifications_data ON notifications USING gin(data);
    END IF;
END $$;

COMMENT ON TABLE notifications IS 'System notifications for all user roles with real-time delivery support';
