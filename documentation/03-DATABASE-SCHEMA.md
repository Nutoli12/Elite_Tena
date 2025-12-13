# Elite-Tena Healthcare Management System
## Part 3: Database Schema

---

## 3.1 Entity Relationship Overview

```
┌─────────┐     ┌─────────┐     ┌─────────────┐
│  User   │────<│ Patient │────<│MedicalRecord│
└────┬────┘     └────┬────┘     └─────────────┘
     │               │
     │          ┌────┴────┐     ┌─────────────┐
     │          │ Consent │────>│   Doctor    │
     │          └─────────┘     └──────┬──────┘
     │                                 │
┌────┴────┐     ┌───────────┐    ┌────┴────┐
│Appointment│───>│  Payment  │    │Prescription│
└──────────┘    └───────────┘    └───────────┘
```

## 3.2 Core Tables

### Users Table
```sql
CREATE TABLE users (
  walletAddress VARCHAR PRIMARY KEY,  -- Ethereum wallet (lowercase)
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  role VARCHAR DEFAULT 'patient',     -- patient|doctor|pharmacist|lab_technician|admin
  isActive BOOLEAN DEFAULT true,
  profileData JSONB DEFAULT '{}',
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Patients Table
```sql
CREATE TABLE patients (
  walletAddress VARCHAR PRIMARY KEY REFERENCES users,
  name VARCHAR,
  dateOfBirth DATE,
  bloodType VARCHAR,
  emergencyContact JSONB,
  medicalHistory TEXT,
  allergies VARCHAR[],
  currentMedications VARCHAR[],
  insuranceInfo JSONB
);
```

### Doctors Table
```sql
CREATE TABLE doctors (
  walletAddress VARCHAR PRIMARY KEY REFERENCES users,
  name VARCHAR,
  specialty VARCHAR,
  specialization VARCHAR,
  licenseNumber VARCHAR,
  hospital VARCHAR,
  yearsOfExperience INTEGER,
  department VARCHAR DEFAULT 'General Practice',
  availableServices JSON,           -- {inPerson, videoCall, chat}
  isAvailable BOOLEAN DEFAULT true,
  consultationFee INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,
  languages JSON DEFAULT '["English","Amharic"]'
);
```

### Appointments Table
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  patientWallet VARCHAR REFERENCES patients,
  doctorWallet VARCHAR REFERENCES doctors,
  appointmentDate TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'scheduled',  -- scheduled|in_progress|completed|cancelled
  reason TEXT,
  duration INTEGER DEFAULT 30,
  fee DECIMAL(10,2) DEFAULT 0,
  
  -- Service Type
  serviceType VARCHAR DEFAULT 'inPerson',  -- inPerson|videoCall|chat
  
  -- Approval System
  requiresApproval BOOLEAN DEFAULT false,
  approvalStatus VARCHAR DEFAULT 'pending',
  approvedAt TIMESTAMP,
  
  -- Payment (Peer-to-Peer)
  paymentStatus VARCHAR DEFAULT 'pending',
  paymentMethod VARCHAR,              -- telebirr|cbe_birr|bank_transfer|cash|free
  paymentReceiptUrl TEXT,
  paymentConfirmedAt TIMESTAMP,
  
  -- Check-in & Queue
  checkInStatus VARCHAR DEFAULT 'not_checked_in',
  queueNumber INTEGER,
  qrCodeData TEXT,
  
  -- Consultation
  workflowState VARCHAR DEFAULT 'scheduled',
  diagnosis TEXT,
  treatmentPlan TEXT,
  
  -- Blockchain
  blockchainTxHash VARCHAR,
  onBlockchain BOOLEAN DEFAULT false
);
```

### Medical Records Table
```sql
CREATE TABLE medical_records (
  id UUID PRIMARY KEY,
  patientWalletAddress VARCHAR REFERENCES patients,
  doctorWalletAddress VARCHAR REFERENCES doctors,
  recordType VARCHAR NOT NULL,        -- consultation|lab_result|prescription|imaging
  title VARCHAR NOT NULL,
  description TEXT,
  diagnosis TEXT,
  symptoms VARCHAR[],
  ipfsHash VARCHAR,                   -- IPFS content hash
  visitDate TIMESTAMP NOT NULL,
  isEncrypted BOOLEAN DEFAULT true,
  
  -- Blockchain
  blockchainTxHash VARCHAR,
  blockNumber INTEGER,
  onBlockchain BOOLEAN DEFAULT false
);
```

