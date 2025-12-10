# 🔗 CONSENT SYSTEM INTEGRATION GUIDE

## Quick Integration Steps

### 1. Add Doctor Consent Route to App.tsx

Add this import at the top:
```typescript
import { DoctorConsent } from './pages/doctor/DoctorConsent';
```

Add this route in the Routes section (around line 120-130):
```typescript
<Route
  path="/doctor/consent"
  element={
    <ProtectedRoute allowedRoles={['doctor']}>
      <HealthcareLayout>
        <DoctorConsent />
      </HealthcareLayout>
    </ProtectedRoute>
  }
/>
```

### 2. Add Navigation Links

#### In Doctor Dashboard (`frontend/src/pages/doctor/DoctorDashboard.tsx`):
Add a consent management card:
```typescript
<motion.div
  whileHover={{ y: -5 }}
  className="medical-card p-6 cursor-pointer"
  onClick={() => navigate('/doctor/consent')}
>
  <Shield className="w-8 h-8 text-medical-600 mb-3" />
  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    Patient Access
  </h3>
  <p className="text-gray-600 text-sm">
    Request and manage patient record access
  </p>
</motion.div>
```

#### In Healthcare Layout Navigation:
Add to the navigation menu:
```typescript
{user?.role === 'doctor' && (
  <Link
    to="/doctor/consent"
    className="nav-link"
  >
    <Shield className="w-5 h-5" />
    Patient Access
  </Link>
)}
```

### 3. Integrate Access Banner in Patient View

When doctor views patient records, show the AccessGrantedBanner:

```typescript
import { AccessGrantedBanner } from '../components/doctor/AccessGrantedBanner';

// In your patient record view component:
const [activeConsent, setActiveConsent] = useState(null);

useEffect(() => {
  checkAccess();
}, []);

const checkAccess = async () => {
  const response = await axios.get(
    `/consent/check/${doctorWallet}/${patientWallet}`
  );
  if (response.data.hasAccess) {
    setActiveConsent(response.data.consent);
  }
};

// In render:
{activeConsent && (
  <AccessGrantedBanner
    patientName={patientName}
    expiresAt={activeConsent.expiresAt}
    permissions={activeConsent.permissions}
    recordsAvailable={{
      consultations: 5,
      labResults: 12,
      imagingReports: 3,
      medications: 8
    }}
    onViewRecords={() => {/* Navigate to records */}}
    onRequestExtension={() => {/* Request extension */}}
  />
)}
```

### 4. Add Request Access Button to Appointment

In appointment booking or doctor's appointment view:

```typescript
import { RequestAccessModal } from '../components/modals/RequestAccessModal';

const [showRequestModal, setShowRequestModal] = useState(false);

// Add button:
<button
  onClick={() => setShowRequestModal(true)}
  className="healthcare-button"
>
  <Shield className="w-4 h-4" />
  Request Access
</button>

// Add modal:
<RequestAccessModal
  isOpen={showRequestModal}
  onClose={() => setShowRequestModal(false)}
  patientWalletAddress={appointment.patientWalletAddress}
  appointmentId={appointment.id}
  onSuccess={() => {
    // Refresh or show success message
  }}
/>
```

### 5. Add Consent Notifications

In your notification system, add consent-related notifications:

```typescript
// When patient receives request:
{
  type: 'consent_request',
  title: 'New Access Request',
  message: `Dr. ${doctorName} requests access to your records`,
  action: '/consent',
  icon: <Shield />
}

// When doctor's request is approved:
{
  type: 'consent_granted',
  title: 'Access Granted',
  message: `${patientName} granted you access`,
  action: '/doctor/consent',
  icon: <CheckCircle />
}

// When access is revoked:
{
  type: 'consent_revoked',
  title: 'Access Revoked',
  message: `${patientName} revoked your access`,
  action: '/doctor/consent',
  icon: <XCircle />
}
```

### 6. Protect Medical Record Routes

Add consent checking middleware to protected routes:

```typescript
// In medical record view:
const checkConsentBeforeAccess = async () => {
  const response = await axios.get(
    `/consent/check/${doctorWallet}/${patientWallet}?action=viewMedicalHistory`
  );
  
  if (!response.data.hasAccess) {
    // Show "No Access" message
    // Offer to request access
    return false;
  }
  
  return true;
};

// Before loading records:
useEffect(() => {
  const loadRecords = async () => {
    const hasAccess = await checkConsentBeforeAccess();
    if (hasAccess) {
      // Load records
    }
  };
  loadRecords();
}, []);
```

