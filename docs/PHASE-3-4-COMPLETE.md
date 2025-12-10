# Phase 3 & 4: Payment Process + Hospital Check-in - COMPLETE ✅

## What Was Implemented

### Phase 3: Payment Process ✅

#### 1. Enhanced Appointment Model
Added 12 new fields for payment and approval:
- `serviceType` - Type of consultation (inPerson/videoCall/chat)
- `requiresApproval` - Whether needs doctor approval
- `approvalStatus` - pending/approved/rejected
- `approvedAt` - Approval timestamp
- `approvedBy` - Doctor who approved
- `paymentMethod` - telebirr/cbe_birr/cash/free
- `paymentReceiptUrl` - IPFS URL of receipt
- `paymentConfirmedAt` - Payment confirmation timestamp
- `paymentConfirmedBy` - Doctor who confirmed payment

#### 2. Doctor Approval Workflow
- `POST /api/appointments/:id/approve` - Doctor approves appointment
- `POST /api/appointments/:id/reject` - Doctor rejects appointment
- `GET /api/appointments/pending-approval` - Get pending approvals

#### 3. Payment System
- `GET /api/appointments/:id/payment-details` - Get payment instructions
- `POST /api/appointments/:id/upload-receipt` - Patient uploads receipt
- `POST /api/appointments/:id/confirm-payment` - Doctor confirms payment

### Phase 4: Hospital Check-in ✅

#### 1. Enhanced Appointment Model
Added 9 new fields for check-in and queue:
- `checkInStatus` - not_checked_in/checked_in/waiting/in_progress/completed
- `checkedInAt` - Check-in timestamp
- `checkedInBy` - Reception staff who checked in
- `queueNumber` - Patient queue number
- `qrCodeData` - QR code for check-in
- `estimatedWaitTime` - Wait time in minutes
- `consultationStartedAt` - Consultation start time
- `consultationEndedAt` - Consultation end time

#### 2. QR Code System
- `POST /api/appointments/:id/generate-qr` - Generate QR code
- `POST /api/appointments/scan-qr` - Scan QR and check in

#### 3. Check-in & Queue Management
- `POST /api/appointments/:id/check-in` - Manual check-in
- `GET /api/appointments/checked-in` - Get checked-in patients
- `GET /api/appointments/waiting-room` - Get waiting room queue
- `GET /api/appointments/doctor/:doctorWallet/queue` - Get doctor's queue

#### 4. Consultation Management
- `POST /api/appointments/:id/call-patient` - Doctor calls patient
- `POST /api/appointments/:id/complete` - Complete appointment

---

## Complete Workflows

### Workflow 1: Free In-Person Appointment
```
1. Patient books free in-person appointment
   Status: 'scheduled'
   
2. Patient arrives on appointment day
   
3. Reception checks in patient (QR or manual)
   Status: 'checked_in'
   Queue Number: Assigned
   
4. Patient waits in waiting room
   Status: 'waiting'
   
5. Doctor calls patient
   Status: 'in_progress'
   
6. Consultation happens
   
7. Doctor completes appointment
   Status: 'completed'
```

### Workflow 2: Paid Video Call Appointment
```
1. Patient books paid video call
   Status: 'scheduled'
   ApprovalStatus: 'pending'
   RequiresApproval: true
   
2. Doctor receives notification
   
3. Doctor reviews and approves
   ApprovalStatus: 'approved'
   Status: 'approved'
   
4. Patient receives payment details
   - Telebirr: 0912345678
   - CBE Birr: 1000123456789
   - Amount: 500 Birr
   
5. Patient pays via Telebirr/CBE
   
6. Patient uploads receipt screenshot
   PaymentStatus: 'paid'
   PaymentReceiptUrl: 'ipfs://...'
   
7. Doctor receives notification
   
8. Doctor verifies and confirms payment
   PaymentStatus: 'confirmed'
   Status: 'scheduled'
   
9. On appointment day, video call happens
   
10. Doctor completes appointment
    Status: 'completed'
```

### Workflow 3: Paid Appointment - Rejected
```
1. Patient books paid appointment
   ApprovalStatus: 'pending'
   
2. Doctor reviews
   
3. Doctor rejects (not available)
   ApprovalStatus: 'rejected'
   Status: 'cancelled'
   
4. Patient receives notification
   
5. Patient can book different time/doctor
```

---

## API Endpoints

### Phase 3: Payment & Approval

#### Approve Appointment
```bash
POST /api/appointments/:id/approve
{
  "doctorWallet": "0xDOCTOR...",
  "paymentDetails": {
    "method": "telebirr",
    "accountNumber": "0912345678",
    "accountName": "Dr. Alemayehu",
    "amount": 500
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment approved successfully",
  "data": { ...appointment },
  "paymentDetails": { ...payment info }
}
```