### Consents Table
```sql
CREATE TABLE consents (
  id UUID PRIMARY KEY,
  patientWalletAddress VARCHAR REFERENCES patients,
  doctorWalletAddress VARCHAR REFERENCES doctors,
  appointmentId UUID REFERENCES appointments,
  
  status VARCHAR DEFAULT 'requested',  -- requested|pending|active|expired|revoked
  accessLevel VARCHAR DEFAULT 'STANDARD',
  
  permissions JSONB DEFAULT '{
    "viewMedicalHistory": false,
    "viewLabResults": false,
    "viewPrescriptions": false,
    "addConsultationNotes": false,
    "orderTests": false,
    "writePrescriptions": false
  }',
  
  purpose TEXT NOT NULL,
  requestedAt TIMESTAMP,
  grantedAt TIMESTAMP,
  expiresAt TIMESTAMP,
  revokedAt TIMESTAMP,
  
  durationType VARCHAR DEFAULT 'hours',
  durationValue INTEGER DEFAULT 24,
  
  isEmergency BOOLEAN DEFAULT false,
  
  -- Blockchain
  blockchainTxHash VARCHAR,
  onBlockchain BOOLEAN DEFAULT false
);
```

### Prescriptions Table
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY,
  patientWalletAddress VARCHAR REFERENCES patients,
  doctorWalletAddress VARCHAR REFERENCES doctors,
  medicationName VARCHAR NOT NULL,
  dosage VARCHAR NOT NULL,
  frequency VARCHAR NOT NULL,
  duration VARCHAR NOT NULL,
  instructions TEXT,
  quantity INTEGER NOT NULL,
  refills INTEGER DEFAULT 0,
  issueDate TIMESTAMP NOT NULL,
  expiryDate TIMESTAMP NOT NULL,
  isFilled BOOLEAN DEFAULT false,
  status VARCHAR DEFAULT 'active',
  dispensedBy VARCHAR,
  dispensedDate TIMESTAMP,
  ipfsHash VARCHAR,
  blockchainTxHash VARCHAR,
  onBlockchain BOOLEAN DEFAULT false
);
```

### Lab Results Table
```sql
CREATE TABLE lab_results (
  id UUID PRIMARY KEY,
  patientWalletAddress VARCHAR REFERENCES patients,
  doctorWalletAddress VARCHAR,
  testType VARCHAR NOT NULL,
  testName VARCHAR,
  results TEXT,
  notes TEXT,
  status VARCHAR DEFAULT 'pending',
  priority VARCHAR DEFAULT 'routine',
  orderedDate TIMESTAMP,
  completedAt TIMESTAMP,
  completedBy VARCHAR,
  normalRange VARCHAR,
  interpretation TEXT,
  attachments JSONB,
  ipfsHash VARCHAR,
  blockchainTxHash VARCHAR,
  onBlockchain BOOLEAN DEFAULT false
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  appointmentId UUID REFERENCES appointments,
  patientWallet VARCHAR NOT NULL,
  doctorWallet VARCHAR,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR DEFAULT 'ETB',
  status VARCHAR DEFAULT 'pending',
  paymentMethod VARCHAR NOT NULL,     -- chapa|telebirr
  transactionId VARCHAR UNIQUE,
  providerTransactionId VARCHAR,
  providerData JSON,
  verifiedAt TIMESTAMP,
  failureReason TEXT
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  userId VARCHAR REFERENCES users(walletAddress),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR NOT NULL,              -- appointment_reminder|consent_request|payment_required|etc
  isRead BOOLEAN DEFAULT false,
  relatedId VARCHAR,
  relatedType VARCHAR,
  priority VARCHAR DEFAULT 'medium',
  data JSONB
);
```

## 3.3 Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| User → Patient | 1:1 | User profile extension |
| User → Doctor | 1:1 | Doctor profile extension |
| Patient → Appointments | 1:N | Patient's appointments |
| Doctor → Appointments | 1:N | Doctor's appointments |
| Patient → MedicalRecords | 1:N | Patient's records |
| Patient → Consents | 1:N | Patient's consent grants |
| Doctor → Consents | 1:N | Doctor's access requests |
| Appointment → Payments | 1:N | Appointment payments |
| Appointment → Consents | 1:N | Appointment-linked consents |
