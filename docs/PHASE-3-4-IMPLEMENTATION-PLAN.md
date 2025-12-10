# Phase 3 & 4: Payment Process + Hospital Check-in - Implementation Plan

## Phase 3: Payment Process

### Current Status
- ✅ Payment controller exists
- ✅ Payment model in database
- ❌ No Telebirr/CBE Birr integration
- ❌ No receipt upload
- ❌ No doctor approval workflow

### Required Implementation

#### 1. Appointment Model Enhancement
```javascript
// Add to Appointment model
- approvalStatus: ENUM ('pending', 'approved', 'rejected')
- approvedAt: DATE
- approvedBy: STRING
- paymentStatus: ENUM ('pending', 'paid', 'confirmed', 'refunded')
- paymentMethod: ENUM ('telebirr', 'cbe_birr', 'cash', 'free')
- paymentReceiptUrl: STRING
- paymentConfirmedAt: DATE
- paymentConfirmedBy: STRING
```

#### 2. Doctor Approval Workflow
```
Patient books paid appointment
  ↓
Status: 'pending_approval'
  ↓
Doctor receives notification
  ↓
Doctor reviews appointment
  ↓
Doctor approves/rejects
  ↓
If approved: Status → 'approved', send payment details
If rejected: Status → 'rejected', notify patient
```

#### 3. Payment Workflow
```
Appointment approved
  ↓
Patient receives payment details
  ↓
Patient pays via Telebirr/CBE Birr
  ↓
Patient uploads receipt to IPFS
  ↓
Receipt URL saved to appointment
  ↓
Doctor receives notification
  ↓
Doctor verifies receipt
  ↓
Doctor confirms payment
  ↓
Status → 'confirmed'
  ↓
Appointment ready!
```

#### 4. Payment Integration Options

**Option A: Manual Payment (Phase 3.1)**
- Doctor provides bank account/phone number
- Patient pays manually
- Patient uploads receipt screenshot
- Doctor confirms payment manually
- ✅ Simple, no API integration needed
- ✅ Works immediately

**Option B: API Integration (Phase 3.2 - Future)**
- Integrate Telebirr API
- Integrate CBE Birr API
- Automated payment processing
- Automated confirmation
- ⏳ Requires API credentials
- ⏳ More complex

### Phase 3 Implementation Steps

1. **Update Appointment Model** ✅
2. **Add Approval Endpoints** ✅
3. **Add Payment Endpoints** ✅
4. **Create Doctor Approval UI** ✅
5. **Create Payment Upload UI** ✅
6. **Add Notifications** ✅

---

## Phase 4: Hospital Check-in

### Current Status
- ❌ No QR code generation
- ❌ No check-in interface
- ❌ No waiting room status
- ❌ No patient queue

### Required Implementation

#### 1. QR Code System
```javascript
// Generate QR code for appointment
- Contains: appointmentId, patientWallet, doctorWallet, date, time
- Displayed on patient's appointment details
- Scannable at reception
```

#### 2. Check-in Status Flow
```
Appointment created → Status: 'scheduled'
  ↓
Patient arrives → Scans QR / Shows ID
  ↓
Reception checks in → Status: 'checked_in'
  ↓
Patient waits → Status: 'waiting'
  ↓
Doctor calls patient → Status: 'in_progress'
  ↓
Consultation complete → Status: 'completed'
```

#### 3. Reception Interface
```
- Scan QR code
- Manual patient search
- Check-in button
- View waiting patients
- Patient queue management
```

#### 4. Waiting Room Display
```
- Show checked-in patients
- Estimated wait time
- Current patient with doctor
- Queue position
```

### Phase 4 Implementation Steps

1. **Add Check-in Status to Appointment** ✅
2. **Generate QR Codes** ✅
3. **Create Reception Interface** ✅
4. **Create Waiting Room Display** ✅
5. **Add Queue Management** ✅

---

## Database Changes

### Appointments Table
```sql
-- Phase 3: Payment
ALTER TABLE appointments ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN approved_by VARCHAR(255);
ALTER TABLE appointments ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE appointments ADD COLUMN payment_receipt_url TEXT;
ALTER TABLE appointments ADD COLUMN payment_confirmed_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN payment_confirmed_by VARCHAR(255);

-- Phase 4: Check-in
ALTER TABLE appointments ADD COLUMN check_in_status VARCHAR(20) DEFAULT 'not_checked_in';
ALTER TABLE appointments ADD COLUMN checked_in_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN checked_in_by VARCHAR(255);
ALTER TABLE appointments ADD COLUMN queue_number INTEGER;
ALTER TABLE appointments ADD COLUMN qr_code_data TEXT;
```

---

## API Endpoints

### Phase 3: Payment

