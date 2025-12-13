# Elite-Tena Healthcare Management System
## Part 9: User Guides

---

## 9.1 Patient User Guide

### Getting Started

#### Registration
1. Visit the Elite-Tena website
2. Click "Register" or "Get Started"
3. Choose registration method:
   - **Email/Password**: Enter email, create password, fill profile
   - **MetaMask**: Connect wallet, sign message, fill profile
4. Complete profile: Name, phone, date of birth
5. Click "Register" → You're logged in!

#### Booking an Appointment
1. From Dashboard, click "Book Appointment"
2. **Select Doctor**:
   - Browse by specialty (Cardiology, Pediatrics, etc.)
   - View doctor profiles, ratings, fees
3. **Choose Service Type**:
   - In-Person (visit clinic)
   - Video Call (online consultation)
   - Chat (text-based consultation)
4. **Select Date & Time**: Pick from available slots
5. **Confirm Booking**:
   - Free appointments: Confirmed immediately
   - Paid appointments: Wait for doctor approval

#### Making Payment (Peer-to-Peer)
1. After doctor approves, view payment details
2. Note doctor's payment info:
   - Telebirr number: 09XXXXXXXX
   - CBE Birr account: XXXXXXXXXXXX
3. Open Telebirr/CBE Birr app on your phone
4. Send payment directly to doctor
5. Take screenshot of payment confirmation
6. Return to Elite-Tena, click "Upload Receipt"
7. Upload screenshot, enter transaction ID
8. Wait for doctor to confirm payment
9. Appointment confirmed! ✅

#### Managing Consent
1. Go to "Consent" page from menu
2. **View Pending Requests**: Doctors requesting access
3. **Grant Access**: Click "Approve" to allow doctor access
4. **Revoke Access**: Click "Revoke" to remove access anytime
5. **View Active Consents**: See who has access to your data

#### Viewing Medical Records
1. Go to "Medical Records" from menu
2. View all your records
3. Each record shows:
   - Date and doctor name
   - Diagnosis and treatment
   - Blockchain verification status
4. Click record to view details
5. Download or share as needed

---

## 9.2 Doctor User Guide

### Dashboard Overview
- **Pending Approvals**: Appointment requests awaiting your approval
- **Today's Appointments**: Scheduled for today
- **Patient Queue**: Checked-in patients waiting
- **Recent Consultations**: Completed consultations

### Managing Appointments

#### Approving Appointments
1. View "Pending Approvals" section
2. Review patient info and reason
3. Click "Approve" or "Reject"
4. If rejected, provide reason

#### Confirming Payments
1. Patient uploads payment receipt
2. View receipt in appointment details
3. Verify payment received in your account
4. Click "Confirm Payment"
5. Appointment becomes active

#### Starting Consultation
1. Patient checks in at reception
2. View patient in queue
3. Click "Call Patient"
4. Patient notified to enter

### Requesting Patient Consent
1. Open patient's appointment
2. Click "Request Access"
3. Select permissions needed:
   - View medical history
   - Add consultation notes
   - Write prescriptions
   - Order lab tests
4. Set duration (hours/days)
5. Submit request
6. Wait for patient approval

### Creating Medical Records
1. During consultation, click "Create Record"
2. Fill consultation form:
   - Chief complaint
   - Examination findings
   - Diagnosis (with ICD-10 codes)
   - Treatment plan
3. Click "Save Record"
4. Optionally: "Store on Blockchain" for verification

### Writing Prescriptions
1. Click "Create Prescription"
2. Enter medication details:
   - Medication name
   - Dosage (e.g., 500mg)
   - Frequency (e.g., 3 times daily)
   - Duration (e.g., 7 days)
   - Quantity
   - Instructions
3. Save prescription
4. Patient can view and share with pharmacy

### Ordering Lab Tests
1. Click "Order Lab Test"
2. Select test type
3. Add instructions (e.g., fasting required)
4. Set priority (routine/urgent)
5. Submit order
6. Lab technician receives notification

---

## 9.3 Pharmacist User Guide

### Accessing Prescriptions
1. Patient grants access via:
   - QR code scan
   - Manual grant (enter your wallet)
2. View accessible prescriptions

### Dispensing Medication
1. Open prescription details
2. Verify:
   - Prescription is valid (not expired)
   - Patient identity matches
   - Medication available
3. Click "Dispense"
4. Enter:
   - Quantity dispensed
   - Batch number
   - Medication expiry date
5. Confirm dispensing
6. Prescription marked as filled

---

## 9.4 Lab Technician User Guide

### Processing Lab Orders
1. View pending lab orders
2. Open order details
3. Collect sample from patient
4. Process test in laboratory

### Uploading Results
1. Open completed test
2. Click "Upload Results"
3. Enter:
   - Test values
   - Normal ranges
   - Interpretation
4. Attach result documents (PDF/images)
5. Submit for doctor review
6. Doctor approves → Patient notified

---

## 9.5 Admin User Guide

### User Management
1. Go to Admin Panel (/admin)
2. View all users
3. Filter by role
4. Actions:
   - Approve new doctors/pharmacists
   - Suspend accounts
   - View user activity

### System Monitoring
1. View system statistics
2. Check active sessions
3. Monitor database health
4. Review audit logs

### Analytics
1. View appointment statistics
2. User registration trends
3. Payment summaries
4. System usage metrics

---

## 9.6 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't connect MetaMask | Install MetaMask, ensure Sepolia network |
| Login fails | Check email/password, clear cache |
| Payment not confirmed | Contact doctor, re-upload receipt |
| Can't view records | Request consent from patient |
| Video call not working | Check camera/mic permissions |
| Notifications not received | Check browser notification settings |

### Getting Help
- Email: support@elitetena.com
- Phone: +251-XXX-XXXXXX
- In-app: Click "Help" in menu
