# Consent-First Consultation Workflow - Complete Implementation

## 🎯 Overview

This document describes the complete implementation of the consent-first consultation workflow system. This system ensures that **patient consent is required before any consultation can begin**, providing granular permission control for different consultation activities.

## 📋 Workflow States

The appointment workflow follows these states:

```
scheduled → awaiting_consent → consent_granted → consultation_started → completed
```

### State Descriptions

1. **`scheduled`** - Appointment is booked but no consent requested yet
2. **`awaiting_consent`** - Doctor has requested consent, waiting for patient approval
3. **`consent_granted`** - Patient has granted consent, consultation can begin
4. **`consultation_started`** - Doctor has started the consultation
5. **`completed`** - Consultation is finished

## 🔧 Database Schema Changes

### Appointments Table
```sql
-- New columns added to appointments table
ALTER TABLE appointments 
ADD COLUMN workflowState VARCHAR DEFAULT 'scheduled',
ADD COLUMN requiresConsent BOOLEAN DEFAULT true;
```

### Consents Table
```sql
-- Enhanced consents table for appointment-specific permissions
ALTER TABLE consents 
ADD COLUMN appointmentId UUID REFERENCES appointments(id),
ADD COLUMN scope VARCHAR DEFAULT 'appointment_only',
ALTER COLUMN permissions SET DEFAULT '{
  "canVideoCall": false,
  "canChat": false,
  "canViewHistory": false,
  "canWritePrescriptions": false,
  "canOrderTests": false
}';
```

## 🚀 API Endpoints

### 1. Request Consent (Doctor)
```http
POST /api/appointments/:id/request-consent
```

**Request Body:**
```json
{
  "doctorWallet": "0x...",
  "permissions": {
    "canVideoCall": true,
    "canChat": true,
    "canViewHistory": true,
    "canWritePrescriptions": false,
    "canOrderTests": false
  },
  "purpose": "Video consultation access",
  "durationType": "appointment_only"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Consent request sent to patient",
  "data": {
    "consent": { "id": "uuid", "status": "pending" },
    "appointment": { "workflowState": "awaiting_consent" }
  }
}
```

### 2. Grant Consent (Patient)
```http
POST /api/appointments/:id/grant-consent
```

**Request Body:**
```json
{
  "patientWallet": "0x...",
  "consentId": "uuid",
  "permissions": {
    "canVideoCall": true,
    "canChat": true,
    "canViewHistory": true,
    "canWritePrescriptions": false,
    "canOrderTests": false
  }
}
```

### 3. Check Consent Status
```http
GET /api/appointments/:id/consent-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointmentId": "uuid",
    "workflowState": "consent_granted",
    "requiresConsent": true,
    "hasConsent": true,
    "consent": {
      "id": "uuid",
      "status": "active",
      "permissions": { "canVideoCall": true, "canChat": true },
      "grantedAt": "2024-01-01T10:00:00Z",
      "expiresAt": "2024-01-01T18:00:00Z"
    }
  }
}
```

### 4. Start Consultation (Doctor)
```http
POST /api/appointments/:id/start-consultation
```

**Request Body:**
```json
{
  "doctorWallet": "0x..."
}
```

### 5. Revoke Consent (Patient or Doctor)
```http
POST /api/appointments/:id/revoke-consent
```

**Request Body:**
```json
{
  "userWallet": "0x...",
  "reason": "Patient requested revocation"
}
```

## 🔒 Consent Middleware

The consent middleware (`requireConsentForConsultation.js`) automatically checks consent before allowing access to consultation features.

### Usage in Controllers

```javascript
import { requireConsentForConsultation } from '../middleware/requireConsentForConsultation.js';

// Apply to video call routes
router.post('/video-calls/:appointmentId/create', requireConsentForConsultation, createVideoCall);

// Apply to chat routes  
router.get('/chat/:appointmentId/messages', requireConsentForConsultation, getMessages);
```

### Permission Mapping

The middleware automatically maps endpoints to required permissions:

- `/video-call` → `canVideoCall`
- `/chat` → `canChat`
- `/prescriptions` (POST) → `canWritePrescriptions`
- `/lab-results` (POST) → `canOrderTests`
- `/medical-records` (GET) → `canViewHistory`

