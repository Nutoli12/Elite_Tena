-- =====================================================
-- PREMIUM CONSULTATIONS SYSTEM
-- Chat & Video Consultations with Payment Integration
-- =====================================================

-- 1. Premium Consultations Table (Unified for Chat & Video)
CREATE TABLE IF NOT EXISTS premium_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  patient_id INTEGER NOT NULL,
  patient_wallet VARCHAR(255) NOT NULL,
  doctor_id INTEGER NOT NULL,
  doctor_wallet VARCHAR(255) NOT NULL,
  
  -- Consultation Type
  consultation_type VARCHAR(20) NOT NULL CHECK (consultation_type IN ('chat', 'video')),
  
  -- Scheduling (for video)
  scheduled_time TIMESTAMP,
  duration_minutes INTEGER DEFAULT 30,
  
  -- Pricing
  consultation_fee DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETB',
  
  -- Payment Details
  payment_method VARCHAR(50), -- 'chapa', 'telebirr', 'cbe_birr', 'bank_transfer', 'cash'
  payment_reference VARCHAR(255), -- Transaction reference from patient
  chapa_tx_ref VARCHAR(255), -- Chapa transaction reference (if using Chapa)
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'submitted', 'verified', 'failed', 'refunded')),
  payment_verified_by INTEGER, -- Doctor who verified P2P payment
  payment_verified_at TIMESTAMP,
  
  -- Daily.co Integration (for video)
  daily_room_name VARCHAR(255),
  daily_room_url TEXT,
  daily_host_token TEXT, -- Doctor's token
  daily_participant_token TEXT, -- Patient's token
  
  -- Chat Room (for chat)
  chat_room_id VARCHAR(255) UNIQUE,
  
  -- Session Tracking
  status VARCHAR(20) DEFAULT 'requested' CHECK (status IN (
    'requested',      -- Patient requested consultation
    'payment_pending', -- Waiting for payment
    'payment_submitted', -- Patient submitted payment reference
    'verified',       -- Payment verified, ready to start
    'active',         -- Consultation in progress
    'completed',      -- Consultation finished
    'cancelled',      -- Cancelled by either party
    'expired',        -- Time expired without completion
    'no_show'         -- Patient/Doctor didn't show up
  )),
  
  -- Timestamps
  activated_at TIMESTAMP, -- When consultation became active
  expires_at TIMESTAMP, -- When access expires
  started_at TIMESTAMP, -- When actual consultation started
  ended_at TIMESTAMP, -- When consultation ended
  actual_duration_seconds INTEGER,
  
  -- Consultation Summary
  doctor_notes TEXT,
  consultation_summary TEXT,
  follow_up_recommended BOOLEAN DEFAULT FALSE,
  prescription_issued BOOLEAN DEFAULT FALSE,
  
  -- Rating
  patient_rating INTEGER CHECK (patient_rating >= 1 AND patient_rating <= 5),
  patient_feedback TEXT,
  doctor_rating INTEGER CHECK (doctor_rating >= 1 AND doctor_rating <= 5),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Consultation Messages Table
CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES premium_consultations(id) ON DELETE CASCADE,
  
  -- Sender
  sender_id INTEGER NOT NULL,
  sender_wallet VARCHAR(255) NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('patient', 'doctor')),
  
  -- Message Content
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'prescription', 'system')),
  content TEXT,
  
  -- File Attachment (if any)
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_mime_type VARCHAR(100),
  
  -- Read Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Video Call Sessions (tracks actual video calls within consultations)
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES premium_consultations(id) ON DELETE CASCADE,
  
  -- Daily.co Meeting Info
  daily_meeting_id VARCHAR(255),
  
  -- Participants
  patient_joined_at TIMESTAMP,
  patient_left_at TIMESTAMP,
  doctor_joined_at TIMESTAMP,
  doctor_left_at TIMESTAMP,
  
  -- Call Quality
  patient_network_quality VARCHAR(20), -- 'good', 'average', 'poor'
  doctor_network_quality VARCHAR(20),
  
  -- Recording (if enabled)
  recording_enabled BOOLEAN DEFAULT FALSE,
  recording_consent_patient BOOLEAN DEFAULT FALSE,
  recording_consent_doctor BOOLEAN DEFAULT FALSE,
  recording_url TEXT,
  
  -- Call Status
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended', 'failed')),
  end_reason VARCHAR(50), -- 'completed', 'timeout', 'disconnected', 'cancelled'
  
  -- Duration
  duration_seconds INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Consultation Availability (Doctor's available slots for video)
CREATE TABLE IF NOT EXISTS consultation_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id INTEGER NOT NULL,
  doctor_wallet VARCHAR(255) NOT NULL,
  
  -- Availability Type
  availability_type VARCHAR(20) DEFAULT 'video' CHECK (availability_type IN ('video', 'chat', 'both')),
  
  -- Day of Week (0=Sunday, 6=Saturday)
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Time Slots
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Slot Duration
  slot_duration_minutes INTEGER DEFAULT 30,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(doctor_wallet, day_of_week, start_time, availability_type)
);

