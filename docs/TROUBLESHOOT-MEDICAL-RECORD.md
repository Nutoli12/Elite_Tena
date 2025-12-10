# Troubleshooting: Medical Record Not Showing for Patient

## Issue
Dr. Abinet created a medical record for Yeabsera Getachew, but Yeabsera cannot see it when logged in.

## Root Cause Analysis

The most common cause is **wallet address mismatch**:
- The patient wallet address used when creating the record doesn't match the wallet Yeabsera uses to log in
- This happens when the doctor selects the wrong patient from the dropdown

## Step-by-Step Troubleshooting

### 1. Check Database Directly

Run the SQL queries in `debug-yeabsera-record.sql`:

```bash
psql -U postgres -d elite_tena -f debug-yeabsera-record.sql
```

This will show:
- ✅ Yeabsera's actual wallet address
- ✅ Dr. Abinet's wallet address  
- ✅ All recent medical records
- ✅ Which patient wallet was used for each record

**What to look for:**
- Find Yeabsera's wallet address (e.g., `0x1234...`)
- Check if any medical records have that exact wallet in `patientWalletAddress`
- If no records match, the record was created for a different wallet

### 2. Test Record Creation Flow

**As Dr. Abinet:**

1. Open browser DevTools (F12) → Console tab
2. Navigate to Medical Records page
3. Select patient from dropdown
4. Click "Create Record"
5. Fill in the form
6. Click "Create Record" button

**Check console logs:**
```
📝 ========== CREATING MEDICAL RECORD ==========
📝 Final Patient Wallet: 0xABCD1234...
📝 Doctor Wallet: 0xDOCTOR...
✅ Stored Patient Wallet: 0xabcd1234...
```

**Copy the "Stored Patient Wallet" address** - this is what was saved to the database.

### 3. Test Record Fetching Flow

**As Yeabsera:**

1. Log in with MetaMask
2. Open browser DevTools (F12) → Console tab
3. Navigate to Medical Records page

**Check console logs:**
```
🔍 ========== FETCHING MEDICAL RECORDS ==========
🔍 Normalized Wallet: 0xabcd1234...
🔍 Requesting User Wallet: 0xabcd1234...
✅ Found X medical records
```

**Copy the "Normalized Wallet" address** - this is what's being queried.

### 4. Compare Wallet Addresses

Compare the two addresses from steps 2 and 3:

| Source | Wallet Address |
|--------|---------------|
| Created with (Step 2) | `0x...` |
| Queried with (Step 3) | `0x...` |
| **Match?** | ✅ Yes / ❌ No |

**If they DON'T match:**
- The doctor selected the wrong patient when creating the record
- The record exists in the database but for a different patient
- Solution: Create a new record with the correct patient selected

**If they DO match:**
- The record should appear
- Check for other issues (consent, API errors, etc.)

### 5. Use Debug Endpoint

If you have the record ID, you can check access permissions:

```bash
# Get the record ID from the database query
# Then call the debug endpoint:
curl http://localhost:3003/api/medical-records/debug/123 \
  -H "x-wallet-address: 0xYEABSERA_WALLET"
```

This will show:
- Record details (patient wallet, doctor wallet)
- Patient information (name, email)
- Doctor information (name, email)
- Access permissions (is patient, is doctor, has consent)

### 6. Check Server Logs

Look at your Node.js server terminal for detailed logs:

**When creating record:**
```
📝 ========== CREATING MEDICAL RECORD ==========
📝 Final Patient Wallet: 0x...
✅ Stored Patient Wallet: 0x...
```

**When fetching records:**
```
🔍 ========== FETCHING MEDICAL RECORDS ==========
🔍 Normalized Wallet: 0x...
✅ Found X medical records
📋 Record details:
  1. ID: 123, Title: ..., Patient: 0x..., Doctor: 0x...
```

**If no records found:**
```
⚠️ No records found. Checking database...
📊 Recent records in database:
  1. Patient: 0x..., Title: ...
```