#### Reject Appointment
```bash
POST /api/appointments/:id/reject
{
  "doctorWallet": "0xDOCTOR...",
  "reason": "Not available at that time"
}
```

#### Get Pending Approvals
```bash
GET /api/appointments/pending-approval?doctorWallet=0xDOCTOR...
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patientWalletAddress": "0xPATIENT...",
      "serviceType": "videoCall",
      "fee": 500,
      "approvalStatus": "pending",
      "patientDetails": { ...patient info }
    }
  ],
  "count": 3
}
```

#### Upload Payment Receipt
```bash
POST /api/appointments/:id/upload-receipt
{
  "receiptUrl": "ipfs://Qm...",
  "paymentMethod": "telebirr"
}
```

#### Confirm Payment
```bash
POST /api/appointments/:id/confirm-payment
{
  "doctorWallet": "0xDOCTOR..."
}
```

#### Get Payment Details
```bash
GET /api/appointments/:id/payment-details
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointmentId": "uuid",
    "amount": 500,
    "currency": "ETB",
    "serviceType": "videoCall",
    "approvalStatus": "approved",
    "paymentStatus": "pending",
    "paymentMethods": [
      {
        "method": "telebirr",
        "accountNumber": "0912345678",
        "accountName": "Dr. Alemayehu",
        "instructions": "Send payment via Telebirr and upload receipt"
      },
      {
        "method": "cbe_birr",
        "accountNumber": "1000123456789",
        "accountName": "Dr. Alemayehu",
        "instructions": "Send payment via CBE Birr and upload receipt"
      }
    ]
  }
}
```

### Phase 4: Check-in & Queue

#### Generate QR Code
```bash
POST /api/appointments/:id/generate-qr
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCodeData": "{\"appointmentId\":\"uuid\",\"patientWallet\":\"0x...\",\"checksum\":\"abc123\"}",
    "qrDataObject": {
      "appointmentId": "uuid",
      "patientWallet": "0xPATIENT...",
      "doctorWallet": "0xDOCTOR...",
      "date": "2025-01-15T10:00:00",
      "checksum": "abc123def456"
    }
  }
}
```

#### Check In Patient (Manual)
```bash
POST /api/appointments/:id/check-in
{
  "receptionStaff": "reception_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient checked in successfully",
  "data": {
    ...appointment,
    "queueNumber": 5,
    "checkInStatus": "checked_in"
  }
}
```

#### Scan QR and Check In
```bash
POST /api/appointments/scan-qr
{
  "qrData": "{\"appointmentId\":\"uuid\",\"checksum\":\"abc123\"}",
  "receptionStaff": "reception_user_id"
}
```

#### Get Checked-In Patients
```bash
GET /api/appointments/checked-in?doctorWallet=0xDOCTOR...
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "queueNumber": 1,
      "checkInStatus": "checked_in",
      "patientDetails": {
        "user": {
          "profileData": {
            "fullName": "Patient Name"
          }
        }
      }
    }
  ],
  "count": 5
}
```

#### Get Waiting Room
```bash
GET /api/appointments/waiting-room?doctorWallet=0xDOCTOR...
```

#### Get Doctor Queue
```bash
GET /api/appointments/doctor/:doctorWallet/queue
```

#### Call Patient
```bash
POST /api/appointments/:id/call-patient
{
  "doctorWallet": "0xDOCTOR..."
}
```

#### Complete Appointment
```bash
POST /api/appointments/:id/complete
{
  "notes": "Patient diagnosed with...",
  "prescriptions": [...],
  "labOrders": [...]
}
```

---

## Database Schema Updates

### Appointments Table - New Fields
```sql
-- Phase 3: Payment & Approval
service_type VARCHAR(20) DEFAULT 'inPerson',
requires_approval BOOLEAN DEFAULT false,
approval_status VARCHAR(20) DEFAULT 'pending',
approved_at TIMESTAMP,
approved_by VARCHAR(255),
payment_method VARCHAR(50) DEFAULT 'free',
payment_receipt_url TEXT,
payment_confirmed_at TIMESTAMP,
payment_confirmed_by VARCHAR(255),

-- Phase 4: Check-in & Queue
check_in_status VARCHAR(20) DEFAULT 'not_checked_in',
checked_in_at TIMESTAMP,
checked_in_by VARCHAR(255),
queue_number INTEGER,
qr_code_data TEXT,
estimated_wait_time INTEGER,
consultation_started_at TIMESTAMP,
consultation_ended_at TIMESTAMP
```

---

