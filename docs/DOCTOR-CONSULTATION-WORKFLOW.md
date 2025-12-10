# 🩺 COMPLETE DOCTOR CONSULTATION WORKFLOW

## 🎯 OVERVIEW

This document outlines the complete workflow from when a doctor sees an appointment in their schedule to completing the consultation and all follow-up actions.

---

## 📋 WORKFLOW PHASES

### **PHASE 1: Doctor Reviews Appointment** ✅ (Already Implemented)
- Doctor sees appointment in schedule
- Views patient details
- Checks vital signs from nurse
- Reviews medical history

### **PHASE 2: Call Patient to Room** ⏳ (To Implement)
- Doctor clicks "Start Consultation"
- System updates status to "in_consultation"
- Notifies nurse and patient
- Opens consultation interface

### **PHASE 3: During Consultation** ⏳ (To Implement)
- Doctor takes notes in real-time
- Records examination findings
- Orders tests if needed
- Prescribes immediate treatments

### **PHASE 4: Diagnosis & Treatment Plan** ⏳ (To Implement)
- Doctor selects diagnosis (ICD-10 codes)
- Creates treatment plan
- Decides on admission/discharge
- Requests consultations

### **PHASE 5: Order Tests & Consults** ⏳ (To Implement)
- Order lab tests (ECG, blood work, etc.)
- Request specialist consultations
- Set priority levels
- Add special instructions

### **PHASE 6: Write Prescription** ✅ (Partially Implemented)
- Select medications
- Set dosage and frequency
- Add instructions
- Check drug interactions
- Sign and send to pharmacy

### **PHASE 7: Admission & Referral** ⏳ (To Implement)
- Admit patient to ward/ICU
- Complete admission paperwork
- Notify relevant departments
- Arrange bed assignment

### **PHASE 8: Complete Consultation** ⏳ (To Implement)
- Finalize all documentation
- Sign and lock notes
- Generate summary
- Update appointment status

### **PHASE 9: Follow-up Planning** ⏳ (To Implement)
- Schedule follow-up appointment
- Set reminders
- Create discharge plan
- Patient education materials

### **PHASE 10: Billing & Admin** ⏳ (To Implement)
- Record billing codes
- Submit to insurance
- Complete paperwork
- Archive records

---

## 🛠️ IMPLEMENTATION PLAN

### **PRIORITY 1: Consultation Interface** 🔥

#### **1.1 Create ConsultationInterface Component**
**File:** `elite-tena-frontend/src/pages/doctor/ConsultationInterface.tsx`

**Features:**
- Real-time note taking
- Vital signs display
- Examination checklist
- Test ordering interface
- Prescription creation
- Timer showing consultation duration

**API Endpoints Needed:**
```typescript
// Start consultation
POST /api/appointments/:id/start-consultation
Body: { doctorWalletAddress, startTime }

// Update consultation notes (auto-save)
PUT /api/appointments/:id/consultation-notes
Body: { notes, examFindings, vitalSigns }

// Complete consultation
POST /api/appointments/:id/complete-consultation
Body: { diagnosis, treatmentPlan, prescriptions, tests }
```

#### **1.2 Update Appointment Model**
**File:** `server/src/models/Appointment.js`

**Add Fields:**
```javascript
{
  consultationStartedAt: Date,
  consultationEndedAt: Date,
  consultationNotes: TEXT,
  examFindings: JSON,
  provisionalDiagnosis: STRING,
  finalDiagnosis: STRING,
  treatmentPlan: TEXT,
  consultationDuration: INTEGER // minutes
}
```

---

### **PRIORITY 2: Test Ordering System** 🔥

#### **2.1 Create LabOrder Model**
**File:** `server/src/models/LabOrder.js`

