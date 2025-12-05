-- Migration: Create Video Calls Table
-- Description: Support for video consultations with WebRTC
-- Date: 2024-12-05

CREATE TABLE IF NOT EXISTS video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointmentId" UUID REFERENCES appointments(id) ON DELETE SET NULL,
  "initiatorWallet" VARCHAR(255) NOT NULL REFERENCES users("walletAddress") ON DELETE CASCADE,
  "receiverWallet" VARCHAR(255) NOT NULL REFERENCES users("walletAddress") ON DELETE CASCADE,
  "roomId" VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'active', 'ended', 'missed', 'rejected', 'failed')),
  "startedAt" TIMESTAMP,
  "endedAt" TIMESTAMP,
  duration INTEGER,
  "endReason" VARCHAR(255),
  quality JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_calls_appointment ON video_calls("appointmentId");
CREATE INDEX IF NOT EXISTS idx_video_calls_initiator_receiver ON video_calls("initiatorWallet", "receiverWallet");
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(status);
CREATE INDEX IF NOT EXISTS idx_video_calls_created ON video_calls("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_video_calls_room ON video_calls("roomId");

-- Add comments
COMMENT ON TABLE video_calls IS 'Video call sessions for telemedicine consultations';
COMMENT ON COLUMN video_calls."appointmentId" IS 'Associated appointment (optional)';
COMMENT ON COLUMN video_calls."initiatorWallet" IS 'User who initiated the call';
COMMENT ON COLUMN video_calls."receiverWallet" IS 'User who received the call';
COMMENT ON COLUMN video_calls."roomId" IS 'Unique room identifier for the call';
COMMENT ON COLUMN video_calls.status IS 'Current status of the call';
COMMENT ON COLUMN video_calls."startedAt" IS 'When the call actually started';
COMMENT ON COLUMN video_calls."endedAt" IS 'When the call ended';
COMMENT ON COLUMN video_calls.duration IS 'Call duration in seconds';
COMMENT ON COLUMN video_calls."endReason" IS 'Reason for call ending';
COMMENT ON COLUMN video_calls.quality IS 'Call quality metrics (JSON)';
COMMENT ON COLUMN video_calls.metadata IS 'Additional call metadata (JSON)';

-- Trigger to auto-update updatedAt
CREATE OR REPLACE FUNCTION update_video_call_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_video_call_updated_at ON video_calls;
CREATE TRIGGER trigger_update_video_call_updated_at
    BEFORE UPDATE ON video_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_video_call_updated_at();

-- Trigger to calculate duration when call ends
CREATE OR REPLACE FUNCTION calculate_video_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."endedAt" IS NOT NULL AND NEW."startedAt" IS NOT NULL AND NEW.duration IS NULL THEN
        NEW.duration = EXTRACT(EPOCH FROM (NEW."endedAt" - NEW."startedAt"))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_video_call_duration ON video_calls;
CREATE TRIGGER trigger_calculate_video_call_duration
    BEFORE UPDATE ON video_calls
    FOR EACH ROW
    EXECUTE FUNCTION calculate_video_call_duration();
