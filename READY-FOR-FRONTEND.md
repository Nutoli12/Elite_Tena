# 🚀 BACKEND READY - FRONTEND INTEGRATION GUIDE

## ✅ BACKEND STATUS: COMPLETE & RUNNING

**Server:** Running on `http://localhost:3003` ✅  
**Database:** Connected and synced ✅  
**Models:** Created and associated ✅  
**Routes:** Registered and tested ✅  
**Documentation:** Complete ✅

---

## 🎯 WHAT WAS IMPLEMENTED

### **1. SEPARATE APPOINTMENT VIEWS**

#### **Patient View - "My Appointments"**
```javascript
// Fetch patient's appointments only
GET /api/appointments/patient/:patientWallet

// Returns appointments WHERE patientWalletAddress = :patientWallet
```

#### **Doctor View - "My Schedule"**
```javascript
// Fetch doctor's schedule only
GET /api/appointments/doctor/:doctorWallet/schedule

// Returns appointments WHERE doctorWalletAddress = :doctorWallet
```

### **2. PEER-TO-PEER PAYMENT SYSTEM**

**Key Principle:** System DOES NOT process payments
- Patients pay DIRECTLY to doctors
- System only facilitates connection
- No platform fees
- Manual payment verification

### **3. PREMIUM SERVICE WORKFLOW**

```
Patient Request → Doctor Approval → Patient Payment → 
Doctor Verification → Appointment Scheduled
```

---

## 📋 FRONTEND TASKS

### **PRIORITY 1: Update Existing Components**

#### **1. Update `Appointments.tsx` (Patient View)**
Location: `elite-tena-frontend/src/pages/Appointments.tsx`

**Changes Needed:**
```typescript
// BEFORE (Wrong - fetches all appointments)
const response = await axios.get('/appointments');

// AFTER (Correct - fetches only patient's appointments)
const response = await axios.get(`/appointments/patient/${user.walletAddress}`);
```

**Additional Features:**
- Show premium service status badges
- Display payment instructions when approved
- Add "Upload Receipt" button for approved services
- Show payment confirmation status

#### **2. Update `DoctorDashboard.tsx` (Doctor View)**
Location: `elite-tena-frontend/src/pages/doctor/DoctorDashboard.tsx`

**Changes Needed:**
```typescript
// Fetch doctor's schedule (not patient appointments)
const response = await axios.get(`/appointments/doctor/${user.walletAddress}/schedule`);

// Fetch pending approvals
const approvals = await axios.get(`/premium-services/doctor/${user.walletAddress}/pending-approvals`);

// Fetch pending payment confirmations
const payments = await axios.get(`/premium-services/doctor/${user.walletAddress}/pending-payments`);
```

#### **3. Update `PendingApprovals.tsx`**
Location: `elite-tena-frontend/src/components/doctor/PendingApprovals.tsx`

**Add:**
- Approve/Reject buttons
- Payment details form
- Link to approval modal

---

### **PRIORITY 2: Create New Components**

#### **1. `PaymentDetailsModal.tsx`**
Location: `elite-tena-frontend/src/components/modals/PaymentDetailsModal.tsx`

**Purpose:** Show doctor's payment details to patient

**Props:**
```typescript
interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  onUploadReceipt: () => void;
}
```

**Display:**
- Doctor's Telebirr number
- CBE Birr account details
- Bank transfer information
- Payment instructions
- Amount to pay
- "Upload Receipt" button

**API Call:**
```typescript
// Get appointment details (includes doctorPaymentDetails)
const response = await axios.get(`/appointments/${appointmentId}`);
const paymentDetails = response.data.data.doctorPaymentDetails;
const instructions = response.data.data.paymentInstructions;
```

#### **2. Update `UploadReceiptModal.tsx`**
Location: `elite-tena-frontend/src/components/modals/UploadReceiptModal.tsx`

**Purpose:** Patient uploads payment receipt

