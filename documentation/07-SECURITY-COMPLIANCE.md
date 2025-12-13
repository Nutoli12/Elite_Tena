# Elite-Tena Healthcare Management System
## Part 7: Security & Compliance

---

## 7.1 Data Security

### Encryption
| Data Type | Encryption Method |
|-----------|-------------------|
| Passwords | bcrypt (10 rounds) |
| JWT Tokens | HS256 algorithm |
| Medical Records | AES-256 (IPFS) |
| Database | PostgreSQL TLS |
| API Traffic | HTTPS/TLS 1.3 |

### Secure Data Storage
```
┌─────────────────────────────────────────────────────────────┐
│                    DATA STORAGE LAYERS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: PostgreSQL Database                                │
│  ├─ User credentials (hashed)                               │
│  ├─ Appointment metadata                                     │
│  ├─ Consent records                                          │
│  └─ Transaction logs                                         │
│                                                              │
│  Layer 2: IPFS (Pinata)                                      │
│  ├─ Medical documents                                        │
│  ├─ Lab result files                                         │
│  ├─ Payment receipts                                         │
│  └─ Encrypted patient data                                   │
│                                                              │
│  Layer 3: Ethereum Blockchain                                │
│  ├─ Consent grants/revocations                              │
│  ├─ Medical record hashes                                    │
│  ├─ Prescription verification                                │
│  └─ Immutable audit trail                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Transmission Security
- All API endpoints use HTTPS
- WebSocket connections use WSS
- CORS configured for allowed origins only
- Rate limiting: 1000 requests/15 minutes per IP

---

## 7.2 Access Control

### Role-Based Permissions Matrix

| Permission | Patient | Doctor | Pharmacist | Lab Tech | Admin |
|------------|---------|--------|------------|----------|-------|
| View own records | ✅ | - | - | - | ✅ |
| View patient records | - | ✅* | - | - | ✅ |
| Create medical records | - | ✅* | - | - | - |
| Write prescriptions | - | ✅* | - | - | - |
| Dispense prescriptions | - | - | ✅* | - | - |
| Upload lab results | - | - | - | ✅ | - |
| Manage users | - | - | - | - | ✅ |
| Grant consent | ✅ | - | - | - | - |
| Revoke consent | ✅ | - | - | - | ✅ |

*Requires active patient consent

### Consent-Based Access
```javascript
// Middleware: Check Consent
const requireConsent = async (req, res, next) => {
  const { patientWallet } = req.params;
  const doctorWallet = req.user.walletAddress;
  
  const consent = await Consent.findOne({
    where: {
      patientWalletAddress: patientWallet,
      doctorWalletAddress: doctorWallet,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() }
    }
  });
  
  if (!consent) {
    return res.status(403).json({
      error: 'No active consent',
      message: 'Patient consent required to access this data'
    });
  }
  
  req.consent = consent;
  next();
};
```

### Emergency Access Protocol
```
EMERGENCY ACCESS PROCEDURE:
1. Doctor requests emergency access
2. Provide detailed justification (min 10 characters)
3. System logs emergency access request
4. Temporary 2-hour access granted
5. Patient notified of emergency access
6. Full audit trail maintained
7. Admin review within 24 hours
```

---

## 7.3 Audit Logging

### Logged Events
| Event Type | Data Captured |
|------------|---------------|
| Login | User, IP, timestamp, method |
| Consent Grant | Patient, doctor, permissions, duration |
| Consent Revoke | Patient, doctor, reason |
| Record Access | Who, what, when, consent ID |
| Record Creation | Doctor, patient, record type |
| Payment | Amount, method, parties |
| Emergency Access | Doctor, patient, justification |

### Audit Log Schema
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  eventType VARCHAR NOT NULL,
  userId VARCHAR,
  targetId VARCHAR,
  action VARCHAR NOT NULL,
  details JSONB,
  ipAddress VARCHAR,
  userAgent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 7.4 Compliance

### Healthcare Regulations
- **Patient Data Ownership**: Patients control their data
- **Consent-First Access**: No access without explicit consent
- **Right to Revoke**: Patients can revoke access anytime
- **Data Portability**: Patients can export their records

### Ethiopian Context
- **Language Support**: Amharic and English
- **Local Payment Methods**: Telebirr, CBE Birr
- **Currency**: Ethiopian Birr (ETB)
- **Time Zone**: East Africa Time (EAT)

### Data Privacy Principles
1. **Minimization**: Collect only necessary data
2. **Purpose Limitation**: Use data only for stated purpose
3. **Accuracy**: Keep data up-to-date
4. **Storage Limitation**: Retain only as long as needed
5. **Integrity**: Protect against unauthorized changes
6. **Confidentiality**: Restrict access to authorized users

---

## 7.5 Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- Hashed with bcrypt (10 rounds)

### Session Management
- JWT tokens expire in 24 hours
- Tokens stored in localStorage
- Automatic logout on token expiry
- Session invalidation on password change

### API Security
```javascript
// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests'
});

// Helmet Security Headers
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Input Validation
const validateInput = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  next();
};
```

### Blockchain Security
- Private keys stored in environment variables
- Never exposed to frontend
- Transaction signing on backend only
- Contract ownership verified
