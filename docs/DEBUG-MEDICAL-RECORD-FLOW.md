# Debug: Medical Record Not Showing for Patient

## Problem
Dr. Abinet created a medical record for patient "Yeabsera Getachew", but Yeabsera can't see it.

## CRITICAL: Wallet Address Matching
The most common issue is **wallet address mismatch**. The patient wallet used when creating the record MUST exactly match the wallet Yeabsera uses to log in.

### Quick Check
1. When Dr. Abinet creates the record, check browser console for: `📝 Final Patient Wallet: 0x...`
2. When Yeabsera views records, check browser console for: `🔍 Fetching medical records for: 0x...`
3. **These two addresses MUST be identical** (case-insensitive)

## Flow Check

### Step 1: Record Creation (Doctor Side)
**Check browser console when doctor creates record:**
```
📝 Creating medical record...
📤 Sending record to backend...
✅ Medical record created successfully
📋 Created record: { ... }
🔄 Refreshing records for wallet: [doctor's wallet or patient's wallet?]
```

**What to verify:**
- Is `patientWallet` in the request body correct (Yeabsera's wallet)?
- Does the API return success?
- What wallet is being used to refresh records?

### Step 2: Database Storage (Server Side)
**Check server console:**
```
📝 Creating medical record for patient: [Yeabsera's wallet]
✅ Medical record created: [record ID]
```

**SQL Query to verify:**
```sql
SELECT id, "patientWalletAddress", "doctorWalletAddress", title, diagnosis, "createdAt"
FROM medical_records
WHERE "patientWalletAddress" = '[Yeabsera wallet address]'
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Step 3: Patient Fetches Records
**Check browser console when Yeabsera views Medical Records:**
```
🔍 Fetching medical records for: [Yeabsera's wallet]
✅ Loaded X medical records
```

**What to verify:**
- Is the correct wallet address being used?
- How many records were returned?
- Are there any errors?

### Step 4: API Response (Server Side)
**Check server console:**
```
🔍 Fetching medical records for: [Yeabsera's wallet]
✅ Found X medical records
```

## Common Issues

### Issue 1: Wrong Wallet Address
**Symptom**: Record created with wrong `patientWalletAddress`
**Check**: Compare wallet in database vs Yeabsera's actual wallet
**Fix**: Ensure doctor selects correct patient from dropdown

### Issue 2: Case Sensitivity
**Symptom**: Wallet stored as `0xABC...` but queried as `0xabc...`
**Check**: Database stores lowercase, query uses lowercase
**Fix**: Already handled by `.toLowerCase()` in code

### Issue 3: Record Created But Not Fetched
**Symptom**: Record exists in DB but API doesn't return it
**Check**: Consent check might be blocking it
**Fix**: Patient viewing own records should bypass consent

### Issue 4: Frontend Not Refreshing
**Symptom**: Record exists, API returns it, but UI doesn't show
**Check**: `fetchRecords()` called? State updated?
**Fix**: Check React state management

## Debug Steps

### Step 1: Run Database Query
Use the file `debug-yeabsera-record.sql` to check the database directly:
```bash
# Connect to your PostgreSQL database and run:
psql -U your_username -d your_database -f debug-yeabsera-record.sql
```

This will show:
- Yeabsera's wallet address
- Dr. Abinet's wallet address
- All recent medical records
- Active consents

### Step 2: Check Browser Console (Doctor Side)
When Dr. Abinet creates a record:
1. Open browser DevTools (F12) → Console tab
2. Look for these logs:
   ```
   📝 ========== CREATING MEDICAL RECORD ==========
   📝 Final Patient Wallet: 0x...
   📝 Doctor Wallet: 0x...
   ✅ Stored Patient Wallet: 0x...
   ```
3. **Copy the "Stored Patient Wallet" address**

### Step 3: Check Browser Console (Patient Side)
When Yeabsera views Medical Records:
1. Open browser DevTools (F12) → Console tab
2. Look for these logs:
   ```
   🔍 ========== FETCHING MEDICAL RECORDS ==========
   🔍 Normalized Wallet: 0x...
   🔍 Requesting User Wallet: 0x...
   ✅ Found X medical records
   ```
3. **Copy the "Normalized Wallet" address**

### Step 4: Compare Wallet Addresses
Compare the two wallet addresses from Steps 2 and 3:
- **If they match**: Record should appear (check for other issues)
- **If they don't match**: This is the problem! The doctor selected the wrong patient.

### Step 5: Check Server Logs
Look at your server terminal for detailed logs showing:
- What wallet was used to create the record
- What wallet is being queried
- How many records were found
- If no records found, it shows recent records in the database

## Common Solutions

### Solution 1: Wrong Patient Selected
**Problem**: Doctor selected wrong patient from dropdown
**Fix**: 
1. Ensure patient has granted consent to doctor
2. Doctor should see patient's name in dropdown (not just wallet)
3. Select correct patient before creating record

### Solution 2: Patient Not in Dropdown
**Problem**: Patient doesn't appear in doctor's patient selector
**Fix**:
1. Patient must grant consent to doctor first
2. Or patient must have an appointment with doctor
3. Refresh the page after consent is granted

### Solution 3: Record Exists But Not Showing
**Problem**: Database has record, but API doesn't return it
**Fix**: Check consent status - must be 'active', not 'pending' or 'denied'

## Next Steps

1. Run the SQL queries in `debug-yeabsera-record.sql`
2. Check browser console logs (both doctor and patient)
3. Compare the wallet addresses
4. Report findings:
   - Wallet used to create record: `0x...`
   - Wallet used to fetch records: `0x...`
   - Do they match? Yes/No
   - How many records in database for Yeabsera?