## Common Issues & Solutions

### Issue 1: Wrong Patient Selected
**Symptoms:**
- Record created successfully
- Doctor can see the record
- Patient cannot see the record
- Wallet addresses don't match

**Solution:**
1. Verify patient has granted consent to doctor
2. Ensure patient appears in doctor's patient selector dropdown
3. Select the correct patient before creating record
4. Create a new record with correct patient

### Issue 2: Patient Not in Dropdown
**Symptoms:**
- Patient doesn't appear in doctor's patient selector
- Doctor cannot select the patient

**Solution:**
1. Patient must grant consent to doctor first (go to Consent Management)
2. Or patient must have an appointment with doctor
3. Refresh the page after consent is granted
4. Check that consent status is 'active', not 'pending'

### Issue 3: Consent Not Active
**Symptoms:**
- Record created successfully
- Patient has granted consent
- Patient still cannot see record

**Solution:**
1. Check consent status in database:
   ```sql
   SELECT * FROM consents 
   WHERE "patientWalletAddress" = 'YEABSERA_WALLET'
   AND "doctorWalletAddress" = 'ABINET_WALLET';
   ```
2. Ensure status is 'active', not 'pending' or 'denied'
3. Check that consent hasn't expired

### Issue 4: Case Sensitivity
**Symptoms:**
- Wallet addresses look the same but don't match
- One has uppercase letters, one has lowercase

**Solution:**
- This should be handled automatically (all wallets stored as lowercase)
- If still an issue, check the database directly
- Ensure both creation and fetching use `.toLowerCase()`

## Verification Checklist

- [ ] Run SQL queries to find Yeabsera's wallet address
- [ ] Check browser console when doctor creates record
- [ ] Check browser console when patient views records
- [ ] Compare the two wallet addresses
- [ ] Verify record exists in database with correct patient wallet
- [ ] Check consent status is 'active'
- [ ] Check server logs for errors
- [ ] Use debug endpoint to check record access

## Expected Flow (When Working Correctly)

1. **Patient grants consent to doctor**
   - Patient: Consent Management → Grant Access to Dr. Abinet
   - Status changes to 'active'

2. **Doctor sees patient in dropdown**
   - Doctor: Medical Records → Patient selector shows "Yeabsera Getachew"
   - Dropdown shows name, not wallet address

3. **Doctor creates record**
   - Doctor: Select "Yeabsera Getachew" from dropdown
   - Fill in record details
   - Click "Create Record"
   - Console shows: `✅ Stored Patient Wallet: 0xYEABSERA_WALLET`

4. **Patient sees record**
   - Patient: Medical Records page
   - Console shows: `🔍 Normalized Wallet: 0xYEABSERA_WALLET`
   - Console shows: `✅ Found 1 medical records`
   - Record appears in the list

## Next Steps

1. **Run the database queries** (`debug-yeabsera-record.sql`)
2. **Check browser console logs** (both doctor and patient)
3. **Compare wallet addresses** (must match exactly)
4. **Report findings:**
   - Yeabsera's wallet: `0x...`
   - Wallet used to create record: `0x...`
   - Wallet used to fetch records: `0x...`
   - Do they match? Yes/No
   - How many records found in database?

## Files Modified

- ✅ `server/src/controllers/medicalRecordController.js` - Added detailed logging
- ✅ `server/src/routes/medicalRecords.js` - Added debug endpoint
- ✅ `debug-yeabsera-record.sql` - SQL queries for debugging
- ✅ `DEBUG-MEDICAL-RECORD-FLOW.md` - Updated debug guide
- ✅ `TROUBLESHOOT-MEDICAL-RECORD.md` - This comprehensive guide

## Need Help?

If the issue persists after following these steps:
1. Share the wallet addresses from the console logs
2. Share the output from the SQL queries
3. Share any error messages from browser console or server logs
4. Confirm consent status is 'active'
