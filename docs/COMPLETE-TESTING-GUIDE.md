# Complete Testing Guide - End-to-End

## 🧪 How to Test Everything We Built

This guide will walk you through testing the complete system from patient registration to prescription dispensing and lab results.

---

## 📋 Prerequisites

### 1. Run Database Migration
```bash
psql -U postgres -d elite_tena -f server/migrations/add-pharmacy-lab-flow-fields.sql
```

### 2. Start the Server
```bash
cd C:\Users\nutir\Desktop\Elite_Tena
npm run dev
```

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```

Server should be running on: `http://localhost:3003`
Frontend should be running on: `http://localhost:5173`

---

## 🎭 Test Scenario: Complete Patient Journey

### STEP 1: Register New Patient (Yeabsera)

1. **Open browser**: `http://localhost:5173`
2. **Click "Register"**
3. **Fill in registration form**:
   - Email: `yeabsera@gmail.com`
   - Password: `password123`
   - Full Name: `Yeabsera Getachew`
   - Role: **Patient**
4. **Connect MetaMask** when prompted
5. **Click "Register"**
6. **Verify**: You should be logged in and see patient dashboard

**What to check**:
- ✅ Registration successful
- ✅ MetaMask connected
- ✅ Dashboard shows patient name
- ✅ Wallet address displayed

---

### STEP 2: Register Doctor (Dr. Abinet)

1. **Logout** (top right)
2. **Click "Register"**
3. **Fill in registration form**:
   - Email: `abinet@hospital.com`
   - Password: `doctor123`
   - Full Name: `Dr. Abinet Tesfaye`
   - Role: **Doctor**
   - Specialization: `General Practice`
4. **Connect MetaMask** (use different account)
5. **Click "Register"**
6. **Verify**: You should see doctor dashboard

**What to check**:
- ✅ Doctor registered successfully
- ✅ Different MetaMask account
- ✅ Dashboard shows doctor interface
- ✅ Can see appointments, patients, etc.

---

### STEP 3: Patient Books Appointment

1. **Logout and login as Yeabsera** (patient)
2. **Go to "Appointments"** page
3. **Click "Book Appointment"**
4. **Fill in form**:
   - Doctor: Select "Dr. Abinet Tesfaye"
   - Date: Tomorrow's date
   - Time: 10:00 AM
   - Type: In-Person
   - Reason: "Annual checkup"
5. **Click "Book Appointment"**

**What to check**:
- ✅ Appointment created
- ✅ Status shows "Pending" or "Scheduled"
- ✅ Appointment appears in patient's list

---

### STEP 4: Doctor Approves Appointment

1. **Logout and login as Dr. Abinet**
2. **Go to "Appointments"** page
3. **Find Yeabsera's appointment**
4. **Click "Approve"** or change status to "Approved"

**What to check**:
- ✅ Appointment status changed to "Approved"
- ✅ Patient should see updated status

---

### STEP 5: Patient Grants Consent to Doctor

1. **Logout and login as Yeabsera** (patient)
2. **Go to "Consent Management"** page
3. **Click "Grant Access"** or "Request Access"
4. **Select Dr. Abinet**
5. **Select permissions**:
   - ✅ View Medical History
   - ✅ View Lab Results
   - ✅ View Prescriptions
6. **Set expiry**: 30 days from now
7. **Click "Grant Access"**

**What to check**:
- ✅ Consent granted successfully
- ✅ Status shows "Active"
- ✅ Doctor should see patient in their consent list

---

### STEP 6: Doctor Creates Medical Record

1. **Login as Dr. Abinet**
2. **Go to "Medical Records"** page
3. **Select patient**: Yeabsera Getachew (from dropdown)
4. **Click "Create Record"**
5. **Fill in form**:
   - Title: "Annual Checkup 2024"
   - Diagnosis: "Patient is healthy, no issues found"
   - Treatment: "Continue healthy lifestyle"
   - Symptoms: "None"
   - Notes: "Blood pressure normal, weight normal"
6. **Click "Create Record"**

**What to check**:
- ✅ Record created successfully
- ✅ Record appears in doctor's view
- ✅ Patient can see record in their Medical Records page

**Verify as patient**:
1. Logout and login as Yeabsera
2. Go to Medical Records
3. Should see "Annual Checkup 2024" record
4. Click "View Details" to see full information

---

### STEP 7: Doctor Creates Prescription

**Note**: You need to add the modal to the consultation interface first. For now, test via API:

```bash
curl -X POST http://localhost:3003/api/prescriptions \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "YEABSERA_WALLET_ADDRESS",
    "doctorWalletAddress": "DOCTOR_WALLET_ADDRESS",
    "medicationName": "Amoxicillin 500mg",
    "dosage": "500mg",
    "frequency": "3 times daily",
    "duration": "7 days",
    "quantity": 21,
    "refills": 0,
    "instructions": "Take with food. Complete full course.",
    "issueDate": "2024-12-08",
    "expiryDate": "2024-12-15"
  }'
```

**Replace**:
- `YEABSERA_WALLET_ADDRESS` with Yeabsera's actual wallet (from MetaMask)
- `DOCTOR_WALLET_ADDRESS` with Dr. Abinet's wallet

**What to check**:
- ✅ Prescription created (check response)
- ✅ Status is "active"

---

### STEP 8: Register Pharmacist

1. **Logout**
2. **Register new user**:
   - Email: `pharmacist@hospital.com`
   - Password: `pharma123`
   - Full Name: `Sarah Pharmacist`
   - Role: **Pharmacist**
3. **Connect MetaMask** (different account)

---

### STEP 9: Pharmacist Views Pending Prescriptions

1. **Login as Pharmacist**
2. **Go to "Pharmacy Dashboard"** or **"Prescriptions"** page
3. **Should see**: Yeabsera's prescription for Amoxicillin

**Test via API**:
```bash
curl http://localhost:3003/api/prescriptions/pending
```

**What to check**:
- ✅ Prescription appears in pending list
- ✅ Shows patient name (Yeabsera)
- ✅ Shows medication details
- ✅ Status is "active"

---

### STEP 10: Pharmacist Dispenses Prescription

**Test via API** (until you add the modal to the page):
```bash
curl -X POST http://localhost:3003/api/prescriptions/PRESCRIPTION_ID/dispense \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacistWallet": "PHARMACIST_WALLET_ADDRESS",
    "dispensedQuantity": 21,
    "dispensedDate": "2024-12-08",
    "notes": "Patient counseled on side effects",
    "batchNumber": "BATCH-2024-001"
  }'
```

**Replace**:
- `PRESCRIPTION_ID` with actual prescription ID (from step 7 response or database)
- `PHARMACIST_WALLET_ADDRESS` with pharmacist's wallet

**What to check**:
- ✅ Prescription status changed to "dispensed"
- ✅ Patient can see "Dispensed" status

**Verify as patient**:
1. Login as Yeabsera
2. Go to Prescriptions page
3. Should see prescription with status "Dispensed"

---

### STEP 11: Doctor Orders Lab Test

**Test via API**:
```bash
curl -X POST http://localhost:3003/api/lab-results \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "YEABSERA_WALLET_ADDRESS",
    "doctorWalletAddress": "DOCTOR_WALLET_ADDRESS",
    "testType": "Blood Test",
    "testName": "Complete Blood Count (CBC)",
    "priority": "routine",
    "instructions": "Fasting required - 8 hours",
    "reason": "Annual checkup",
    "testDate": "2024-12-08"
  }'
```

**What to check**:
- ✅ Lab test created
- ✅ Status is "pending"

---

### STEP 12: Register Lab Technician

1. **Logout**
2. **Register new user**:
   - Email: `labtech@hospital.com`
   - Password: `lab123`
   - Full Name: `John Lab Tech`
   - Role: **Lab Technician**
3. **Connect MetaMask** (different account)

---

### STEP 13: Lab Tech Views Pending Tests

1. **Login as Lab Tech**
2. **Go to "Lab Dashboard"** or **"Lab Results"** page
3. **Should see**: Yeabsera's CBC test

**Test via API**:
```bash
curl http://localhost:3003/api/lab-results/orders?status=pending
```

**What to check**:
- ✅ Test appears in pending list
- ✅ Shows patient name
- ✅ Shows test details
- ✅ Status is "pending"

---

### STEP 14: Lab Tech Uploads Results

**Test via API**:
```bash
curl -X POST http://localhost:3003/api/lab-results/upload \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "YEABSERA_WALLET_ADDRESS",
    "testId": "LAB_TEST_ID",
    "results": "WBC: 7.5 × 10³/μL\nRBC: 5.2 × 10⁶/μL\nHemoglobin: 14.5 g/dL\nPlatelets: 250 × 10³/μL",
    "notes": "Sample collected at 8:00 AM, processed at 10:00 AM",
    "interpretation": "All values within normal range. No abnormalities detected.",
    "normalRange": "See individual values",
    "performedBy": "LAB_TECH_WALLET_ADDRESS"
  }'
```

**Replace**:
- `LAB_TEST_ID` with actual test ID (from step 11 response)
- `LAB_TECH_WALLET_ADDRESS` with lab tech's wallet

**What to check**:
- ✅ Test status changed to "completed"
- ✅ Results saved

---

### STEP 15: Patient Views Lab Results