## 🎨 Frontend Components

### ConsentGate Component

Wraps consultation features and shows consent UI when needed:

```tsx
import { ConsentGate } from '../components/consent/ConsentGate';

function VideoConsultation({ appointmentId, patientWallet }) {
  return (
    <ConsentGate
      appointmentId={appointmentId}
      patientWallet={patientWallet}
      action="videoCall"
    >
      {/* Video call interface - only shown if consent granted */}
      <VideoCallInterface />
    </ConsentGate>
  );
}
```

### useConsentGate Hook

Provides consent checking functionality:

```tsx
const {
  consentStatus,
  loading,
  checkConsent,
  requestConsent,
  hasAccess
} = useConsentGate({
  patientWallet,
  appointmentId,
  autoCheck: true
});
```

## 📱 User Experience Flow

### Doctor Dashboard
1. See paid appointment → Click "Request Consent"
2. Select permissions needed → Send to patient
3. Wait for patient approval
4. Once granted → Start consultation

### Patient Dashboard  
1. See consent request notification
2. Review requested permissions
3. Grant/Modify/Deny permissions
4. If granted → Doctor can start consultation

### Consultation Room
1. Check consent on entry
2. If missing → Show consent gate
3. Only enable features based on granted permissions

## 🔧 Configuration Options

### Free vs Premium Consultations

```javascript
// Free consultations (might not require consent)
const appointment = {
  fee: 0,
  requiresConsent: false, // Configurable
  serviceType: 'inPerson'
};

// Premium consultations (always require consent)
const appointment = {
  fee: 50,
  requiresConsent: true,
  serviceType: 'videoCall'
};
```

### Permission Scopes

- **`appointment_only`** - Consent expires when appointment ends
- **`time_based`** - Consent expires after specified duration
- **`permanent`** - Consent doesn't expire (for ongoing care)

## 🚨 Emergency Override

For emergency situations, doctors can request emergency access:

```javascript
// Emergency consent (2-hour duration)
const emergencyConsent = await Consent.create({
  patientWalletAddress,
  doctorWalletAddress,
  permissions: ['viewMedicalHistory', 'createRecords', 'emergency'],
  status: 'emergency',
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  isEmergency: true,
  emergencyJustification: 'Patient unconscious, immediate access needed'
});
```

## 📊 Testing

Run the consent workflow test:

```bash
node test-consent-workflow.js
```

This test covers:
- ✅ Appointment creation
- ✅ Consent request flow
- ✅ Patient consent granting
- ✅ Consultation start with consent
- ✅ Middleware blocking without consent

## 🔐 Security Features

1. **Granular Permissions** - Separate permissions for each consultation feature
2. **Time-based Expiry** - Consent automatically expires
3. **Audit Trail** - All consent actions are logged
4. **Revocation** - Either party can revoke consent
5. **Emergency Override** - With proper justification and logging

## 📈 Benefits

1. **Patient Control** - Patients have full control over their data access
2. **Compliance** - Meets healthcare privacy regulations
3. **Transparency** - Clear consent trail for all actions
4. **Flexibility** - Different permission levels for different services
5. **Security** - Prevents unauthorized access to patient data

## 🎯 Business Rules

- **Free consultations**: Configurable consent requirement
- **Paid/premium services**: Always require consent
- **Video/chat**: Specific consent for each modality
- **Medical data access**: Separate consent from consultation consent
- **Auto-expiry**: Consent expires when appointment ends (configurable)

## 🚀 Implementation Status

✅ **Database Schema** - Workflow state and consent tracking  
✅ **Backend API** - All consent workflow endpoints  
✅ **Middleware** - Consent checking for consultation features  
✅ **Frontend Components** - ConsentGate and hooks  
✅ **Permission System** - Granular permission control  
✅ **Testing** - Comprehensive workflow testing  

## 📝 Next Steps

1. **Real-time Notifications** - WebSocket integration for consent updates
2. **Mobile App Integration** - Consent flow in mobile app
3. **Analytics Dashboard** - Consent metrics and reporting
4. **Advanced Permissions** - Role-based permission templates
5. **Blockchain Integration** - Store consent on blockchain for immutability

---

**The consent-first consultation workflow is now fully implemented and ready for production use!** 🎉