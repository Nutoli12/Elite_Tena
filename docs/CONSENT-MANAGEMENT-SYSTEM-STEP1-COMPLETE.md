# 🛡️ CONSENT MANAGEMENT SYSTEM - STEP 1 COMPLETE

## ✅ WHAT WE'VE BUILT

### 1. Enhanced Consent Model (`server/src/models/Consent.js`)

**Complete State Machine:**
- `requested` → Doctor requests access
- `pending` → Waiting for patient approval
- `active` → Access granted and currently valid
- `limited` → Restricted access
- `emergency` → Emergency override
- `expired` → Time limit reached
- `auto_revoked` → System automatically revoked
- `patient_revoked` → Patient manually revoked
- `doctor_revoked` → Doctor ended access
- `admin_revoked` → Admin revoked

**Access Level Hierarchy:**
- `NONE` (0) - No access
- `EMERGENCY` (1) - Critical info only
- `LIMITED` (2) - Specific purpose
- `STANDARD` (3) - Full for duration
- `PERMANENT` (4) - Rare - chronic conditions

**Granular Permissions:**
```javascript
{
  viewMedicalHistory: boolean,
  viewLabResults: boolean,
  viewPrescriptions: boolean,
  addConsultationNotes: boolean,
  orderTests: boolean,
  writePrescriptions: boolean,
  shareWithColleagues: boolean,
  exportRecords: boolean,
  deleteRecords: boolean
}
```

**Instance Methods:**
- `isExpired()` - Check if consent has expired
- `isCurrentlyActive()` - Check if consent is active and not expired
- `canAccess(action)` - Check if specific action is permitted
- `recordAccess()` - Log access attempt
- `recordAction(action, details)` - Log specific action
- `grant(grantedBy)` - Grant consent and calculate expiration
- `revoke(reason, revokedBy)` - Revoke consent with reason

**Class Methods:**
- `checkAndExpireConsents()` - Auto-expire old consents (for cron jobs)

---

### 2. Comprehensive Consent Controller (`server/src/controllers/consentController.js`)

**Patient Endpoints:**
- ✅ `getPendingRequests` - View all pending access requests
- ✅ `grantConsent` - Approve access request
- ✅ `denyConsent` - Deny access request
- ✅ `getActiveConsents` - View all active permissions
- ✅ `revokeConsent` - Revoke active consent
- ✅ `getConsentHistory` - View complete consent history with filters

**Doctor Endpoints:**
- ✅ `requestAccess` - Request access to patient records
- ✅ `getDoctorConsents` - View all consent requests and their status
- ✅ `checkAccess` - Check if has access to specific patient/action

**System Endpoints:**
- ✅ `getConsentStats` - Get consent statistics
- ✅ `autoExpireConsents` - Auto-expire old consents (cron job)

---

### 3. RESTful API Routes (`server/src/routes/consent.js`)

```
👨‍⚕️ DOCTOR ROUTES:
POST   /api/consent/request                                    - Request access
GET    /api/consent/doctor/:doctorWalletAddress               - View my consents
GET    /api/consent/check/:doctorWallet/:patientWallet        - Check access

👤 PATIENT ROUTES:
GET    /api/consent/pending/:patientWalletAddress             - View pending requests
POST   /api/consent/:consentId/grant                          - Grant consent
POST   /api/consent/:consentId/deny                           - Deny request
GET    /api/consent/active/:patientWalletAddress              - View active consents
POST   /api/consent/:consentId/revoke                         - Revoke consent
GET    /api/consent/history/:patientWalletAddress             - View full history

📊 STATISTICS:
GET    /api/consent/stats/:role/:walletAddress                - Get statistics

🔄 SYSTEM:
POST   /api/consent/auto-expire                               - Auto-expire (cron)
```

---

### 4. Database Migration (`server/migrations/enhance-consent-management-system.sql`)

**Tables Created:**

1. **`consents`** - Main consent management table
   - Complete state machine
   - Granular permissions (JSONB)
   - Time management fields
   - Audit trail fields
   - Emergency override support
   - Blockchain integration

2. **`consent_audit_logs`** - Detailed access tracking
   - Every access logged
   - IP address and user agent
   - Action details (JSONB)
   - Timestamp tracking

3. **`patient_consent_preferences`** - Patient preferences
   - Auto-permit settings
   - Emergency override settings
   - Special rules (JSONB)
   - Notification preferences

**Indexes Created:**
- Patient wallet lookup
- Doctor wallet lookup
- Status filtering
- Appointment linking
- Expiration checking
- Active consent queries

**Functions Created:**
- `auto_expire_consents()` - Automatically expire old consents
- `update_updated_at_column()` - Auto-update timestamps

---

## 🎯 WHAT'S WORKING NOW

### Backend API:
✅ Complete consent state machine
✅ Granular permission system
✅ Time-based expiration
✅ Audit trail logging
✅ Patient and doctor endpoints
✅ Access checking
✅ Statistics tracking