1. **Login as Yeabsera**
2. **Go to "Lab Results"** page
3. **Should see**: CBC test with status "Completed"
4. **Click "View Details"** to see results

**What to check**:
- ✅ Test appears in patient's list
- ✅ Status shows "Completed"
- ✅ Can view test results
- ✅ Can see interpretation

---

### STEP 16: Doctor Views Lab Results

1. **Login as Dr. Abinet**
2. **Go to "Lab Results"** page
3. **Should see**: Yeabsera's CBC results

**What to check**:
- ✅ Doctor can see patient's results
- ✅ Can view full details
- ✅ Can see interpretation

---

## 🔍 Quick Verification Checklist

### Database Check
```bash
# Check users
psql -U postgres -d elite_tena -c "SELECT email, role, \"walletAddress\" FROM users;"

# Check prescriptions
psql -U postgres -d elite_tena -c "SELECT id, \"medicationName\", status, \"patientWalletAddress\" FROM prescriptions;"

# Check lab results
psql -U postgres -d elite_tena -c "SELECT id, \"testName\", status, \"patientWalletAddress\" FROM lab_results;"

# Check medical records
psql -U postgres -d elite_tena -c "SELECT id, title, \"patientWalletAddress\", \"doctorWalletAddress\" FROM medical_records;"

# Check consents
psql -U postgres -d elite_tena -c "SELECT id, status, \"patientWalletAddress\", \"doctorWalletAddress\" FROM consents;"
```

### API Health Check
```bash
# Test server is running
curl http://localhost:3003/api/health

# Test prescriptions endpoint
curl http://localhost:3003/api/prescriptions

# Test lab results endpoint
curl http://localhost:3003/api/lab-results
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot connect to database"
**Solution**: 
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
# Windows: Services → PostgreSQL → Restart
```

### Issue 2: "Migration already applied"
**Solution**: This is OK! It means the migration ran successfully before.

### Issue 3: "Prescription not showing"
**Solution**: 
1. Check wallet addresses match exactly
2. Check prescription status is "active"
3. Check browser console for errors

### Issue 4: "Lab test not showing"
**Solution**:
1. Check test status is "pending" or "completed"
2. Check patient wallet address is correct
3. Verify doctor wallet address is set

### Issue 5: "MetaMask not connecting"
**Solution**:
1. Unlock MetaMask
2. Switch to correct network
3. Refresh page
4. Try different browser

---

## 📊 Expected Results Summary

After completing all steps, you should have:

✅ **4 Users Registered**:
- Yeabsera (Patient)
- Dr. Abinet (Doctor)
- Sarah (Pharmacist)
- John (Lab Tech)

✅ **1 Appointment**:
- Patient: Yeabsera
- Doctor: Dr. Abinet
- Status: Approved

✅ **1 Consent**:
- Patient: Yeabsera
- Doctor: Dr. Abinet
- Status: Active

✅ **1 Medical Record**:
- Patient: Yeabsera
- Doctor: Dr. Abinet
- Title: "Annual Checkup 2024"

✅ **1 Prescription**:
- Patient: Yeabsera
- Medication: Amoxicillin 500mg
- Status: Dispensed
- Dispensed by: Sarah (Pharmacist)

✅ **1 Lab Test**:
- Patient: Yeabsera
- Test: Complete Blood Count
- Status: Completed
- Performed by: John (Lab Tech)

---

## 🎯 Next Steps

1. **Add modals to pages** (see `FRONTEND-MODALS-COMPLETE.md`)
2. **Test with UI** instead of API calls
3. **Add notifications** for each step
4. **Test with multiple patients**
5. **Test error scenarios**

---

## 📚 Related Documentation

- `COMPLETE-PHARMACY-LAB-IMPLEMENTATION.md` - Full implementation details
- `FRONTEND-MODALS-COMPLETE.md` - How to add modals to pages
- `QUICK-START-PHARMACY-LAB.md` - Quick start guide
- `TROUBLESHOOT-MEDICAL-RECORD.md` - Debugging guide

---

## ✅ Success Criteria

You've successfully tested everything when:
- ✅ Patient can register and login
- ✅ Doctor can register and login
- ✅ Patient can book appointment
- ✅ Doctor can approve appointment
- ✅ Patient can grant consent
- ✅ Doctor can create medical record
- ✅ Patient can view medical record
- ✅ Doctor can create prescription
- ✅ Pharmacist can dispense prescription
- ✅ Patient can see dispensed status
- ✅ Doctor can order lab test
- ✅ Lab tech can upload results
- ✅ Patient can view lab results
- ✅ Doctor can view lab results

🎉 **Congratulations! Your complete healthcare system is working!**
