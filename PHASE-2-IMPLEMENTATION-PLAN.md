# Phase 2: Finding Doctor & Appointment Booking - Implementation Plan

## Current Status
- ✅ Basic appointment booking exists
- ✅ Appointment controller has CRUD operations
- ⚠️ Doctor controller uses mock data
- ⚠️ No department filtering
- ⚠️ No service type selection (Free/Paid)
- ⚠️ No doctor availability checking

## Required Enhancements

### 1. Doctor Model Enhancement
Add fields to Doctor model:
```javascript
- department: STRING (Cardiology, Dermatology, etc.)
- availableServices: JSON {
    inPerson: { available: true, fee: 0 },
    videoCall: { available: true, fee: 500 },
    chat: { available: true, fee: 200 }
  }
- isAvailable: BOOLEAN
- isAcceptingPatients: BOOLEAN
- consultationFee: INTEGER
- rating: FLOAT
- reviewCount: INTEGER
- bio: TEXT
- education: JSON
- languages: ARRAY
```

### 2. Doctor Controller Enhancement
Replace mock data with real database queries:
```javascript
- GET /api/doctors - List all doctors with filtering
- GET /api/doctors/:walletAddress - Get doctor details
- GET /api/doctors/department/:dept - Filter by department
- GET /api/doctors/available - Get available doctors
```

### 3. Appointment Enhancement
Add service type and payment flow:
```javascript
- serviceType: ENUM ('free-inperson', 'paid-video', 'paid-chat')
- requiresApproval: BOOLEAN
- approvalStatus: ENUM ('pending', 'approved', 'rejected')
- paymentRequired: BOOLEAN
- paymentAmount: INTEGER
```

### 4. Frontend Enhancements

#### BookAppointmentModal
- Step 1: Select Department
- Step 2: Select Doctor (filtered by department)
- Step 3: Select Service Type (Free/Paid)
- Step 4: Select Date/Time
- Step 5: Enter Reason
- Step 6: Confirm Booking

#### Doctor Selection Page
- Department filter
- Search by name
- Filter by availability
- Show doctor ratings
- Show service types and fees

## Implementation Steps

### Step 1: Update Doctor Model ✅
Add new fields to support departments and services

### Step 2: Update Doctor Controller ✅
Replace mock data with real database queries

### Step 3: Create Department Constants ✅
Define standard departments for the system

### Step 4: Enhance BookAppointmentModal ✅
Add multi-step wizard for booking

### Step 5: Create Doctor Selection Component ✅
Dedicated page for browsing and selecting doctors

### Step 6: Update Appointment Flow ✅
Handle free vs paid appointments differently

### Step 7: Add Doctor Approval Workflow ✅
For paid services, doctor must approve

### Step 8: Testing ✅
Test complete flow from department selection to booking

## Service Types

### Free In-Person Consultation
- No payment required
- Immediate confirmation
- Healthcare provider covers cost
- Patient only pays for medications

### Paid Video Call
- Requires doctor approval
- Payment before consultation
- Doctor sets fee
- Online payment via Telebirr/CBE

### Paid Chat Consultation
- Requires doctor approval
- Lower fee than video
- Text-based consultation
- Quick questions

## Workflow Diagrams

### Free Service Flow
```
Patient → Select Department → Choose Doctor → 
Select "Free In-Person" → Choose Date/Time → 
Enter Reason → Submit → ✅ Confirmed Immediately
```

### Paid Service Flow
```
Patient → Select Department → Choose Doctor → 
Select "Paid Video/Chat" → Choose Date/Time → 
Enter Reason → Submit → ⏳ Pending Doctor Approval →
Doctor Reviews → Doctor Approves → 💰 Payment Required →
Patient Pays → Upload Receipt → Doctor Confirms Payment →
✅ Appointment Confirmed
```

## Database Changes Needed

### Doctors Table
```sql
ALTER TABLE doctors ADD COLUMN department VARCHAR(100);
ALTER TABLE doctors ADD COLUMN available_services JSONB;
ALTER TABLE doctors ADD COLUMN is_available BOOLEAN DEFAULT true;
ALTER TABLE doctors ADD COLUMN is_accepting_patients BOOLEAN DEFAULT true;
ALTER TABLE doctors ADD COLUMN consultation_fee INTEGER DEFAULT 0;
ALTER TABLE doctors ADD COLUMN rating FLOAT DEFAULT 0;
ALTER TABLE doctors ADD COLUMN review_count INTEGER DEFAULT 0;
ALTER TABLE doctors ADD COLUMN bio TEXT;
ALTER TABLE doctors ADD COLUMN education JSONB;
ALTER TABLE doctors ADD COLUMN languages TEXT[];
```

### Appointments Table
```sql
ALTER TABLE appointments ADD COLUMN service_type VARCHAR(50);
ALTER TABLE appointments ADD COLUMN requires_approval BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN payment_required BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN payment_amount INTEGER DEFAULT 0;
```

## Testing Checklist

- [ ] Create test doctors with different departments
- [ ] Test department filtering
- [ ] Test doctor search
- [ ] Test free appointment booking
- [ ] Test paid appointment booking
- [ ] Test doctor approval workflow
- [ ] Test payment flow
- [ ] Test appointment confirmation
- [ ] Test notifications

## Files to Modify

### Backend
1. `server/src/models/Doctor.js` - Add new fields
2. `server/src/controllers/doctorController.js` - Real queries
3. `server/src/models/Appointment.js` - Add service type fields
4. `server/src/controllers/appointmentController.js` - Handle approval flow

### Frontend
1. `elite-tena-frontend/src/components/modals/BookAppointmentModal.tsx` - Multi-step wizard
2. `elite-tena-frontend/src/pages/Appointments.tsx` - Enhanced UI
3. Create: `elite-tena-frontend/src/pages/FindDoctor.tsx` - Doctor selection page
4. Create: `elite-tena-frontend/src/components/DoctorCard.tsx` - Doctor display component

## Priority Order

1. **HIGH**: Update Doctor model and controller (real data)
2. **HIGH**: Add department filtering
3. **HIGH**: Implement service type selection
4. **MEDIUM**: Add doctor approval workflow
5. **MEDIUM**: Enhance booking modal with steps
6. **LOW**: Add doctor ratings and reviews
7. **LOW**: Add advanced search filters

---

**Next Action**: Start with updating the Doctor model and controller to use real database data with department support.
