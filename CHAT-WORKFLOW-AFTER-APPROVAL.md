# 💬 Chat & Video Call Workflow After Appointment Approval

## Complete Flow: From Booking to Communication

### 📋 Step-by-Step Process

---

## 1️⃣ Patient Books Premium Appointment

**Patient Actions:**
1. Go to Appointments page
2. Click "Book Appointment"
3. Select department and doctor
4. Choose service type:
   - **Video Call** (e.g., 500 Birr)
   - **Chat** (e.g., 300 Birr)
5. Fill in date, time, and reason
6. Submit booking

**What Happens:**
- Appointment created with `requiresApproval: true`
- `approvalStatus: 'pending'`
- `paymentStatus: 'pending'`
- 🔔 **Doctor receives notification**: "New Premium Appointment Request"

---

## 2️⃣ Doctor Receives Notification & Reviews

**Doctor Actions:**
1. Click notification bell (🔔) in header
2. See "New Premium Appointment Request" notification
3. Click notification → Goes to Dashboard
4. See appointment in "Pending Approvals" section
5. Review appointment details:
   - Patient name
   - Service type (Video Call / Chat)
   - Fee amount
   - Reason for visit

**Doctor Options:**
- ✅ **Approve** → Patient can proceed with payment
- ❌ **Reject** → Patient gets rejection notification

---

## 3️⃣ Doctor Approves Appointment

**Doctor Actions:**
1. Click "Approve" button on pending appointment
2. System shows payment details modal
3. Doctor confirms approval

**What Happens:**
- `approvalStatus: 'approved'`
- `status: 'scheduled'`
- 🔔 **Patient receives notification**: "Appointment Approved - Please proceed with payment"
- Patient can now see payment details

---

## 4️⃣ Patient Makes Payment

**Patient Actions:**
1. Click notification bell
2. See "Appointment Approved" notification
3. Click notification → Goes to Appointments page
4. See appointment with "Awaiting Payment" status
5. Click "View Payment Details" button
6. See doctor's payment methods:
   - Telebirr number
   - CBE Birr account
   - Bank account
   - Cash option
7. Make payment via chosen method
8. Upload payment receipt (screenshot/photo)
9. Submit receipt

**What Happens:**
- `paymentStatus: 'paid'`
- Receipt stored in IPFS
- 🔔 **Doctor receives notification**: "Payment Receipt Uploaded - Please verify"

---

## 5️⃣ Doctor Confirms Payment

**Doctor Actions:**
1. Click notification bell
2. See "Payment Receipt Uploaded" notification
3. Go to appointment details
4. View uploaded receipt
5. Verify payment received
6. Click "Confirm Payment"

**What Happens:**
- `paymentStatus: 'confirmed'`
- Appointment fully confirmed
- 🔔 **Patient receives notification**: "Payment Confirmed - Appointment Ready!"
- 🎉 **Chat/Video Call is now enabled!**

---

## 6️⃣ How to Start Chatting (Multiple Ways)

### Method 1: From Appointments Page (Doctor)
1. Go to **Appointments** page
2. Find the confirmed appointment
3. Click **"Chat"** button
4. Opens Messages page with patient's conversation
5. Start chatting!

### Method 2: From Appointments Page (Patient)
1. Go to **Appointments** page
2. Find the confirmed appointment
3. Click **"Chat with Doctor"** button (we need to add this)
4. Opens Messages page with doctor's conversation
5. Start chatting!

### Method 3: From Messages Page (Both)
1. Click **"Messages"** in sidebar navigation
2. See list of conversations
3. Click on the conversation with doctor/patient
4. Start chatting!

### Method 4: From Notification (Both)
1. When appointment is confirmed, notification includes "Start Chat" action
2. Click notification
3. Opens Messages page directly
4. Start chatting!

---

## 7️⃣ How to Start Video Call

### For Video Call Appointments:

**Doctor Initiates:**
1. Go to Appointments page
2. Find the video call appointment
3. Click **"Start Video Call"** button
4. Patient receives incoming call notification
5. Patient accepts → Video call starts

**Patient Initiates:**
1. Go to Appointments page
2. Find the video call appointment
3. Click **"Join Video Call"** button (we need to add this)
4. Doctor receives incoming call notification
5. Doctor accepts → Video call starts

---

## 🔔 Notification Flow Summary

| Event | Who Gets Notified | Notification Type | Action |
|-------|------------------|-------------------|--------|
| Patient books premium appointment | Doctor | `new_appointment_request` | Review & Approve |
| Doctor approves | Patient | `appointment_confirmed` | Make Payment |
| Patient uploads receipt | Doctor | `payment_received` | Verify & Confirm |
| Doctor confirms payment | Patient | `payment_confirmed` | Chat/Call Ready |
| New chat message | Recipient | `chat_message` | View Message |
| Incoming video call | Recipient | `video_call_request` | Accept/Reject |

