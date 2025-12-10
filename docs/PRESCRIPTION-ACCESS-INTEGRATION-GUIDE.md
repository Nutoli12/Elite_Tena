# 🔗 Prescription Access Control - Integration Guide

## Quick Start: Adding Components to Existing Pages

---

## 📋 FOR PATIENTS

### Option 1: Add to Patient Prescription Details Page

If you have a prescription details page, add the access control component:

```tsx
// frontend/src/pages/patient/PrescriptionDetails.tsx (or similar)

import { PrescriptionAccessControl } from '@/components/prescription/PrescriptionAccessControl';

function PrescriptionDetails() {
  const [prescription, setPrescription] = useState(null);

  // ... existing code to load prescription ...

  return (
    <div className="space-y-6">
      {/* Existing prescription details */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2>Prescription Details</h2>
        {/* ... prescription info ... */}
      </div>

      {/* NEW: Add Access Control */}
      {prescription && (
        <PrescriptionAccessControl
          prescription={prescription}
          onUpdate={() => loadPrescription()} // Refresh prescription data
        />
      )}
    </div>
  );
}
```

### Option 2: Add to Patient Prescriptions List

Add access control button to each prescription in the list:

```tsx
// frontend/src/pages/patient/Prescriptions.tsx

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { PrescriptionAccessControl } from '@/components/prescription/PrescriptionAccessControl';

function Prescriptions() {
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showAccessControl, setShowAccessControl] = useState(false);

  return (
    <div>
      {prescriptions.map((prescription) => (
        <div key={prescription.id} className="prescription-card">
          {/* Existing prescription display */}
          
          {/* NEW: Access Control Button */}
          <button
            onClick={() => {
              setSelectedPrescription(prescription);
              setShowAccessControl(true);
            }}
            className="btn-primary"
          >
            <Shield className="w-4 h-4" />
            Manage Access
          </button>
        </div>
      ))}

      {/* NEW: Access Control Modal/Panel */}
      {showAccessControl && selectedPrescription && (
        <div className="modal">
          <PrescriptionAccessControl
            prescription={selectedPrescription}
            onUpdate={() => loadPrescriptions()}
          />
          <button onClick={() => setShowAccessControl(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
```

---

## 💊 FOR PHARMACISTS

### Option 1: Create Pharmacist Dashboard

Create a new page for pharmacists:

```tsx
// frontend/src/pages/pharmacist/PharmacistDashboard.tsx

import { QRCodeScanner } from '@/components/pharmacist/QRCodeScanner';
import { AccessiblePrescriptions } from '@/components/pharmacist/AccessiblePrescriptions';

function PharmacistDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Pharmacist Dashboard</h1>

      {/* QR Code Scanner */}
      <QRCodeScanner
        onSuccess={(prescription) => {
          console.log('Access granted:', prescription);
          // Optionally refresh accessible prescriptions
        }}
      />

      {/* Accessible Prescriptions */}
      <AccessiblePrescriptions />
    </div>
  );
}

export default PharmacistDashboard;
```

### Option 2: Add to Existing Pharmacist Page

```tsx
// frontend/src/pages/pharmacist/Prescriptions.tsx

import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { QRCodeScanner } from '@/components/pharmacist/QRCodeScanner';
import { AccessiblePrescriptions } from '@/components/pharmacist/AccessiblePrescriptions';

function PharmacistPrescriptions() {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="space-y-6">
      {/* Scan QR Button */}
      <button
        onClick={() => setShowScanner(!showScanner)}
        className="btn-primary"
      >
        <QrCode className="w-5 h-5" />
        {showScanner ? 'Hide Scanner' : 'Scan Patient QR Code'}
      </button>

      {/* QR Scanner */}
      {showScanner && (
        <QRCodeScanner
          onSuccess={() => setShowScanner(false)}
        />
      )}

      {/* Accessible Prescriptions */}
      <AccessiblePrescriptions />
    </div>
  );
}
```

---

## 👨‍⚕️ FOR DOCTORS

### The CreatePrescriptionModal is Already Updated!

No additional integration needed. The modal now includes suggested pharmacy fields automatically.

When creating a prescription:

```tsx
import { CreatePrescriptionModal } from '@/components/modals/CreatePrescriptionModal';

// Use as before - suggested pharmacy fields are now included
<CreatePrescriptionModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  patientWallet={patient.walletAddress}
  patientName={patient.name}
  onSuccess={() => loadPrescriptions()}
/>
```

---

## 🔄 COMPLETE WORKFLOW EXAMPLE

### Patient Prescription Page with Full Integration