```javascript
{
  id: UUID,
  appointmentId: UUID,
  patientWalletAddress: STRING,
  doctorWalletAddress: STRING,
  testType: ENUM('ECG', 'CBC', 'Troponin', 'X-Ray', 'Echo', 'Other'),
  priority: ENUM('routine', 'urgent', 'stat'),
  status: ENUM('ordered', 'in_progress', 'completed', 'cancelled'),
  specialInstructions: TEXT,
  orderedAt: DATE,
  completedAt: DATE,
  results: JSON
}
```

#### **2.2 Create Test Ordering Interface**
**Component:** `OrderTestsModal.tsx`

**Features:**
- Checkbox list of common tests
- Priority selection (Routine/Urgent/STAT)
- Special instructions field
- Send to lab button

**API Endpoints:**
```typescript
POST /api/lab-orders
Body: {
  appointmentId,
  tests: [
    { testType: 'ECG', priority: 'stat', instructions: '...' },
    { testType: 'Troponin', priority: 'urgent', instructions: '...' }
  ]
}

GET /api/lab-orders/appointment/:appointmentId
// Get all tests for this appointment

PUT /api/lab-orders/:id/status
Body: { status: 'completed', results: {...} }
```

---

### **PRIORITY 3: Prescription System** ✅ (Enhance Existing)

#### **3.1 Enhance IssuePrescriptionModal**
**File:** `elite-tena-frontend/src/components/modals/IssuePrescriptionModal.tsx`

**Add Features:**
- Drug interaction checker
- Dosage calculator
- Medication search/autocomplete
- Common prescriptions templates
- Allergy warnings

#### **3.2 Create Prescription Templates**
**New Component:** `PrescriptionTemplates.tsx`

**Common Templates:**
- Hypertension management
- Diabetes control
- Pain management
- Antibiotic courses
- Post-operative care

---

### **PRIORITY 4: Admission System** 🔥

#### **4.1 Create Admission Model**
**File:** `server/src/models/Admission.js`

```javascript
{
  id: UUID,
  appointmentId: UUID,
  patientWalletAddress: STRING,
  doctorWalletAddress: STRING,
  fromDepartment: STRING,
  toDepartment: STRING, // 'CCU', 'ICU', 'General Ward', etc.
  bedNumber: STRING,
  diagnosis: STRING,
  admissionReason: TEXT,
  expectedLOS: INTEGER, // days
  status: ENUM('pending', 'admitted', 'discharged'),
  admittedAt: DATE,
  dischargedAt: DATE
}
```

#### **4.2 Create Admission Interface**
**Component:** `AdmitPatientModal.tsx`

**Features:**
- Department selection
- Bed assignment
- Admission reason
- Expected length of stay
- Notify relevant departments

**API Endpoints:**
```typescript
POST /api/admissions
Body: {
  appointmentId,
  toDepartment: 'CCU',
  diagnosis: 'Unstable Angina',
  admissionReason: '...',
  expectedLOS: 5
}

GET /api/admissions/patient/:patientWallet
// Get patient's admission history

PUT /api/admissions/:id/discharge
Body: { dischargeDate, dischargeSummary }
```

---

### **PRIORITY 5: Consultation Notes System** 🔥

#### **5.1 Create MedicalRecord Enhancement**
**File:** `server/src/models/MedicalRecord.js`

**Add Consultation-Specific Fields:**
```javascript
{
  consultationType: ENUM('initial', 'follow-up', 'emergency', 'routine'),
  chiefComplaint: TEXT,
  historyOfPresentIllness: TEXT,
  reviewOfSystems: JSON,
  physicalExamination: JSON,
  assessment: TEXT,
  plan: TEXT,
  icd10Codes: ARRAY(STRING),
  cptCodes: ARRAY(STRING)
}
```

#### **5.2 Create SOAP Notes Template**
**Component:** `SOAPNotesEditor.tsx`

**Sections:**
- **S**ubjective: Patient's complaints
- **O**bjective: Examination findings
- **A**ssessment: Diagnosis
- **P**lan: Treatment plan

---

### **PRIORITY 6: Real-Time Notifications** 🔥

#### **6.1 Socket.IO Events**
**File:** `server/src/services/socketService.js`