---

## 🎯 What We Need to Add

### 1. Patient-Side Chat/Video Buttons
Currently, only doctors have chat/video buttons on appointments. We need to add them for patients too.

**File to Modify:** `elite-tena-frontend/src/pages/Appointments.tsx`

Add buttons similar to doctor's appointments:
```tsx
{/* Chat Button */}
<button onClick={() => navigate(`/messages?userId=${appointment.doctorWalletAddress}`)}>
  Chat with Doctor
</button>

{/* Video Call Button (for video appointments) */}
{appointment.serviceType === 'videoCall' && (
  <button onClick={() => navigate(`/messages?userId=${appointment.doctorWalletAddress}&startCall=true`)}>
    Join Video Call
  </button>
)}
```

### 2. Enhanced Notifications with Actions
Add clickable actions to notifications that directly open chat/video.

**File to Modify:** `elite-tena-frontend/src/components/NotificationBell.tsx`

Add action buttons to notifications:
```tsx
{notification.type === 'payment_confirmed' && (
  <button onClick={() => navigate(`/messages?userId=${notification.relatedUserId}`)}>
    Start Chat
  </button>
)}
```

### 3. Notification When Payment Confirmed
Add notification with chat link when doctor confirms payment.

**File to Modify:** `server/src/controllers/appointmentPhase3Controller.js`

In `confirmPayment` function, add:
```javascript
await sendNotification(
  appointment.patientWalletAddress,
  'payment_confirmed',
  {
    title: 'Payment Confirmed - Ready to Chat!',
    message: 'Your payment has been confirmed. You can now chat with your doctor.',
    relatedId: appointment.id,
    relatedUserId: appointment.doctorWalletAddress, // For chat link
    priority: 'high',
    actionUrl: `/messages?userId=${appointment.doctorWalletAddress}`
  }
);
```

---

## 🚀 Current Status

### ✅ Already Working:
- Doctor receives notification when patient books
- Doctor can approve appointments
- Patient receives notification when approved
- Chat system is fully functional
- Video call system is fully functional
- Messages page accessible from sidebar
- Doctor has chat/video buttons on appointments

### 🔨 Needs Implementation:
1. Patient-side chat/video buttons on appointments
2. Enhanced notifications with action buttons
3. Direct chat link in payment confirmation notification
4. "Start Chat" button in appointment confirmation notification

---

## 📱 User Experience Flow

### For Patients:
```
Book Appointment 
  ↓
Get Notification (Approved)
  ↓
Make Payment
  ↓
Upload Receipt
  ↓
Get Notification (Payment Confirmed) → Click "Start Chat"
  ↓
Messages Page Opens → Chat with Doctor
```

### For Doctors:
```
Get Notification (New Request)
  ↓
Review & Approve
  ↓
Get Notification (Receipt Uploaded)
  ↓
Verify & Confirm Payment
  ↓
Go to Appointments → Click "Chat" Button
  ↓
Messages Page Opens → Chat with Patient
```

---

## 🎓 Quick Access Methods

### Patients Can Access Chat Via:
1. **Notification** → Click "Start Chat" (after payment confirmed)
2. **Appointments Page** → Click "Chat with Doctor" button
3. **Messages Page** → Click on doctor's conversation
4. **Dashboard** → "Recent Appointments" → Chat button

### Doctors Can Access Chat Via:
1. **Appointments Page** → Click "Chat" button ✅ (Already working)
2. **Messages Page** → Click on patient's conversation ✅
3. **Dashboard** → "Pending Approvals" → After approval → Chat button
4. **Notification** → Click notification → Go to appointment → Chat

---

## 💡 Best Practices

### For Patients:
- Wait for payment confirmation before trying to chat
- Check notifications regularly for updates
- Use Messages page to see all conversations
- Video calls require good internet connection

### For Doctors:
- Respond to appointment requests promptly
- Verify payment receipts carefully
- Use chat for quick consultations
- Use video calls for detailed examinations
- Keep payment settings updated in Settings page

---

## 🔧 Technical Implementation

### Backend (Already Done):
- ✅ Chat API endpoints
- ✅ Video call API endpoints
- ✅ Notification system
- ✅ Socket.io for real-time communication
- ✅ IPFS for file sharing

### Frontend (Mostly Done):
- ✅ Messages page
- ✅ Chat component
- ✅ Video call component
- ✅ Notification bell
- ✅ Doctor appointment buttons
- 🔨 Patient appointment buttons (needs adding)
- 🔨 Enhanced notification actions (needs adding)

---

## 📞 Support

If users have trouble:
1. Check internet connection
2. Refresh the page
3. Check notification permissions
4. Verify payment was confirmed
5. Try accessing via Messages page directly

---

*Last Updated: December 5, 2025*
*Status: Mostly Complete - Minor enhancements needed*