```javascript
// Doctor Approval
POST /api/appointments/:id/approve
POST /api/appointments/:id/reject
GET /api/appointments/pending-approval

// Payment
POST /api/appointments/:id/upload-receipt
POST /api/appointments/:id/confirm-payment
GET /api/appointments/:id/payment-details
```

### Phase 4: Check-in

```javascript
// Check-in
POST /api/appointments/:id/check-in
POST /api/appointments/:id/scan-qr
GET /api/appointments/checked-in
GET /api/appointments/waiting-room

// Queue
GET /api/appointments/queue
POST /api/appointments/:id/call-patient
POST /api/appointments/:id/complete
```

---

## Frontend Components

### Phase 3

1. **DoctorApprovalModal** - Doctor approves/rejects appointments
2. **PaymentDetailsModal** - Shows payment instructions
3. **UploadReceiptModal** - Patient uploads payment receipt
4. **PaymentConfirmationModal** - Doctor confirms payment

### Phase 4

1. **QRCodeDisplay** - Shows appointment QR code
2. **ReceptionCheckIn** - Reception interface for check-in
3. **WaitingRoomDisplay** - Public waiting room screen
4. **PatientQueue** - Doctor's patient queue

---

## Implementation Priority

### High Priority (Do First)
1. ✅ Appointment approval workflow
2. ✅ Manual payment with receipt upload
3. ✅ QR code generation
4. ✅ Basic check-in system

### Medium Priority (Do Next)
1. ⏳ Waiting room display
2. ⏳ Queue management
3. ⏳ Estimated wait times
4. ⏳ SMS notifications

### Low Priority (Future)
1. ⏳ Telebirr API integration
2. ⏳ CBE Birr API integration
3. ⏳ Automated payment verification
4. ⏳ Advanced queue analytics

---

## Testing Scenarios

### Phase 3: Payment Flow

**Scenario 1: Free Appointment**
```
1. Patient books free in-person
2. Status: 'scheduled' (no approval needed)
3. Patient arrives on day
4. Check-in and consultation
```

**Scenario 2: Paid Appointment - Approved**
```
1. Patient books paid video call
2. Status: 'pending_approval'
3. Doctor approves
4. Status: 'approved'
5. Patient receives payment details
6. Patient pays and uploads receipt
7. Doctor confirms payment
8. Status: 'confirmed'
9. Appointment ready
```

**Scenario 3: Paid Appointment - Rejected**
```
1. Patient books paid appointment
2. Status: 'pending_approval'
3. Doctor rejects (not available)
4. Status: 'rejected'
5. Patient notified
6. Patient can book different time
```

### Phase 4: Check-in Flow

**Scenario 1: QR Code Check-in**
```
1. Patient arrives at hospital
2. Shows QR code at reception
3. Reception scans QR code
4. System checks in patient
5. Status: 'checked_in'
6. Patient added to queue
7. Patient waits
8. Doctor calls patient
9. Status: 'in_progress'
10. Consultation happens
11. Status: 'completed'
```

**Scenario 2: Manual Check-in**
```
1. Patient arrives without QR
2. Reception searches by name/phone
3. Finds appointment
4. Manually checks in
5. Rest of flow same as above
```

---

## Files to Create/Modify

### Backend
1. `server/src/models/Appointment.js` - Add new fields
2. `server/src/controllers/appointmentController.js` - Add approval/payment/checkin methods
3. `server/src/routes/appointment.js` - Add new routes
4. Create: `server/src/utils/qrcode.js` - QR code generation

### Frontend
1. `elite-tena-frontend/src/components/modals/DoctorApprovalModal.tsx` - NEW
2. `elite-tena-frontend/src/components/modals/PaymentDetailsModal.tsx` - NEW
3. `elite-tena-frontend/src/components/modals/UploadReceiptModal.tsx` - NEW
4. `elite-tena-frontend/src/components/QRCodeDisplay.tsx` - NEW
5. `elite-tena-frontend/src/pages/ReceptionCheckIn.tsx` - NEW
6. `elite-tena-frontend/src/pages/WaitingRoom.tsx` - NEW
7. Update: `elite-tena-frontend/src/pages/doctor/DoctorDashboard.tsx` - Add approval section
8. Update: `elite-tena-frontend/src/pages/Appointments.tsx` - Add QR code display

---

## Success Criteria

### Phase 3
- ✅ Doctor can approve/reject paid appointments
- ✅ Patient receives payment details after approval
- ✅ Patient can upload payment receipt
- ✅ Doctor can confirm payment
- ✅ Appointment status updates correctly
- ✅ Notifications sent at each step

### Phase 4
- ✅ QR code generated for each appointment
- ✅ Reception can check in patients
- ✅ Patients appear in waiting queue
- ✅ Doctor can see patient queue
- ✅ Status updates through workflow
- ✅ Completed appointments marked

---

**Next Action:** Start implementing Phase 3 - Appointment approval workflow and payment system