### Database:
✅ Enhanced consent table
✅ Audit log table
✅ Patient preferences table
✅ Proper indexes
✅ Auto-expiration function

---

## 📋 NEXT STEPS (Step 2)

### Frontend Components Needed:

1. **Patient Components:**
   - `PendingConsentRequests.tsx` - View and respond to requests
   - `ActiveConsentsList.tsx` - Manage active permissions
   - `ConsentHistoryView.tsx` - View complete history
   - `ConsentPreferences.tsx` - Set default rules
   - `RevokeConsentModal.tsx` - Revoke with reason

2. **Doctor Components:**
   - `RequestAccessModal.tsx` - Request patient access
   - `MyConsentRequests.tsx` - View request status
   - `AccessWaitingScreen.tsx` - Waiting for approval
   - `AccessGrantedBanner.tsx` - Show active access
   - `AccessRevokedNotice.tsx` - Handle revocation

3. **Shared Components:**
   - `ConsentStatusBadge.tsx` - Visual status indicator
   - `PermissionsList.tsx` - Display permissions
   - `ConsentTimeline.tsx` - Visual timeline
   - `AuditLogViewer.tsx` - View access logs

### Integration Needed:
- Connect to notification system
- Add blockchain recording
- Implement real-time updates (Socket.io)
- Add email notifications
- Create cron job for auto-expiration

---

## 🔧 HOW TO USE

### 1. Run the Migration:
```bash
psql -U your_user -d your_database -f server/migrations/enhance-consent-management-system.sql
```

### 2. Test the API:

**Doctor Requests Access:**
```bash
curl -X POST http://localhost:3003/api/consent/request \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "0xPatient123",
    "doctorWalletAddress": "0xDoctor456",
    "purpose": "Cardiology consultation",
    "requestReason": "Need to review cardiac history",
    "durationType": "hours",
    "durationValue": 24,
    "consentTypes": ["medical_records", "lab_results"]
  }'
```

**Patient Views Pending Requests:**
```bash
curl http://localhost:3003/api/consent/pending/0xPatient123
```

**Patient Grants Consent:**
```bash
curl -X POST http://localhost:3003/api/consent/{consentId}/grant \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "0xPatient123"
  }'
```

**Doctor Checks Access:**
```bash
curl http://localhost:3003/api/consent/check/0xDoctor456/0xPatient123?action=viewMedicalHistory
```

**Patient Revokes Consent:**
```bash
curl -X POST http://localhost:3003/api/consent/{consentId}/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "patientWalletAddress": "0xPatient123",
    "reason": "Treatment completed"
  }'
```

---

## 📊 DATABASE SCHEMA

```sql
consents
├── id (UUID, PK)
├── patientWalletAddress (FK → patients)
├── doctorWalletAddress (FK → doctors)
├── appointmentId (FK → appointments, nullable)
├── status (ENUM: requested, pending, active, etc.)
├── accessLevel (ENUM: NONE, EMERGENCY, LIMITED, etc.)
├── consentTypes (TEXT[])
├── permissions (JSONB)
├── purpose (TEXT)
├── requestReason (TEXT)
├── requestedAt (TIMESTAMP)
├── grantedAt (TIMESTAMP)
├── expiresAt (TIMESTAMP)
├── revokedAt (TIMESTAMP)
├── lastAccessedAt (TIMESTAMP)
├── durationType (ENUM)
├── durationValue (INTEGER)
├── revocationReason (TEXT)
├── revokedBy (VARCHAR)
├── blockchainTxHash (VARCHAR)
├── revocationTxHash (VARCHAR)
├── accessCount (INTEGER)
├── recordsViewed (INTEGER)
├── actionsPerformed (JSONB)
├── isEmergency (BOOLEAN)
├── emergencyJustification (TEXT)
├── isAutoGranted (BOOLEAN)
├── autoGrantReason (VARCHAR)
├── notes (TEXT)
├── patientNotes (TEXT)
├── createdAt (TIMESTAMP)
└── updatedAt (TIMESTAMP)
```

---

## 🎉 SUMMARY

**Step 1 is COMPLETE!** We've built:
- ✅ Complete backend consent management system
- ✅ State machine with 10 states
- ✅ Granular permission system
- ✅ Comprehensive API endpoints
- ✅ Database schema with audit logging
- ✅ Patient preference system
- ✅ Auto-expiration functionality

**Ready for Step 2:** Frontend UI components to bring this to life! 🚀

---

## 📝 NOTES

- All endpoints return consistent JSON responses
- Proper error handling implemented
- Includes patient and doctor associations
- Audit trail for compliance
- Blockchain-ready (txHash fields)
- Supports emergency access
- Auto-expiration built-in
- Extensible for future features

**Next:** Let's build the beautiful UI components! 🎨