**Events to Implement:**
```javascript
// Doctor starts consultation
socket.emit('consultation-started', {
  appointmentId,
  patientId,
  doctorId,
  room: 'Room 3'
});

// Urgent test ordered
socket.emit('urgent-lab-order', {
  testType: 'ECG',
  patientId,
  priority: 'stat'
});

// Patient admitted
socket.emit('patient-admitted', {
  patientId,
  department: 'CCU',
  bedNumber: '5'
});

// Consultation completed
socket.emit('consultation-completed', {
  appointmentId,
  duration: 35,
  nextSteps: [...]
});
```

---

## 📊 DATABASE SCHEMA UPDATES

### **New Tables Needed:**

#### **1. lab_orders**
```sql
CREATE TABLE lab_orders (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  patient_wallet VARCHAR(255),
  doctor_wallet VARCHAR(255),
  test_type VARCHAR(100),
  priority VARCHAR(20),
  status VARCHAR(20),
  special_instructions TEXT,
  ordered_at TIMESTAMP,
  completed_at TIMESTAMP,
  results JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### **2. admissions**
```sql
CREATE TABLE admissions (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  patient_wallet VARCHAR(255),
  doctor_wallet VARCHAR(255),
  from_department VARCHAR(100),
  to_department VARCHAR(100),
  bed_number VARCHAR(50),
  diagnosis VARCHAR(255),
  admission_reason TEXT,
  expected_los INTEGER,
  status VARCHAR(20),
  admitted_at TIMESTAMP,
  discharged_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### **3. consultation_notes**
```sql
CREATE TABLE consultation_notes (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  doctor_wallet VARCHAR(255),
  chief_complaint TEXT,
  history_present_illness TEXT,
  review_of_systems JSONB,
  physical_examination JSONB,
  assessment TEXT,
  plan TEXT,
  icd10_codes TEXT[],
  cpt_codes TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  signed_at TIMESTAMP,
  is_locked BOOLEAN DEFAULT FALSE
);
```

---

## 🎯 IMPLEMENTATION ROADMAP

### **Week 1: Core Consultation Interface**
- [ ] Create ConsultationInterface component
- [ ] Add consultation fields to Appointment model
- [ ] Implement start/end consultation endpoints
- [ ] Real-time note auto-save
- [ ] Timer and duration tracking

### **Week 2: Test Ordering System**
- [ ] Create LabOrder model
- [ ] Build OrderTestsModal component
- [ ] Implement lab order endpoints
- [ ] Notification system for lab
- [ ] Test result viewing

### **Week 3: Enhanced Prescriptions**
- [ ] Drug interaction checker
- [ ] Prescription templates
- [ ] Dosage calculator
- [ ] Allergy warnings
- [ ] E-signature for prescriptions

### **Week 4: Admission System**
- [ ] Create Admission model
- [ ] Build AdmitPatientModal
- [ ] Bed management system
- [ ] Department notifications
- [ ] Discharge planning

### **Week 5: Documentation & Billing**
- [ ] SOAP notes template
- [ ] ICD-10 code selector
- [ ] CPT code selector
- [ ] Billing integration
- [ ] Insurance submission

### **Week 6: Follow-up & Continuity**
- [ ] Follow-up scheduling
- [ ] Care plan creation
- [ ] Patient education materials
- [ ] Discharge summaries
- [ ] Referral letters

---

## 🔧 TECHNICAL REQUIREMENTS

### **Frontend Components Needed:**
1. ✅ `DoctorAppointments.tsx` - Schedule view
2. ⏳ `ConsultationInterface.tsx` - Main consultation screen
3. ⏳ `OrderTestsModal.tsx` - Test ordering
4. ⏳ `AdmitPatientModal.tsx` - Patient admission
5. ⏳ `SOAPNotesEditor.tsx` - Clinical notes
6. ⏳ `DiagnosisSelector.tsx` - ICD-10 codes
7. ⏳ `TreatmentPlanBuilder.tsx` - Treatment planning
8. ⏳ `FollowUpScheduler.tsx` - Follow-up appointments

### **Backend Models Needed:**
1. ✅ `Appointment.js` - Enhanced with consultation fields
2. ⏳ `LabOrder.js` - Test orders
3. ⏳ `Admission.js` - Patient admissions
4. ⏳ `ConsultationNote.js` - Clinical documentation
5. ✅ `Prescription.js` - Already exists
6. ✅ `MedicalRecord.js` - Already exists

### **API Endpoints Needed:**
```
Consultation:
POST   /api/appointments/:id/start-consultation
PUT    /api/appointments/:id/consultation-notes
POST   /api/appointments/:id/complete-consultation

Lab Orders:
POST   /api/lab-orders
GET    /api/lab-orders/appointment/:id
PUT    /api/lab-orders/:id/status

Admissions:
POST   /api/admissions
GET    /api/admissions/patient/:wallet
PUT    /api/admissions/:id/discharge

Documentation:
POST   /api/consultation-notes
GET    /api/consultation-notes/appointment/:id
PUT    /api/consultation-notes/:id/sign
```

---

## 📱 USER INTERFACE MOCKUPS

### **Consultation Interface Layout:**
```
┌─────────────────────────────────────────────────────┐
│ 🩺 CONSULTATION - Alemayehu Kebede    [00:15/30:00]│
├─────────────────────────────────────────────────────┤
│ Left Panel (40%)        │ Right Panel (60%)         │
│                         │                           │
│ 📋 Patient Info         │ 📝 Notes (Live Typing)   │
│ • Age: 45, Male         │ [Large text area]        │
│ • Allergies: Penicillin │                           │
│ • Current Meds: None    │                           │
│                         │                           │
│ 🩺 Vital Signs          │ 🔍 Examination           │
│ • BP: 150/95            │ [ ] Heart                │
│ • Pulse: 92             │ [ ] Lungs                │
│ • Temp: 36.8°C          │ [ ] Abdomen              │
│                         │                           │
│ 📋 Quick Actions        │ 🎯 Diagnosis             │
│ [Order Tests]           │ [Select ICD-10]          │
│ [Write Rx]              │                           │
│ [Admit Patient]         │ 💊 Treatment Plan        │
│ [Request Consult]       │ [Add medications]        │
│                         │ [Order tests]            │
├─────────────────────────────────────────────────────┤
│ [Save Draft] [Complete Consultation] [Emergency]    │
└─────────────────────────────────────────────────────┘
```

---

## ✅ CURRENT STATUS

### **Completed:**
- ✅ Doctor appointments page (separate from patient)
- ✅ Appointment listing and filtering
- ✅ Basic prescription system
- ✅ Medical records system
- ✅ Patient queue display

### **In Progress:**
- ⏳ Consultation interface
- ⏳ Test ordering system
- ⏳ Admission workflow

### **Not Started:**
- ❌ SOAP notes template
- ❌ ICD-10 code selector
- ❌ Drug interaction checker
- ❌ Billing integration
- ❌ Discharge planning

---

## 🚀 NEXT IMMEDIATE STEPS

1. **Create ConsultationInterface.tsx**
   - Basic layout with timer
   - Note-taking area
   - Quick action buttons

2. **Add Consultation Fields to Appointment Model**
   - consultationStartedAt
   - consultationNotes
   - examFindings

3. **Implement Start Consultation Endpoint**
   - Update appointment status
   - Record start time
   - Notify relevant parties

4. **Create OrderTestsModal**
   - Common tests checklist
   - Priority selection
   - Send to lab

5. **Build LabOrder Model and Endpoints**
   - Create database table
   - Implement CRUD operations
   - Real-time notifications

---

**STATUS:** Consultation workflow documented ✅  
**NEXT:** Implement consultation interface 🔥  
**PRIORITY:** Start with basic consultation notes and test ordering 🎯