-- 5. Update DoctorPaymentSettings to include consultation fees
ALTER TABLE doctor_payment_settings 
ADD COLUMN IF NOT EXISTS chat_consultation_fee DECIMAL(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS video_consultation_fee DECIMAL(10,2) DEFAULT 800.00,
ADD COLUMN IF NOT EXISTS chat_duration_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS video_slot_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS accepts_chat_consultations BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS accepts_video_consultations BOOLEAN DEFAULT TRUE;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_premium_consultations_patient ON premium_consultations(patient_wallet);
CREATE INDEX IF NOT EXISTS idx_premium_consultations_doctor ON premium_consultations(doctor_wallet);
CREATE INDEX IF NOT EXISTS idx_premium_consultations_status ON premium_consultations(status);
CREATE INDEX IF NOT EXISTS idx_premium_consultations_type ON premium_consultations(consultation_type);
CREATE INDEX IF NOT EXISTS idx_premium_consultations_scheduled ON premium_consultations(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_premium_consultations_created ON premium_consultations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_consultation ON consultation_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_sender ON consultation_messages(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_created ON consultation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_unread ON consultation_messages(consultation_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_video_call_sessions_consultation ON video_call_sessions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_video_call_sessions_status ON video_call_sessions(status);

CREATE INDEX IF NOT EXISTS idx_consultation_availability_doctor ON consultation_availability(doctor_wallet);
CREATE INDEX IF NOT EXISTS idx_consultation_availability_day ON consultation_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_consultation_availability_active ON consultation_availability(doctor_wallet, is_active) WHERE is_active = TRUE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_premium_consultation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_premium_consultation_timestamp ON premium_consultations;
CREATE TRIGGER trigger_update_premium_consultation_timestamp
    BEFORE UPDATE ON premium_consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_premium_consultation_timestamp();

DROP TRIGGER IF EXISTS trigger_update_video_call_session_timestamp ON video_call_sessions;
CREATE TRIGGER trigger_update_video_call_session_timestamp
    BEFORE UPDATE ON video_call_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_premium_consultation_timestamp();

-- Calculate actual duration when consultation ends
CREATE OR REPLACE FUNCTION calculate_consultation_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL AND NEW.actual_duration_seconds IS NULL THEN
        NEW.actual_duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_consultation_duration ON premium_consultations;
CREATE TRIGGER trigger_calculate_consultation_duration
    BEFORE UPDATE ON premium_consultations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_consultation_duration();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE premium_consultations IS 'Premium chat and video consultations with payment tracking';
COMMENT ON TABLE consultation_messages IS 'Messages within premium chat consultations';
COMMENT ON TABLE video_call_sessions IS 'Individual video call sessions within consultations';
COMMENT ON TABLE consultation_availability IS 'Doctor availability slots for video consultations';

COMMENT ON COLUMN premium_consultations.consultation_type IS 'Type: chat (24h access) or video (scheduled)';
COMMENT ON COLUMN premium_consultations.payment_method IS 'Payment method: chapa, telebirr, cbe_birr, bank_transfer, cash';
COMMENT ON COLUMN premium_consultations.payment_reference IS 'Transaction reference provided by patient for P2P payments';
COMMENT ON COLUMN premium_consultations.daily_room_name IS 'Daily.co room name for video consultations';
