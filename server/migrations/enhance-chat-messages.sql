-- Migration: Enhance Chat Messages
-- Description: Add file sharing, read receipts, and metadata support
-- Date: 2024-12-05

-- Add new columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS readAt TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS fileUrl VARCHAR(500);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS fileName VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS fileSize INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS fileMimeType VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update type enum to include video and audio
ALTER TABLE messages ALTER COLUMN type TYPE VARCHAR(20);

-- Add comments
COMMENT ON COLUMN messages.readAt IS 'Timestamp when message was read';
COMMENT ON COLUMN messages.fileUrl IS 'URL for file attachments (IPFS or server)';
COMMENT ON COLUMN messages.fileName IS 'Original filename for attachments';
COMMENT ON COLUMN messages.fileSize IS 'File size in bytes';
COMMENT ON COLUMN messages.fileMimeType IS 'MIME type of the file';
COMMENT ON COLUMN messages.metadata IS 'Additional metadata (reply-to, reactions, etc.)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_appointment_created ON messages(appointmentId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(senderWallet, receiverWallet, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiverWallet, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING gin(metadata) WHERE metadata IS NOT NULL;

-- Add trigger to update readAt when read is set to true
CREATE OR REPLACE FUNCTION update_message_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.read = true AND OLD.read = false THEN
        NEW.readAt = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_message_read_at ON messages;
CREATE TRIGGER trigger_update_message_read_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_read_at();

COMMENT ON TABLE messages IS 'Chat messages between users with file sharing and read receipts support';