**API Call:**
```typescript
// Upload to IPFS first
const ipfsHash = await uploadToIPFS(receiptFile);

// Then submit to backend
await axios.post(`/premium-services/${appointmentId}/upload-receipt`, {
  patientWalletAddress: user.walletAddress,
  receiptUrl: `ipfs://${ipfsHash}`,
  transactionId: transactionId,
  notes: notes
});
```

#### **3. `DoctorApprovalModal.tsx`**
Location: `elite-tena-frontend/src/components/modals/DoctorApprovalModal.tsx`

**Purpose:** Doctor approves premium service with payment details

**Props:**
```typescript
interface DoctorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onApproved: () => void;
}
```

**Form Fields:**
- Payment method selection (Telebirr, CBE Birr, Bank)
- Payment details (phone/account number)
- Account name
- Custom instructions
- Approve/Reject buttons

**API Calls:**
```typescript
// Approve
await axios.post(`/premium-services/${appointmentId}/approve`, {
  doctorWalletAddress: user.walletAddress,
  paymentMethod: 'telebirr',
  paymentDetails: {
    telebirrNumber: '+251 91 234 5678',
    telebirrName: 'Dr. Alemayehu'
  },
  paymentInstructions: 'Please send payment and upload receipt'
});

// Reject
await axios.post(`/premium-services/${appointmentId}/reject`, {
  doctorWalletAddress: user.walletAddress,
  rejectionReason: 'Not available at that time'
});
```

#### **4. `PaymentVerificationModal.tsx`**
Location: `elite-tena-frontend/src/components/modals/PaymentVerificationModal.tsx`

**Purpose:** Doctor verifies patient payment

**Display:**
- Patient receipt image (from IPFS)
- Transaction ID
- Payment timestamp
- Amount
- Confirm/Reject buttons

**API Calls:**
```typescript
// Confirm payment
await axios.post(`/premium-services/${appointmentId}/confirm-payment`, {
  doctorWalletAddress: user.walletAddress
});

// Reject payment proof
await axios.post(`/premium-services/${appointmentId}/reject-payment`, {
  doctorWalletAddress: user.walletAddress,
  rejectionReason: 'Payment not received in my account'
});
```

#### **5. `PaymentSettingsPage.tsx`**
Location: `elite-tena-frontend/src/pages/doctor/PaymentSettings.tsx`

**Purpose:** Doctor configures payment methods and fees

**Form Fields:**
- Telebirr (enabled, number, name)
- CBE Birr (enabled, account, bank, branch)
- Bank Transfer (enabled, account details)
- Cash (enabled)
- Video Call Fee (ETB)
- Chat Fee (ETB)
- Default Instructions

**API Calls:**
```typescript
// Get current settings
const response = await axios.get(`/premium-services/payment-settings/${user.walletAddress}`);

// Update settings
await axios.put(`/premium-services/payment-settings/${user.walletAddress}`, {
  telebirrEnabled: true,
  telebirrNumber: '+251 91 234 5678',
  telebirrName: 'Dr. Alemayehu',
  videoCallFee: 50.00,
  chatFee: 30.00,
  // ... other fields
});
```

---

## 🔧 IMPLEMENTATION STEPS

### **Step 1: Update Patient Appointments Page**
```bash
# File: elite-tena-frontend/src/pages/Appointments.tsx

1. Change API endpoint to /appointments/patient/:wallet
2. Add premium service status badges
3. Add payment details button (when approved)
4. Add upload receipt button (when approved)
5. Show payment confirmation status
```

### **Step 2: Update Doctor Dashboard**
```bash
# File: elite-tena-frontend/src/pages/doctor/DoctorDashboard.tsx

1. Change API endpoint to /appointments/doctor/:wallet/schedule
2. Fetch pending approvals count
3. Fetch pending payments count
4. Add links to approval/verification pages
5. Show today's schedule properly
```

### **Step 3: Create Payment Modals**
```bash
1. Create PaymentDetailsModal.tsx
2. Update UploadReceiptModal.tsx
3. Create DoctorApprovalModal.tsx
4. Create PaymentVerificationModal.tsx
5. Create PaymentSettingsPage.tsx
```

### **Step 4: Update Pending Approvals Component**
```bash
# File: elite-tena-frontend/src/components/doctor/PendingApprovals.tsx

