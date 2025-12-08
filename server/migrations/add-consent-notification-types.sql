-- Add consent notification types to the notifications type enum

-- Add new consent notification types
ALTER TYPE enum_notifications_type ADD VALUE IF NOT EXISTS 'consent_request';
ALTER TYPE enum_notifications_type ADD VALUE IF NOT EXISTS 'consent_granted';
ALTER TYPE enum_notifications_type ADD VALUE IF NOT EXISTS 'consent_revoked';
ALTER TYPE enum_notifications_type ADD VALUE IF NOT EXISTS 'consent_expired';

-- Comment for documentation
COMMENT ON TYPE enum_notifications_type IS 'Notification types including consent management notifications';
