# Quick Debug Reference - Medical Record Not Showing

## 🚨 Problem
Yeabsera Getachew can't see medical record created by Dr. Abinet

## 🎯 Most Likely Cause
**Wallet address mismatch** - the patient wallet used when creating the record doesn't match Yeabsera's login wallet

## ⚡ Quick Check (3 Steps)

### 1️⃣ Check Database (30 seconds)
```bash
psql -U postgres -d elite_tena -f debug-yeabsera-record.sql
```
**Look for:** Yeabsera's wallet address in the first query result

### 2️⃣ Check Doctor's Browser (when creating record)
Open DevTools (F12) → Console → Look for:
```
✅ Stored Patient Wallet: 0xABCD1234...
```
**Copy this address!**

### 3️⃣ Check Patient's Browser (when viewing records)
Open DevTools (F12) → Console → Look for:
```
🔍 Normalized Wallet: 0xABCD1234...
```
**Copy this address!**

## ✅ Compare
Do the two wallet addresses match?
- **YES** → Record should appear (check consent status)
- **NO** → Doctor selected wrong patient (create new record)

## 🔧 Quick Fixes

### Fix 1: Wrong Patient Selected
1. Ensure patient granted consent to doctor
2. Refresh doctor's page
3. Select correct patient from dropdown
4. Create new record

### Fix 2: Patient Not in Dropdown
1. Patient: Go to Consent Management
2. Patient: Grant access to Dr. Abinet
3. Doctor: Refresh Medical Records page
4. Patient should now appear in dropdown

### Fix 3: Consent Not Active
Check database:
```sql
SELECT status FROM consents 
WHERE "patientWalletAddress" = 'YEABSERA_WALLET'
AND "doctorWalletAddress" = 'ABINET_WALLET';
```
Status must be 'active', not 'pending' or 'denied'

## 📋 Restart Server
After code changes, restart the server:
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

## 📚 Full Documentation
- `TROUBLESHOOT-MEDICAL-RECORD.md` - Complete guide
- `DEBUG-MEDICAL-RECORD-FLOW.md` - Detailed flow
- `debug-yeabsera-record.sql` - SQL queries

## 🆘 Still Not Working?
Report these 4 things:
1. Wallet used to create record: `0x...`
2. Wallet used to fetch records: `0x...`
3. Do they match? Yes/No
4. Consent status: active/pending/denied