1. Fetch from /premium-services/doctor/:wallet/pending-approvals
2. Add approve/reject buttons
3. Open DoctorApprovalModal on approve
4. Handle rejection with reason
```

### **Step 5: Test Complete Workflow**
```bash
1. Patient requests premium service
2. Doctor sees in pending approvals
3. Doctor approves with payment details
4. Patient sees payment instructions
5. Patient uploads receipt
6. Doctor sees in pending payments
7. Doctor confirms payment
8. Appointment scheduled
```

---

## 📊 API ENDPOINTS REFERENCE

### **Patient Endpoints:**
```
GET    /api/appointments/patient/:patientWallet
POST   /api/premium-services/request
POST   /api/premium-services/:id/upload-receipt
GET    /api/premium-services/patient/:patientWallet/requests
```

### **Doctor Endpoints:**
```
GET    /api/appointments/doctor/:doctorWallet/schedule
GET    /api/premium-services/doctor/:doctorWallet/pending-approvals
GET    /api/premium-services/doctor/:doctorWallet/pending-payments
POST   /api/premium-services/:id/approve
POST   /api/premium-services/:id/reject
POST   /api/premium-services/:id/confirm-payment
POST   /api/premium-services/:id/reject-payment
GET    /api/premium-services/payment-settings/:doctorWallet
PUT    /api/premium-services/payment-settings/:doctorWallet
```

---

## 🧪 TESTING COMMANDS

### **Test Patient Appointments:**
```bash
curl http://localhost:3003/api/appointments/patient/0x123...
```

### **Test Doctor Schedule:**
```bash
curl http://localhost:3003/api/appointments/doctor/0x456.../schedule
```

### **Test Payment Settings:**
```bash
curl http://localhost:3003/api/premium-services/payment-settings/0x456...
```

### **Test Premium Service Request:**
```bash
curl -X POST http://localhost:3003/api/premium-services/request \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "0x123...",
    "doctorWalletAddress": "0x456...",
    "serviceType": "videoCall",
    "appointmentDate": "2024-01-25T15:00:00",
    "reason": "Need consultation"
  }'
```

---

## 📚 DOCUMENTATION FILES

1. `PEER-TO-PEER-PAYMENT-SYSTEM.md` - Complete system guide
2. `APPOINTMENT-SEPARATION-COMPLETE.md` - Separation details
3. `IMPLEMENTATION-COMPLETE-SUMMARY.md` - Implementation summary
4. `READY-FOR-FRONTEND.md` - This file (frontend guide)

---

## ✅ CHECKLIST

### **Backend:**
- [x] Database models created
- [x] API endpoints implemented
- [x] Routes registered
- [x] Server running
- [x] Tested with curl

### **Frontend:**
- [ ] Update Appointments.tsx
- [ ] Update DoctorDashboard.tsx
- [ ] Create PaymentDetailsModal
- [ ] Update UploadReceiptModal
- [ ] Create DoctorApprovalModal
- [ ] Create PaymentVerificationModal
- [ ] Create PaymentSettingsPage
- [ ] Update PendingApprovals
- [ ] Test complete workflow

---

## 🎯 SUCCESS CRITERIA

✅ **Patients see only their appointments**  
✅ **Doctors see only their schedule**  
✅ **Premium services require approval**  
✅ **Payments are peer-to-peer**  
✅ **Payment verification works**  
✅ **No platform payment processing**  
✅ **Clear separation of concerns**

---

**BACKEND STATUS:** ✅ Complete and Running  
**FRONTEND STATUS:** ⏳ Ready for Implementation  
**NEXT STEP:** Update frontend components following this guide

Let's build this! 🚀
