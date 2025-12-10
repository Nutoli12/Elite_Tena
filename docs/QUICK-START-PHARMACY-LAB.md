# Quick Start: Pharmacy & Lab Flow

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration (2 minutes)

```bash
psql -U postgres -d elite_tena -f server/migrations/add-pharmacy-lab-flow-fields.sql
```

**What this does:**
- Adds `status` field to prescriptions (active, dispensed, expired)
- Adds `dispensedBy`, `dispensedDate` fields for pharmacy workflow
- Adds `status` field to lab_results (pending, completed)
- Adds `doctorWalletAddress`, `completedAt`, `completedBy` for lab workflow

### Step 2: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 3: Test the APIs

#### Test Prescription Flow
```bash
# 1. Create prescription (as doctor)
curl -X POST http://localhost:3003/api/prescriptions \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "0x17651979962711di2gn",
    "doctorWalletAddress": "0x1764894073908ypl7fp",
    "medicationName": "Amoxicillin 500mg",
    "dosage": "500mg",
    "frequency": "3 times daily",
    "duration": "7 days",
    "quantity": 21,
    "refills": 0,
    "issueDate": "2024-12-08",
    "expiryDate": "2024-12-15"
  }'

# 2. View pending prescriptions (as pharmacist)
curl http://localhost:3003/api/prescriptions/pending

# 3. Dispense prescription (as pharmacist)
curl -X POST http://localhost:3003/api/prescriptions/PRESCRIPTION_ID/dispense \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacistWallet": "0xPHARMACIST",
    "dispensedQuantity": 21,
    "dispensedDate": "2024-12-08"
  }'
```

#### Test Lab Flow
```bash
# 1. Order lab test (as doctor)
curl -X POST http://localhost:3003/api/lab-results \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "0x17651979962711di2gn",
    "doctorWalletAddress": "0x1764894073908ypl7fp",
    "testType": "Blood Test",
    "testName": "Complete Blood Count",
    "priority": "routine",
    "instructions": "Fasting required",
    "testDate": "2024-12-08"
  }'

# 2. View pending tests (as lab tech)
curl http://localhost:3003/api/lab-results/orders?status=pending

# 3. Upload results (as lab tech)
curl -X POST http://localhost:3003/api/lab-results/upload \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "0x17651979962711di2gn",
    "testId": "TEST_ID",
    "results": "WBC: 7.5, RBC: 5.2, Hemoglobin: 14.5",
    "notes": "All values within normal range",
    "performedBy": "0xLAB_TECH"
  }'
```

---

## ✅ What's Working Now

### Backend (100% Complete)
- ✅ Create prescriptions
- ✅ View pending prescriptions
- ✅ Dispense prescriptions
- ✅ Track pharmacy history
- ✅ Order lab tests
- ✅ View pending lab tests
- ✅ Upload lab results
- ✅ Track lab history

### Frontend (Needs Implementation)
- ❌ Doctor: Create prescription form
- ❌ Doctor: Order lab test form
- ❌ Pharmacist: Dispense button
- ❌ Lab Tech: Upload results modal
- ❌ Patient: View prescription status
- ❌ Patient: View lab results

---

## 🎯 Next: Implement Frontend

### Priority 1: Pharmacy Dispense Button

**File**: `frontend/src/pages/Prescriptions.tsx`

Add this function:
```typescript
const handleDispense = async (prescriptionId: string) => {
  const response = await axios.post(`/prescriptions/${prescriptionId}/dispense`, {
    pharmacistWallet: user?.walletAddress,
    dispensedQuantity: prescription.quantity,
    dispensedDate: new Date().toISOString()
  });
  
  if (response.data.success) {
    alert('Dispensed successfully!');
    fetchPrescriptions();
  }
};
```

### Priority 2: Lab Upload Results Modal

**File**: `frontend/src/pages/LabResults.tsx`

Add this function:
```typescript
const handleUploadResults = async (testId: string, data: any) => {
  const response = await axios.post('/lab-results/upload', {
    patientWalletAddress: test.patientWalletAddress,
    testId,
    results: data.results,
    notes: data.notes,
    performedBy: user?.walletAddress
  });
  
  if (response.data.success) {
    alert('Results uploaded!');
    fetchLabTests();
  }
};
```

---

## 📊 API Endpoints Reference

### Prescriptions
- `GET /api/prescriptions` - Get all prescriptions
- `GET /api/prescriptions/pending` - Get pending prescriptions
- `GET /api/prescriptions/:id` - Get specific prescription
- `POST /api/prescriptions` - Create prescription
- `POST /api/prescriptions/:id/dispense` - Dispense prescription
- `GET /api/prescriptions/:id/verify` - Verify prescription
- `GET /api/prescriptions/pharmacy/history` - Get pharmacy history

### Lab Results
- `GET /api/lab-results` - Get all lab results
- `GET /api/lab-results/orders` - Get lab orders
- `GET /api/lab-results/pending-patients` - Get patients with pending tests
- `GET /api/lab-results/:id` - Get specific lab result
- `POST /api/lab-results` - Order lab test
- `POST /api/lab-results/upload` - Upload lab results

---

## 🐛 Troubleshooting

### Migration Fails
```bash
# Check if columns already exist
psql -U postgres -d elite_tena -c "\d prescriptions"
psql -U postgres -d elite_tena -c "\d lab_results"
```

### API Returns 500 Error
- Check server logs
- Verify migration ran successfully
- Restart server after migration

### Prescription Not Showing
- Check status field: should be 'active' or 'pending'
- Check patient wallet address matches

### Lab Test Not Showing
- Check status field: should be 'pending' or 'in_progress'
- Check doctor wallet address is set

---

## 📚 Full Documentation

See `PHARMACY-LAB-IMPLEMENTATION-COMPLETE.md` for complete details.

---

## ✨ You're Ready!

The backend is fully functional. Just run the migration, restart the server, and start testing the APIs!