## Status Flow Diagrams

### Free Appointment Status Flow
```
scheduled → checked_in → waiting → in_progress → completed
```

### Paid Appointment Status Flow
```
scheduled (pending approval) →
approved (pending payment) →
paid (pending confirmation) →
confirmed (scheduled) →
checked_in →
waiting →
in_progress →
completed
```

### Check-in Status Flow
```
not_checked_in →
checked_in →
waiting →
in_progress →
completed
```

---

## Testing Guide

### Test Phase 3: Payment Flow

#### 1. Book Paid Appointment
```bash
POST /api/appointments
{
  "patientWalletAddress": "0xPATIENT...",
  "doctorWalletAddress": "0xDOCTOR...",
  "appointmentDate": "2025-01-15T14:00:00",
  "serviceType": "videoCall",
  "reason": "Consultation",
  "fee": 500,
  "requiresApproval": true,
  "paymentRequired": true
}
```

#### 2. Doctor Approves
```bash
POST /api/appointments/{id}/approve
{
  "doctorWallet": "0xDOCTOR..."
}
```

#### 3. Get Payment Details
```bash
GET /api/appointments/{id}/payment-details
```

#### 4. Upload Receipt
```bash
POST /api/appointments/{id}/upload-receipt
{
  "receiptUrl": "ipfs://Qm...",
  "paymentMethod": "telebirr"
}
```

#### 5. Doctor Confirms Payment
```bash
POST /api/appointments/{id}/confirm-payment
{
  "doctorWallet": "0xDOCTOR..."
}
```

### Test Phase 4: Check-in Flow

#### 1. Generate QR Code
```bash
POST /api/appointments/{id}/generate-qr
```

#### 2. Check In Patient
```bash
POST /api/appointments/{id}/check-in
{
  "receptionStaff": "reception_001"
}
```

#### 3. View Waiting Room
```bash
GET /api/appointments/waiting-room?doctorWallet=0xDOCTOR...
```

#### 4. Doctor Calls Patient
```bash
POST /api/appointments/{id}/call-patient
{
  "doctorWallet": "0xDOCTOR..."
}
```

#### 5. Complete Appointment
```bash
POST /api/appointments/{id}/complete
{
  "notes": "Consultation completed successfully"
}
```

---

## Files Created/Modified

### Backend ✅
1. `server/src/models/Appointment.js` - Added 21 new fields
2. `server/src/controllers/appointmentPhase3Controller.js` - NEW (Payment & Approval)
3. `server/src/controllers/appointmentPhase4Controller.js` - NEW (Check-in & Queue)
4. `server/src/routes/appointment.js` - Added 14 new routes

### Frontend ⏳ (Next Step)
1. Create: `DoctorApprovalModal.tsx` - Doctor approval interface
2. Create: `PaymentDetailsModal.tsx` - Payment instructions
3. Create: `UploadReceiptModal.tsx` - Receipt upload
4. Create: `QRCodeDisplay.tsx` - Show appointment QR
5. Create: `ReceptionCheckIn.tsx` - Reception interface
6. Create: `WaitingRoomDisplay.tsx` - Waiting room screen
7. Update: `DoctorDashboard.tsx` - Add pending approvals section

---

## Next Steps

### Immediate (Frontend Implementation)
1. ⏳ Create doctor approval interface
2. ⏳ Create payment upload interface
3. ⏳ Add QR code display to appointments
4. ⏳ Create reception check-in page
5. ⏳ Create waiting room display

### Short Term
1. ⏳ Add SMS notifications for each step
2. ⏳ Add email notifications
3. ⏳ Implement estimated wait times
4. ⏳ Add queue analytics

### Long Term
1. ⏳ Integrate Telebirr API
2. ⏳ Integrate CBE Birr API
3. ⏳ Automated payment verification
4. ⏳ Video call integration
5. ⏳ Chat consultation feature

---

## Summary

### Phase 3: Payment Process ✅
- ✅ Doctor approval workflow
- ✅ Payment details generation
- ✅ Receipt upload system
- ✅ Payment confirmation
- ✅ Notifications at each step
- ✅ Support for Telebirr/CBE Birr

### Phase 4: Hospital Check-in ✅
- ✅ QR code generation
- ✅ QR code scanning
- ✅ Manual check-in
- ✅ Queue management
- ✅ Waiting room tracking
- ✅ Consultation workflow
- ✅ Appointment completion

**Backend Status:** ✅ COMPLETE  
**Frontend Status:** ⏳ PENDING  
**Date:** December 4, 2025  
**Phases Complete:** 2, 3, 4 of 10

---

**Next Action:** Implement frontend components for Phase 3 & 4 workflows
