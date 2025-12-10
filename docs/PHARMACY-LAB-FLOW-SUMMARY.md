# Pharmacy & Medical Lab Flow - Complete Guide

## Current Status

Both Pharmacy and Lab systems are **already implemented** with dashboards and basic functionality. Here's how they work:

---

## 🏥 PHARMACY FLOW

### Overview
Pharmacists can view, manage, and dispense prescriptions created by doctors.

### Complete Flow

#### 1. Doctor Creates Prescription
- Doctor creates prescription during consultation
- Prescription includes: medication, dosage, frequency, duration, refills
- Saved to database with status: `active`

#### 2. Pharmacist Views Prescriptions
- **Dashboard**: `/pharmacy` - Shows stats and recent prescriptions
- **Prescriptions Page**: `/prescriptions` - Full list of all prescriptions
- Can filter by status: `active`, `dispensed`, `expired`

#### 3. Pharmacist Dispenses Medication
- Click "Dispense" button on active prescription
- Updates status to `dispensed`
- Records who dispensed and when

#### 4. Patient Receives Medication
- Patient can view their prescriptions on `/prescriptions`
- See status: active (not yet filled) or dispensed (ready to pick up)

### Current Features
✅ Pharmacy Dashboard with stats
✅ View pending prescriptions
✅ View dispensed prescriptions
✅ Track dispensing history
✅ Quick actions for common tasks

### What's Working
- Pharmacists can see all prescriptions
- Filter by status
- View patient information
- Track daily/total dispensed medications

### What Needs Implementation
- ❌ Dispense button functionality (currently just UI)
- ❌ Inventory management
- ❌ Low stock alerts
- ❌ Medication search
- ❌ Patient medication history

---

## 🧪 MEDICAL LAB FLOW

### Overview
Lab technicians can view test orders, upload results, and manage patient samples.

### Complete Flow

#### 1. Doctor Orders Lab Test
- Doctor orders lab test during consultation
- Test order includes: test name, test type, patient info
- Saved to database with status: `pending`

#### 2. Lab Technician Views Orders
- **Dashboard**: `/lab` - Shows stats and recent tests
- **Lab Results Page**: `/lab-results` - Full list of all test orders
- Can filter by status: `pending`, `completed`

#### 3. Lab Processes Sample
- Lab tech receives patient sample
- Performs test
- Uploads results with files/images

#### 4. Lab Tech Uploads Results
- Click on pending test
- Upload result files (PDF, images)
- Enter test values and notes
- Submit results
- Status changes to `completed`

#### 5. Doctor Reviews Results
- Doctor sees completed lab results
- Can view/download result files
- Uses results for diagnosis and treatment

#### 6. Patient Views Results
- Patient can view their lab results on `/lab-results`
- See test name, date, status
- Download result files

### Current Features
✅ Lab Dashboard with stats
✅ View pending tests
✅ View completed tests
✅ Track daily/total tests
✅ Patient count tracking
✅ Quick actions for common tasks

### What's Working
- Lab techs can see all test orders
- Filter by status
- View patient information
- Track daily/total completed tests

### What Needs Implementation
- ❌ Upload results functionality (currently just UI)
- ❌ File upload for test results
- ❌ Result approval workflow
- ❌ Sample tracking
- ❌ Test result templates

---

## 📊 COMPLETE WORKFLOW DIAGRAM

```
PATIENT → DOCTOR → PHARMACY/LAB → PATIENT
   ↓         ↓           ↓            ↓
 Books    Creates    Dispenses/    Receives
  Appt   Rx/Orders   Processes     Meds/Results
```

### Detailed Steps

1. **Patient Books Appointment**
   - Patient: `/appointments` → Book appointment
   - Status: `pending` → `approved` → `scheduled`

2. **Doctor Consultation**
   - Doctor: `/doctor/consultation` → Conduct consultation
   - Creates medical record
   - Writes prescription (if needed)
   - Orders lab tests (if needed)

3. **Pharmacy Path** (if prescription written)
   - Pharmacist: `/pharmacy` → See new prescription
   - Status: `active`
   - Dispense medication
   - Status: `dispensed`
   - Patient picks up medication

4. **Lab Path** (if test ordered)
   - Lab Tech: `/lab` → See new test order
   - Status: `pending`
   - Process sample
   - Upload results
   - Status: `completed`
   - Doctor reviews results
   - Patient can view results

---

## 🔧 WHAT NEEDS TO BE BUILT

### Priority 1: Dispense Prescription Functionality
**File**: `frontend/src/pages/Prescriptions.tsx`

Add button handler:
```typescript
const handleDispense = async (prescriptionId: string) => {
  await axios.put(`/prescriptions/${prescriptionId}/dispense`, {
    dispensedBy: user?.walletAddress,
    dispensedAt: new Date().toISOString()
  });
  // Refresh list
};
```

### Priority 2: Upload Lab Results Functionality
**File**: `frontend/src/pages/LabResults.tsx`

Add upload modal:
```typescript
const handleUploadResults = async (testId: string, files: File[]) => {
  // Upload files to IPFS
  // Update test status to 'completed'
  // Save result data
};
```

### Priority 3: Prescription Creation by Doctor
**File**: `frontend/src/pages/doctor/ConsultationInterface.tsx`

Add prescription form in consultation interface.

### Priority 4: Lab Test Ordering by Doctor
**File**: `frontend/src/pages/doctor/ConsultationInterface.tsx`

Add lab test order form in consultation interface.

---

## 📁 KEY FILES

### Backend
- `server/src/controllers/prescriptionController.js` - Prescription API
- `server/src/controllers/labResultController.js` - Lab results API
- `server/src/models/Prescription.js` - Prescription model
- `server/src/models/LabResult.js` - Lab result model

### Frontend - Pharmacy
- `frontend/src/pages/pharmacy/PharmacyDashboard.tsx` - Main dashboard
- `frontend/src/pages/Prescriptions.tsx` - Prescription management

### Frontend - Lab
- `frontend/src/pages/lab/LabDashboard.tsx` - Main dashboard
- `frontend/src/pages/LabResults.tsx` - Lab results management

---

## 🎯 NEXT STEPS

To complete the pharmacy and lab flow:

1. **Add Dispense Button Handler** (Pharmacy)
   - Update prescription status
   - Record who dispensed
   - Send notification to patient

2. **Add Upload Results Modal** (Lab)
   - File upload component
   - Result data form
   - IPFS integration
   - Update test status

3. **Add Prescription Creation** (Doctor)
   - Form in consultation interface
   - Medication search/autocomplete
   - Dosage calculator

4. **Add Lab Test Ordering** (Doctor)
   - Test selection dropdown
   - Common test templates
   - Special instructions field

5. **Add Notifications**
   - Notify patient when prescription ready
   - Notify doctor when lab results ready
   - Notify patient when results available

---

## ✅ SUMMARY

**What's Already Working:**
- ✅ Pharmacy dashboard shows prescriptions
- ✅ Lab dashboard shows test orders
- ✅ Stats and metrics tracking
- ✅ Basic UI and navigation
- ✅ Data fetching from API

**What Needs Work:**
- ❌ Dispense prescription functionality
- ❌ Upload lab results functionality
- ❌ Create prescription from doctor side
- ❌ Order lab tests from doctor side
- ❌ Notifications for status changes

The infrastructure is in place - we just need to connect the buttons to actual functionality!
