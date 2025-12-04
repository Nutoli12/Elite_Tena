-- Fix doctor payment settings
INSERT INTO doctor_payment_settings (
  id, 
  "doctorWalletAddress", 
  "cashEnabled", 
  "videoCallFee", 
  "chatFee",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  "walletAddress",
  TRUE,
  50.00,
  30.00,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM doctors
WHERE "walletAddress" NOT IN (
  SELECT "doctorWalletAddress" FROM doctor_payment_settings
)
ON CONFLICT ("doctorWalletAddress") DO NOTHING;

-- Verify
SELECT COUNT(*) as total_doctors FROM doctors;
SELECT COUNT(*) as doctors_with_payment_settings FROM doctor_payment_settings;
SELECT * FROM doctor_payment_settings LIMIT 3;
