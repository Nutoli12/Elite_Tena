-- Run this query to see what data exists for patients with active consent
-- Replace 'DOCTOR_WALLET' with the actual doctor's wallet address

SELECT 
    c.id as consent_id,
    c.status,
    c."patientWalletAddress",
    p.id as patient_id,
    p.name as patient_name,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    u."profileData" as profile_data
FROM consents c
LEFT JOIN patients p ON c."patientWalletAddress" = p."walletAddress"
LEFT JOIN users u ON p."walletAddress" = u."walletAddress"
WHERE c."doctorWalletAddress" = 'DOCTOR_WALLET'
AND c.status = 'active'
ORDER BY c."requestedAt" DESC;
