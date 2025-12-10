-- Debug: Find Yeabsera Getachew's medical records
-- Run this in your PostgreSQL database to check if the record exists

-- 1. Find Yeabsera's user account
SELECT 
    "walletAddress",
    email,
    name,
    role,
    "profileData"->>'fullName' as profile_name,
    "createdAt"
FROM users
WHERE 
    LOWER(name) LIKE '%yeabsera%' 
    OR LOWER(email) LIKE '%yeabsera%'
    OR LOWER("profileData"->>'fullName') LIKE '%yeabsera%';

-- 2. Find Dr. Abinet's user account
SELECT 
    "walletAddress",
    email,
    name,
    role,
    "profileData"->>'fullName' as profile_name,
    "createdAt"
FROM users
WHERE 
    LOWER(name) LIKE '%abinet%' 
    OR LOWER(email) LIKE '%abinet%'
    OR LOWER("profileData"->>'fullName') LIKE '%abinet%';

-- 3. Find ALL medical records created recently
SELECT 
    id,
    "patientWalletAddress",
    "doctorWalletAddress",
    title,
    diagnosis,
    "recordType",
    "createdAt"
FROM medical_records
ORDER BY "createdAt" DESC
LIMIT 10;

-- 4. Find medical records by patient wallet (replace with Yeabsera's actual wallet)
-- Copy Yeabsera's wallet address from query #1 and paste it here:
-- SELECT * FROM medical_records WHERE "patientWalletAddress" = 'PASTE_WALLET_HERE';

-- 5. Find medical records by doctor wallet (replace with Dr. Abinet's actual wallet)
-- Copy Dr. Abinet's wallet address from query #2 and paste it here:
-- SELECT * FROM medical_records WHERE "doctorWalletAddress" = 'PASTE_WALLET_HERE';

-- 6. Check active consents between Dr. Abinet and Yeabsera
SELECT 
    id,
    "patientWalletAddress",
    "doctorWalletAddress",
    status,
    permissions,
    "expiresAt",
    "createdAt"
FROM consents
WHERE status = 'active'
ORDER BY "createdAt" DESC
LIMIT 10;

-- 7. Find all patients
SELECT 
    p."walletAddress",
    p.name as patient_name,
    u.name as user_name,
    u.email,
    u."profileData"->>'fullName' as profile_name
FROM patients p
LEFT JOIN users u ON p."walletAddress" = u."walletAddress"
ORDER BY p."createdAt" DESC
LIMIT 10;
