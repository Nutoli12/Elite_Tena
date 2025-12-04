# 💰 PEER-TO-PEER PAYMENT SYSTEM

## 🎯 CORE CONCEPT

**Elite-Tena Healthcare DOES NOT process payments**
- Patients pay **DIRECTLY** to doctors
- System only **facilitates connection**
- No platform fees
- No transaction processing
- No escrow services
- Manual payment verification

---

## 🔄 COMPLETE WORKFLOW

### PHASE 1: PATIENT REQUESTS PREMIUM SERVICE

**Patient Actions:**
1. Browse available doctors
2. Select premium service (Video Call or Chat)
3. Choose date/time
4. Submit request with reason

**System Actions:**
- Create appointment with `requiresApproval: true`
- Set `approvalStatus: 'pending'`
- Notify doctor of new request

**API Endpoint:**
```javascript
POST /api/premium-services/request
Body: {
  patientWalletAddress: "0x...",
  doctorWalletAddress: "0x...",
  serviceType: "videoCall" | "chat",
  appointmentDate: "2024-01-25T15:00:00",
  reason: "Need consultation",
  notes: "Additional details"
}
```

---

### PHASE 2: DOCTOR REVIEWS REQUEST

**Doctor Sees:**
- Patient name and details
- Service type requested
- Proposed date/time
- Reason for visit
- Suggested fee (from doctor's settings)

**Doctor Options:**
1. **Approve** - Provide payment details
2. **Reject** - Give reason
3. **Request More Info** - Ask patient for clarification

**API Endpoint:**
```javascript
GET /api/premium-services/doctor/:doctorWallet/pending-approvals
```

---

### PHASE 3: DOCTOR APPROVES & PROVIDES PAYMENT DETAILS

**Doctor Actions:**
1. Review request
2. Select payment method(s) to accept
3. Provide payment details:
   - Telebirr number
   - CBE Birr account
   - Bank transfer details
4. Add custom instructions
5. Approve request

**System Actions:**
- Update `approvalStatus: 'approved'`
- Store `doctorPaymentDetails` (encrypted)
- Store `paymentInstructions`
- Set `paymentStatus: 'pending'`
- Notify patient with payment details

**API Endpoint:**
```javascript
POST /api/premium-services/:appointmentId/approve
Body: {
  doctorWalletAddress: "0x...",
  paymentMethod: "telebirr",
  paymentDetails: {
    telebirrNumber: "+251 91 234 5678",
    telebirrName: "Dr. Alemayehu Tesfaye"
  },
  paymentInstructions: "Please send payment and upload receipt"
}
```

---

### PHASE 4: PATIENT RECEIVES PAYMENT INSTRUCTIONS

**Patient Sees:**
```
✅ DOCTOR APPROVED YOUR REQUEST!

SERVICE DETAILS:
• Date: January 25, 2024
• Time: 3:00 PM - 3:30 PM
• Duration: 30 minutes
• Amount: 50 ETB

💳 PAYMENT INSTRUCTIONS:

📱 PAY VIA TELEBIRR:
1. Open Telebirr App
2. Go to "Send Money"
3. Enter: +251 91 234 5678
4. Amount: 50 ETB
5. Note: "Video consult Dr. Alemayehu"

⚠️ IMPORTANT:
• Pay DIRECTLY to doctor
• System doesn't handle payments
• Upload receipt after payment
• Doctor confirms manually
```

**Patient Actions:**
1. Make payment using provided details
2. Take screenshot/save receipt
3. Upload proof of payment

---

### PHASE 5: PATIENT UPLOADS PAYMENT RECEIPT

**Patient Actions:**
1. Upload receipt image (IPFS)
2. Enter transaction ID
3. Add notes (optional)
4. Submit proof

**System Actions:**
- Store `paymentReceiptUrl` (IPFS hash)
- Store `paymentTransactionId`
- Update `paymentStatus: 'paid'`
- Notify doctor to verify

**API Endpoint:**
```javascript
POST /api/premium-services/:appointmentId/upload-receipt
Body: {
  patientWalletAddress: "0x...",
  receiptUrl: "ipfs://Qm...",
  transactionId: "TBR-2024-001-ABC123",
  notes: "Paid via Telebirr at 2:30 PM"
}
```

---

### PHASE 6: DOCTOR VERIFIES PAYMENT

**Doctor Sees:**
- Patient payment receipt
- Transaction ID
- Payment timestamp
- Amount claimed

**Doctor Actions:**
1. Check own account (Telebirr/Bank)
2. Verify payment received
3. Confirm or reject

**Options:**
- **Confirm** - Payment verified, schedule appointment
- **Reject** - Payment not received, ask for correct proof

**API Endpoints:**
```javascript
// Confirm payment
POST /api/premium-services/:appointmentId/confirm-payment
Body: {
  doctorWalletAddress: "0x..."
}

// Reject payment proof
POST /api/premium-services/:appointmentId/reject-payment
Body: {
  doctorWalletAddress: "0x...",
  rejectionReason: "Payment not received in my account"
}
```

---

### PHASE 7: APPOINTMENT CONFIRMED

**System Actions:**
- Update `paymentStatus: 'confirmed'`
- Set `paymentConfirmedAt: Date`
- Update `status: 'scheduled'`
- Generate QR code for check-in
- Notify patient

**Patient Sees:**
```
✅ PAYMENT CONFIRMED & APPOINTMENT SCHEDULED

📋 APPOINTMENT DETAILS:
• Service: Video Call Consultation
• Doctor: Dr. Alemayehu Tesfaye
• Date: January 25, 2024
• Time: 3:00 PM - 3:30 PM
• Amount Paid: 50 ETB
• Payment Method: Telebirr
• Transaction: TBR-2024-001-ABC123

🔗 JOINING INSTRUCTIONS:
1. 5 minutes before appointment, click "Join Call"
2. You'll enter virtual waiting room
3. Doctor will join at scheduled time
4. Have your questions ready

💡 REMINDER:
• Payment was DIRECT to doctor
• System only facilitated connection
• No platform fees were charged
• Rate doctor after consultation
```

---

## 📊 DATABASE MODELS

### Appointment Model (Updated)
```javascript
{
  // ... existing fields ...
  
  // Premium Service Fields
  serviceType: 'inPerson' | 'videoCall' | 'chat',
  requiresApproval: boolean,
  approvalStatus: 'pending' | 'approved' | 'rejected',
  approvedAt: Date,
  approvedBy: string,
  rejectionReason: string,
  
  // Peer-to-Peer Payment Fields
  paymentMethod: 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'cash' | 'free',
  doctorPaymentDetails: JSON, // Encrypted
  paymentInstructions: string,
  paymentReceiptUrl: string, // IPFS
  paymentTransactionId: string,
  paymentConfirmedAt: Date,
  paymentConfirmedBy: string,
  paymentRejectionReason: string
}
```

### DoctorPaymentSettings Model (New)
```javascript
{
  id: UUID,
  doctorWalletAddress: string,
  
  // Telebirr
  telebirrEnabled: boolean,
  telebirrNumber: string,
  telebirrName: string,
  
  // CBE Birr
  cbeBirrEnabled: boolean,
  cbeBirrAccount: string,
  cbeBirrName: string,
  cbeBirrBank: string,
  cbeBirrBranch: string,
  
  // Bank Transfer
  bankTransferEnabled: boolean,
  bankName: string,
  bankAccountNumber: string,
  bankAccountName: string,
  bankBranch: string,
  
  // Cash
  cashEnabled: boolean,
  
  // Pricing
  videoCallFee: decimal,
  chatFee: decimal,
  
  // Instructions
  defaultPaymentInstructions: text,
  
  // Auto-approval
  autoApproveVideoCall: boolean,
  autoApproveChat: boolean
}
```

---

## 🔐 SECURITY & TRUST

### For Patients:
✅ Doctor verification (medical licenses checked)
✅ Payment confirmation required
✅ Dispute resolution available
✅ Clear cancellation policy
✅ Digital receipts stored securely

### For Doctors:
✅ Payment proof verification
✅ Patient history visible
✅ Cancellation protection
✅ Feedback system
✅ Earnings tracking

---

## 📱 FRONTEND COMPONENTS NEEDED

### Patient Components:
1. `BookPremiumServiceModal.tsx` - Request premium service
2. `PaymentDetailsModal.tsx` - View doctor payment details
3. `UploadReceiptModal.tsx` - Upload payment proof
4. `PremiumServiceStatus.tsx` - Track request status

### Doctor Components:
1. `PendingApprovals.tsx` - Review premium requests
2. `DoctorApprovalModal.tsx` - Approve/reject with payment details
3. `PaymentVerificationModal.tsx` - Verify patient payments
4. `PaymentSettingsPage.tsx` - Configure payment methods
5. `PendingPaymentConfirmations.tsx` - List payments to verify

---

## 🎯 KEY DIFFERENCES FROM TRADITIONAL SYSTEMS

### ❌ WHAT WE DON'T DO:
- Process payments
- Hold funds in escrow
- Charge platform fees
- Handle refunds
- Integrate payment gateways
- Calculate transaction fees

### ✅ WHAT WE DO:
- Connect patients and doctors
- Facilitate communication
- Store payment details (reference only)
- Track appointment status
- Provide secure video/chat platform
- Monitor for disputes (mediation only)

---

## 📊 ADMIN MONITORING (VIEW ONLY)

Admin can see:
- Total premium requests
- Approval rates
- Payment dispute count
- Service completion rates
- Average fees
- Popular services

Admin CANNOT:
- Process payments
- Access payment details
- Handle refunds
- Charge fees
- Modify transactions

Admin CAN:
- Mediate disputes
- Verify doctor credentials
- Suspend accounts (fraud)
- View system statistics

---

## 🚀 IMPLEMENTATION CHECKLIST

### Backend:
- [x] Create `DoctorPaymentSettings` model
- [x] Update `Appointment` model with payment fields
- [x] Create `premiumServiceController.js`
- [x] Create `premiumService.js` routes
- [x] Add routes to `server.js`
- [ ] Run database migrations
- [ ] Test all endpoints

### Frontend:
- [ ] Create patient premium service components
- [ ] Create doctor approval components
- [ ] Create payment verification components
- [ ] Update appointment pages
- [ ] Add payment settings page for doctors
- [ ] Test complete workflow

### Testing:
- [ ] Test request flow
- [ ] Test approval flow
- [ ] Test payment upload
- [ ] Test payment verification
- [ ] Test rejection scenarios
- [ ] Test notifications

---

## 📝 EXAMPLE PAYMENT RECORD

```
ELITE-TENA HEALTHCARE - PAYMENT RECORD
──────────────────────────────────────────
⚠️  PEER-TO-PEER TRANSACTION
──────────────────────────────────────────
Service: Video Call Consultation
Date: January 25, 2024, 3:00 PM
Duration: 30 minutes

DOCTOR: Dr. Alemayehu Tesfaye
Cardiology Specialist

PATIENT: Alemayehu Kebede
Contact: patient@email.com

PAYMENT DETAILS:
──────────────────────────────────────────
Amount: 50 ETB
Method: Telebirr
To: +251 91 234 5678
Transaction: TBR-2024-001-ABC123
Time: Jan 24, 2024, 2:30 PM

IMPORTANT NOTES:
──────────────────────────────────────────
• Payment was made DIRECTLY to doctor
• Elite-Tena did not process this payment
• No platform fees were charged
• Keep this receipt for your records
• Contact doctor directly for refunds

This is a payment record only. The platform
facilitated the connection but did not
handle the transaction.
──────────────────────────────────────────
```

---

## 🎉 BENEFITS OF PEER-TO-PEER SYSTEM

### For Patients:
- No platform fees
- Direct relationship with doctor
- Flexible payment methods
- Transparent pricing
- Faster service

### For Doctors:
- Keep 100% of fees
- Set own prices
- Choose payment methods
- Direct patient relationships
- No transaction delays

### For Platform:
- No payment processing liability
- No PCI compliance needed
- No payment gateway fees
- Simpler system architecture
- Focus on healthcare features

---

## 📞 SUPPORT & DISPUTES

If payment issues arise:
1. Patient contacts doctor directly
2. Doctor reviews payment proof
3. If unresolved, platform mediates
4. Platform provides communication channel
5. Final resolution between patient and doctor

Platform role: **Facilitator and mediator only**

---

## ✅ SYSTEM STATUS

- [x] Database models created
- [x] Backend controllers implemented
- [x] API routes configured
- [ ] Frontend components (in progress)
- [ ] Testing (pending)
- [ ] Documentation complete

**Next Steps:**
1. Run database migrations
2. Test backend endpoints
3. Build frontend components
4. End-to-end testing
5. Deploy to production
