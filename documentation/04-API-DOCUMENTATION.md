# Elite-Tena Healthcare Management System
## Part 4: API Documentation

**Base URL:** `http://localhost:3003/api`

---

## 4.1 Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "securePassword123",
  "role": "patient",
  "profileData": {
    "fullName": "Abebe Kebede",
    "phone": "+251911234567",
    "dateOfBirth": "1990-01-15"
  }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": { "walletAddress": "0x...", "email": "...", "role": "patient" },
    "auth": { "token": "jwt_token_here" }
  }
}
```

### Login (Email/Password)
```http
POST /auth/login
{
  "email": "patient@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": {...},
    "auth": { "token": "jwt_token" }
  }
}
```

### Login (MetaMask Wallet)
```http
POST /auth/wallet/connect
{
  "walletAddress": "0x1234567890abcdef...",
  "signature": "0xsigned_message...",
  "message": "Sign in to Elite-Tena"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": { "walletAddress": "...", "email": "...", "role": "..." }
}
```

---

## 4.2 Appointment Endpoints

### Get All Appointments
```http
GET /appointments?userRole=patient&userId=0x...
Authorization: Bearer <token>
```

### Create Appointment
```http
POST /appointments
{
  "patientWalletAddress": "0x...",
  "doctorWalletAddress": "0x...",
  "appointmentDate": "2025-01-15T10:00:00Z",
  "reason": "General checkup",
  "serviceType": "inPerson",
  "fee": 500,
  "requiresApproval": true
}
```

### Approve Appointment (Doctor)
```http
POST /appointments/:id/approve
{
  "doctorWalletAddress": "0x..."
}
```

### Upload Payment Receipt
```http
POST /appointments/:id/upload-receipt
Content-Type: multipart/form-data

file: <receipt_image>
transactionId: "TXN123456"
```

### Confirm Payment (Doctor)
```http
POST /appointments/:id/confirm-payment
{
  "doctorWalletAddress": "0x..."
}
```

### Check-in Patient
```http
POST /appointments/:id/check-in
{
  "checkedInBy": "reception_staff_id"
}
```

### Reschedule Appointment
```http
PATCH /appointments/:id/reschedule
{
  "newDate": "2025-01-20T14:00:00Z",
  "reason": "Schedule conflict"
}
```

---

## 4.3 Consent Endpoints

### Request Consent (Doctor)
```http
POST /consent/request
{
  "patientWalletAddress": "0x...",
  "doctorWalletAddress": "0x...",
  "permissions": ["viewMedicalHistory", "addConsultationNotes"],
  "purpose": "Medical consultation",
  "durationType": "hours",
  "durationValue": 24
}
```

### Grant Consent (Patient)
```http
POST /consent/grant/:consentId
{
  "patientWalletAddress": "0x..."
}
```

### Revoke Consent (Patient)
```http
POST /consent/revoke/:consentId
{
  "patientWalletAddress": "0x..."
}
```

### Check Consent Status
```http
GET /consent/status/:patientWallet/:doctorWallet
```

### Get Patient's Consents
```http
GET /consent/patient/:patientWallet?status=active
```

### Emergency Access
```http
POST /consent/emergency-check
{
  "patientWalletAddress": "0x...",
  "doctorWalletAddress": "0x...",
  "justification": "Patient unconscious, emergency treatment required"
}
```

---

## 4.4 Medical Records Endpoints

### Get Patient Records
```http
GET /medical-records/:patientWallet
Authorization: Bearer <token>
```

### Create Medical Record
```http
POST /medical-records
{
  "patientWalletAddress": "0x...",
  "doctorWalletAddress": "0x...",
  "recordType": "consultation",
  "title": "General Checkup",
  "description": "Patient presents with...",
  "diagnosis": "Mild hypertension",
  "symptoms": ["headache", "fatigue"],
  "visitDate": "2025-01-15"
}
```

---

## 4.5 Prescription Endpoints

### Create Prescription
```http
POST /prescriptions
{
  "patientWalletAddress": "0x...",
  "doctorWalletAddress": "0x...",
  "medicationName": "Amoxicillin",
  "dosage": "500mg",
  "frequency": "3 times daily",
  "duration": "7 days",
  "quantity": 21,
  "instructions": "Take with food"
}
```

### Dispense Prescription (Pharmacist)
```http
POST /prescriptions/:id/dispense
{
  "pharmacistWallet": "0x...",
  "dispensedQuantity": 21,
  "batchNumber": "BATCH123"
}
```

---

## 4.6 Lab Results Endpoints

### Order Lab Test (Doctor)
```http
POST /lab-results
{
  "patientWalletAddress": "0x...",
  "doctorWalletAddress": "0x...",
  "testType": "blood_test",
  "testName": "Complete Blood Count",
  "priority": "routine",
  "instructions": "Fasting required"
}
```

### Upload Results (Lab Tech)
```http
POST /lab-results/:id/upload
Content-Type: multipart/form-data

results: "Normal values..."
file: <result_document>
```

---

## 4.7 Payment Endpoints

### Initialize Payment
```http
POST /payments/initialize
{
  "appointmentId": "uuid",
  "amount": 500,
  "paymentMethod": "telebirr",
  "customerEmail": "patient@example.com",
  "customerPhone": "+251911234567"
}
```

### Verify Payment
```http
GET /payments/verify/:transactionId
```

---

## 4.8 Notification Endpoints

### Get User Notifications
```http
GET /notifications?userId=0x...
```

### Mark as Read
```http
PATCH /notifications/:id/read
```

---

## 4.9 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - No consent/permission |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Server Error |

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```
