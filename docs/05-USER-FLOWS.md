# Elite-Tena Healthcare Management System
## Part 5: User Flows & Workflows

---

## 5.1 PATIENT FLOWS

### Registration Flow
```
1. Visit Landing Page → Click "Register"
2. Choose: Email/Password OR MetaMask Wallet
3. Fill profile: Name, Phone, Date of Birth
4. Submit → Auto-login → Dashboard
```

### Appointment Booking Flow
```
┌─────────────────────────────────────────────────────────────┐
│                  PATIENT APPOINTMENT FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. SELECT DOCTOR                                            │
│     └─> Browse by specialty/department                       │
│     └─> View doctor profile, fees, availability              │
│                                                              │
│  2. CHOOSE SERVICE TYPE                                      │
│     ├─> In-Person (Free or Paid)                            │
│     ├─> Video Call (Paid)                                   │
│     └─> Chat Consultation (Paid)                            │
│                                                              │
│  3. SELECT DATE & TIME                                       │
│     └─> View available slots                                 │
│     └─> Pick preferred time                                  │
│                                                              │
│  4. SUBMIT BOOKING                                           │
│     └─> If FREE: Appointment confirmed immediately           │
│     └─> If PAID: Wait for doctor approval                    │
│                                                              │
│  5. PAYMENT (if required)                                    │
│     └─> View doctor's payment details (Telebirr/CBE)        │
│     └─> Make peer-to-peer payment                           │
│     └─> Upload payment receipt                               │
│     └─> Wait for doctor confirmation                         │
│                                                              │
│  6. APPOINTMENT DAY                                          │
│     └─> Show QR code at reception                           │
│     └─> Check-in → Wait in queue                            │
│     └─> Consultation begins                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Consent Management Flow
```
GRANTING CONSENT:
1. Receive consent request notification
2. Review: Doctor name, purpose, duration, permissions
3. Approve or Deny
4. If approved: Doctor gains access for specified duration

REVOKING CONSENT:
1. Go to Consent Management page
2. View active consents
3. Click "Revoke" on any consent
4. Confirm revocation → Access immediately terminated
```

### Medical Records Access
```
1. Navigate to Medical Records
2. View all records (owned by patient)
3. Each record shows:
   - Doctor who created it
   - Date, diagnosis, treatment
   - Blockchain verification status
   - IPFS document link
4. Download/share records as needed
```

---

## 5.2 DOCTOR FLOWS

### Appointment Management
```
┌─────────────────────────────────────────────────────────────┐
│                   DOCTOR APPOINTMENT FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. VIEW PENDING REQUESTS                                    │
│     └─> See new appointment requests                         │
│     └─> Review patient info, reason, service type            │
│                                                              │
│  2. APPROVE/REJECT                                           │
│     └─> Approve: Patient notified to pay                     │
│     └─> Reject: Provide reason                               │
│                                                              │
│  3. VERIFY PAYMENT                                           │
│     └─> View uploaded receipt                                │
│     └─> Confirm payment received                             │
│     └─> Appointment becomes active                           │
│                                                              │
│  4. CONSULTATION DAY                                         │
│     └─> View queue of checked-in patients                    │
│     └─> Call next patient                                    │
│     └─> Start consultation                                   │
│                                                              │
│  5. DURING CONSULTATION                                      │
│     └─> Request consent (if not granted)                     │
│     └─> View patient history (with consent)                  │
│     └─> Record diagnosis, treatment                          │
│     └─> Write prescriptions                                  │
│     └─> Order lab tests                                      │
│                                                              │
│  6. COMPLETE CONSULTATION                                    │
│     └─> Save medical record                                  │
│     └─> Schedule follow-up (optional)                        │
│     └─> End consultation                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Consent Request Flow
```
1. Select patient from appointment
2. Click "Request Access"
3. Specify:
   - Permissions needed (view history, write prescriptions, etc.)
   - Duration (hours, days, appointment-only)
   - Purpose/reason
4. Submit request
5. Wait for patient approval
6. Once granted: Access patient data
```

### Medical Record Creation
```
1. During consultation, click "Create Record"
2. Fill form:
   - Record type (consultation, follow-up, etc.)
   - Chief complaint
   - Examination findings
   - Diagnosis (with ICD-10 codes)
   - Treatment plan
3. Save → Record stored in database
4. Optionally: Store on blockchain for verification
```

---

## 5.3 PHARMACIST FLOWS

### Prescription Dispensing
```
1. Patient presents prescription (QR code or ID)
2. Scan/search prescription
3. Verify:
   - Prescription is valid (not expired)
   - Patient identity matches
   - Medication available
4. Dispense medication
5. Record:
   - Quantity dispensed
   - Batch number
   - Expiry date
6. Mark prescription as filled
7. Patient receives medication
```

### Prescription Access Control
```
1. Patient grants access via QR code or manual grant
2. Pharmacist can view prescription details
3. Access is time-limited
4. Patient can revoke anytime
```

---

## 5.4 LAB TECHNICIAN FLOWS

### Test Processing
```
1. View pending lab orders
2. Collect sample from patient
3. Process test
4. Upload results:
   - Test values
   - Normal ranges
   - Interpretation
   - Attachments (images, PDFs)
5. Submit for doctor review
6. Doctor approves → Patient notified
```

---

## 5.5 ADMIN FLOWS

### User Management
```
1. View all users (filter by role)
2. Approve/suspend accounts
3. View user activity
4. Manage permissions
```

### System Monitoring
```
1. View system statistics
2. Monitor active sessions
3. Check database health
4. Review audit logs
```

---

## 5.6 Payment Flow (Peer-to-Peer)

```
┌─────────────────────────────────────────────────────────────┐
│              PEER-TO-PEER PAYMENT FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PATIENT                          DOCTOR                     │
│     │                                │                       │
│     │  1. Book paid appointment      │                       │
│     │─────────────────────────────>  │                       │
│     │                                │                       │
│     │  2. Approve appointment        │                       │
│     │  <─────────────────────────────│                       │
│     │                                │                       │
│     │  3. View payment details       │                       │
│     │     (Telebirr: 0911234567)     │                       │
│     │     (CBE: 1000123456789)       │                       │
│     │                                │                       │
│     │  4. Make direct payment        │                       │
│     │     via Telebirr/CBE Birr      │                       │
│     │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>  │                       │
│     │                                │                       │
│     │  5. Upload receipt screenshot  │                       │
│     │─────────────────────────────>  │                       │
│     │                                │                       │
│     │  6. Verify & confirm payment   │                       │
│     │  <─────────────────────────────│                       │
│     │                                │                       │
│     │  7. Appointment confirmed!     │                       │
│     │                                │                       │
└─────────────────────────────────────────────────────────────┘

NOTE: No platform intermediary - direct doctor-patient payment
```
