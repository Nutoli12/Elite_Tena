# Doctor Payment Settings - Implementation Guide

## Current Status
- ✅ Database model exists (`DoctorPaymentSettings`)
- ✅ Backend API exists (`/api/premium-service/payment-settings/:doctorWallet`)
- ❌ No UI for doctors to enter payment info
- ❌ Payment info not shown to patients in premium service flow

## What Needs to Be Done

### 1. Doctor Settings Page (NEW)
Create a page where doctors can manage their payment settings.

**Location**: `elite-tena-frontend/src/pages/doctor/DoctorSettings.tsx`

**Fields to Add**:
```typescript
- Telebirr Phone: string
- Telebirr Enabled: boolean
- CBE Birr Account: string
- CBE Birr Enabled: boolean
- Bank Name: string
- Bank Account Number: string
- Bank Account Holder: string
- Bank Transfer Enabled: boolean
- Premium Service Fee: number (in Birr)
```

**API Endpoints**:
- GET `/api/premium-service/payment-settings/:doctorWallet`
- PUT `/api/premium-service/payment-settings/:doctorWallet`

### 2. Update Premium Service Modal
When patient requests premium service, show doctor's payment options.

**Location**: `elite-tena-frontend/src/components/modals/PaymentDetailsModal.tsx`

**What to Show**:
```
Doctor: Dr. [Name]
Premium Service Fee: [Amount] Birr

Payment Options:
□ Telebirr: [phone number]
□ CBE Birr: [account number]
□ Bank Transfer: [bank name] - [account number]

Instructions:
1. Pay using one of the methods above
2. Upload payment receipt
3. Wait for doctor approval
```

### 3. Quick Implementation Steps

#### Step 1: Create Doctor Settings Page
```bash
# Create file
elite-tena-frontend/src/pages/doctor/DoctorSettings.tsx
```

#### Step 2: Add Route
```typescript
// In App.tsx
<Route path="/doctor/settings" element={
  <ProtectedRoute requiredRole="doctor">
    <HealthcareLayout>
      <DoctorSettings />
    </HealthcareLayout>
  </ProtectedRoute>
} />
```

#### Step 3: Add Link in Doctor Dashboard
```typescript
// In DoctorDashboard.tsx or HealthcareLayout.tsx
<Link to="/doctor/settings">
  <Settings className="w-5 h-5" />
  Payment Settings
</Link>
```

#### Step 4: Update PaymentDetailsModal
Fetch doctor's payment settings and display them instead of hardcoded values.

## Alternative: Quick Fix for Testing

If you want to test immediately without building the full UI:

### Option A: Add Payment Info Directly to Database
```sql
INSERT INTO "DoctorPaymentSettings" (
  "id",
  "doctorWalletAddress",
  "telebirrPhone",
  "telebirrEnabled",
  "cbeBirrAccount",
  "cbeBirrEnabled",
  "bankName",
  "bankAccountNumber",
  "bankAccountHolder",
  "bankTransferEnabled",
  "premiumServiceFee",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'DOCTOR_WALLET_ADDRESS_HERE',
  '+251912345678',
  true,
  '1000123456789',
  true,
  'Commercial Bank of Ethiopia',
  '1000123456789',
  'Dr. John Doe',
  true,
  500,
  NOW(),
  NOW()
);
```

### Option B: Use API Directly
```bash
# Update doctor payment settings via API
curl -X PUT http://localhost:3003/api/premium-service/payment-settings/DOCTOR_WALLET \
  -H "Content-Type: application/json" \
  -d '{
    "telebirrPhone": "+251912345678",
    "telebirrEnabled": true,
    "cbeBirrAccount": "1000123456789",
    "cbeBirrEnabled": true,
    "bankName": "Commercial Bank of Ethiopia",
    "bankAccountNumber": "1000123456789",
    "bankAccountHolder": "Dr. John Doe",
    "bankTransferEnabled": true,
    "premiumServiceFee": 500
  }'
```

## Current Fixes Applied ✅

### 1. Doctor Appointments Page
- ✅ Fixed consultation buttons to use React Router `navigate()`
- ✅ Added delete functionality with API call
- ✅ Comprehensive consultation button works for all appointments
- ✅ Quick consultation button works
- ✅ View button shows appointment details
- ✅ Delete button removes appointments

### 2. Navigation Fixed
- Changed from `window.location.href` to `navigate()`
- This fixes the "buttons not working" issue

## Testing Checklist

- [ ] Doctor can navigate to settings page
- [ ] Doctor can enter Telebirr phone number
- [ ] Doctor can enter CBE Birr account
- [ ] Doctor can enter bank details
- [ ] Doctor can set premium service fee
- [ ] Settings are saved to database
- [ ] Patient sees payment options when requesting premium service
- [ ] Patient can select payment method
- [ ] Patient can upload receipt
- [ ] Doctor can approve/reject payment

## Priority

**HIGH PRIORITY**:
1. Fix consultation buttons ✅ DONE
2. Create doctor settings page
3. Update payment details modal

**MEDIUM PRIORITY**:
4. Add payment settings link to navigation
5. Add validation for payment fields

**LOW PRIORITY**:
6. Add payment method icons
7. Add payment instructions
8. Add payment history

## Status
- Consultation buttons: ✅ FIXED
- Delete functionality: ✅ FIXED
- Payment settings UI: ⏳ TODO
- Payment display in modal: ⏳ TODO