### 7. Setup Cron Job for Auto-Expiration

Add to your server's cron jobs:

```javascript
// server/src/cron/consentExpiration.js
import cron from 'node-cron';
import axios from 'axios';

// Run every hour
cron.schedule('0 * * * *', async () => {
  try {
    await axios.post('http://localhost:3003/api/consent/auto-expire');
    console.log('✅ Expired old consents');
  } catch (error) {
    console.error('❌ Failed to expire consents:', error);
  }
});
```

### 8. Add to Server Startup

In `server/src/server.js`:

```javascript
import './cron/consentExpiration.js';
```

---

## Testing Checklist

### Patient Flow:
- [ ] Patient can view pending requests
- [ ] Patient can grant consent
- [ ] Patient can deny requests
- [ ] Patient can view active consents
- [ ] Patient can revoke consent
- [ ] Patient sees countdown timers
- [ ] Patient receives notifications

### Doctor Flow:
- [ ] Doctor can request access
- [ ] Doctor can select permissions
- [ ] Doctor can track request status
- [ ] Doctor sees access granted banner
- [ ] Doctor can view records when granted
- [ ] Doctor loses access when revoked
- [ ] Doctor can request extension

### System:
- [ ] Consents auto-expire
- [ ] Audit logs are created
- [ ] Statistics are accurate
- [ ] Real-time updates work
- [ ] Notifications are sent
- [ ] Access checks work correctly

---

## API Integration Examples

### Check Access Before Action:
```typescript
const canPerformAction = async (action: string) => {
  try {
    const response = await axios.get(
      `/consent/check/${doctorWallet}/${patientWallet}`,
      { params: { action } }
    );
    return response.data.hasAccess;
  } catch (error) {
    return false;
  }
};

// Usage:
if (await canPerformAction('viewMedicalHistory')) {
  // Show medical history
} else {
  // Show "Request Access" button
}
```

### Get Consent Statistics:
```typescript
const fetchStats = async () => {
  const response = await axios.get(
    `/consent/stats/patient/${walletAddress}`
  );
  setStats(response.data.data);
};
```

### Request Access Programmatically:
```typescript
const requestAccess = async (patientWallet: string) => {
  await axios.post('/consent/request', {
    patientWalletAddress: patientWallet,
    doctorWalletAddress: myWallet,
    purpose: 'Medical consultation',
    permissions: {
      viewMedicalHistory: true,
      viewLabResults: true,
      addConsultationNotes: true
    },
    durationType: 'hours',
    durationValue: 24
  });
};
```

---

## Environment Variables

Add to `.env`:
```
# Consent System
CONSENT_AUTO_EXPIRE_INTERVAL=3600000  # 1 hour in ms
CONSENT_NOTIFICATION_ENABLED=true
CONSENT_EMAIL_ALERTS=true
```

---

## Database Indexes (Already Created)

The migration already includes these indexes for performance:
- `idx_consents_patient` - Fast patient lookups
- `idx_consents_doctor` - Fast doctor lookups
- `idx_consents_status` - Filter by status
- `idx_consents_active` - Active consents only
- `idx_consents_expires` - Expiration checks

---

## Security Considerations

1. **Always check consent before accessing records**
2. **Log all access attempts**
3. **Validate wallet addresses**
4. **Use HTTPS in production**
5. **Rate limit consent requests**
6. **Sanitize user inputs**
7. **Implement CSRF protection**

---

## Performance Tips

1. **Cache active consents** (Redis recommended)
2. **Use database indexes** (already created)
3. **Batch notification sending**
4. **Lazy load consent history**
5. **Paginate large lists**
6. **Use WebSockets for real-time updates**

---

## Monitoring & Alerts

Setup alerts for:
- High revocation rate
- Expired consents not cleaned up
- Failed access checks
- Unusual access patterns
- System errors

---

## 🎉 You're All Set!

The consent management system is now fully integrated and ready to use!

**Next Steps:**
1. Test all flows thoroughly
2. Setup monitoring
3. Configure notifications
4. Deploy to production
5. Train users

**Support:**
- Check the complete documentation
- Review API endpoints
- Test with sample data
- Monitor logs

**Enjoy your production-ready consent management system!** 🚀