```tsx
// frontend/src/pages/patient/MyPrescriptions.tsx

import React, { useState, useEffect } from 'react';
import { Shield, Pill } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/lib/axios';
import { PrescriptionAccessControl } from '@/components/prescription/PrescriptionAccessControl';

function MyPrescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showAccessControl, setShowAccessControl] = useState(false);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const response = await axios.get(`/prescriptions/patient/${user.walletAddress}`);
      if (response.data.success) {
        setPrescriptions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Prescriptions</h1>

      <div className="grid grid-cols-1 gap-4">
        {prescriptions.map((prescription) => (
          <div key={prescription.id} className="bg-white rounded-2xl shadow-lg p-6">
            {/* Prescription Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Pill className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{prescription.medicationName}</h3>
                  <p className="text-gray-600">{prescription.dosage} • {prescription.frequency}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Prescribed by Dr. {prescription.doctorName}
                  </p>
                </div>
              </div>

              {/* Access Control Button */}
              <button
                onClick={() => {
                  setSelectedPrescription(prescription);
                  setShowAccessControl(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Manage Access
              </button>
            </div>

            {/* Quick Status */}
            {prescription.suggestedPharmacyName && !prescription.patientApprovedAt && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-700">
                  💡 Doctor suggested: <strong>{prescription.suggestedPharmacyName}</strong>
                </p>
                <button
                  onClick={() => {
                    setSelectedPrescription(prescription);
                    setShowAccessControl(true);
                  }}
                  className="text-sm text-green-600 font-medium mt-1 hover:underline"
                >
                  Quick Approve →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Access Control Modal */}
      {showAccessControl && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Manage Prescription Access</h2>
              <button
                onClick={() => {
                  setShowAccessControl(false);
                  setSelectedPrescription(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <PrescriptionAccessControl
                prescription={selectedPrescription}
                onUpdate={loadPrescriptions}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPrescriptions;
```

---

## 🎯 ROUTING SETUP

Add routes for pharmacist pages:

```tsx
// frontend/src/App.tsx or router config

import PharmacistDashboard from '@/pages/pharmacist/PharmacistDashboard';

// Add route
<Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
```

---

## 🔔 OPTIONAL: Add Notifications

When access is granted, you can trigger notifications:

```tsx
// In QuickApproveModal.tsx, ManualGrantModal.tsx, etc.

if (response.data.success) {
  // Existing success handling
  alert('Access granted to pharmacy!');
  
  // NEW: Trigger notification (if you have notification system)
  await axios.post('/notifications', {
    recipientWallet: prescription.doctorWalletAddress,
    type: 'prescription_access_granted',
    message: `Patient granted access to prescription: ${prescription.medicationName}`,
    metadata: {
      prescriptionId: prescription.id,
      pharmacyName: pharmacyName
    }
  });
  
  onSuccess?.();
  onClose();
}
```

---

## 📱 MOBILE CONSIDERATIONS

For mobile devices, consider:

1. **Full-screen modals** on small screens
2. **Bottom sheets** for quick actions
3. **Camera access** for QR scanning (requires additional library)

```tsx
// Example: Mobile-friendly modal
<div className={`
  fixed inset-0 z-50
  md:flex md:items-center md:justify-center md:p-4
  ${isMobile ? 'bg-white' : 'bg-black bg-opacity-50'}
`}>
  <div className={`
    ${isMobile ? 'h-full w-full' : 'max-w-lg rounded-3xl'}
    bg-white shadow-2xl
  `}>
    {/* Content */}
  </div>
</div>
```

---

## 🧪 TESTING YOUR INTEGRATION

### 1. Patient Flow
```bash
1. Login as patient
2. View prescriptions
3. Click "Manage Access"
4. Try Quick Approve (if pharmacy suggested)
5. Try Manual Grant
6. Try QR Code generation
7. View access grants list
8. Try revoking access
```

### 2. Pharmacist Flow
```bash
1. Login as pharmacist
2. Go to pharmacist dashboard
3. Try scanning QR code (manual token entry)
4. View accessible prescriptions
5. Try dispensing a prescription
```

### 3. Doctor Flow
```bash
1. Login as doctor
2. Create prescription
3. Fill in suggested pharmacy fields
4. Submit
5. Verify patient can see suggestion
```

---

## 🎨 STYLING CUSTOMIZATION

All components use Tailwind CSS. Customize colors:

```tsx
// Change primary color from purple to your brand color
className="bg-purple-600" → className="bg-brand-600"
className="text-purple-600" → className="text-brand-600"
className="border-purple-200" → className="border-brand-200"
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Install qrcode.react dependency
- [ ] Import components in pages
- [ ] Add routes for pharmacist pages
- [ ] Test all workflows
- [ ] Update navigation menus
- [ ] Add access control buttons to prescription lists
- [ ] Test on mobile devices
- [ ] Add error boundaries
- [ ] Add loading states
- [ ] Test with real wallet addresses

---

## 📚 COMPONENT IMPORTS

```tsx
// Patient components
import { PrescriptionAccessControl } from '@/components/prescription/PrescriptionAccessControl';
import { AccessGrantsList } from '@/components/prescription/AccessGrantsList';

// Modals
import { QuickApproveModal } from '@/components/modals/QuickApproveModal';
import { ManualGrantModal } from '@/components/modals/ManualGrantModal';
import { QRCodeModal } from '@/components/modals/QRCodeModal';
import { RevokeAccessModal } from '@/components/modals/RevokeAccessModal';

// Pharmacist components
import { QRCodeScanner } from '@/components/pharmacist/QRCodeScanner';
import { AccessiblePrescriptions } from '@/components/pharmacist/AccessiblePrescriptions';

// Updated modal
import { CreatePrescriptionModal } from '@/components/modals/CreatePrescriptionModal';
```

---

## 🎉 YOU'RE READY!

The prescription access control system is fully built and ready to integrate. Follow the examples above to add it to your existing pages.

**Key Points:**
- ✅ All components are self-contained
- ✅ Easy to integrate with existing pages
- ✅ Minimal props required
- ✅ Handles all API calls internally
- ✅ Beautiful UI out of the box

**Need Help?**
- Check PRESCRIPTION-ACCESS-PHASE3-COMPLETE.md for component details
- Check PRESCRIPTION-ACCESS-PHASE2-COMPLETE.md for API documentation
- Check PRESCRIPTION-ACCESS-CONTROL-DESIGN.md for system design

