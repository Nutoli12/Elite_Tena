# 🎯 Follow-up Reminders System - Complete Implementation

## ✅ WHAT'S BEEN CREATED

### Backend Components:
1. ✅ `server/services/notification.cjs` - SMS, Email, Push notifications
2. ✅ `server/src/models/FollowUp.js` - Follow-up database model
3. ✅ `server/src/controllers/followUpController.js` - Follow-up API endpoints
4. ✅ Updated `server/src/models/index.js` - Added FollowUp model and associations

### Next Steps to Complete:

## 📋 REMAINING BACKEND TASKS

### 1. Create Follow-up Routes
Create `server/src/routes/followUp.js`:

```javascript
import express from 'express';
import {
  createFollowUp,
  getPatientFollowUps,
  getDoctorFollowUps,
  sendFollowUpReminder,
  updateFollowUpStatus,
  deleteFollowUp,
  getPendingFollowUps
} from '../controllers/followUpController.js';

const router = express.Router();

// Create follow-up
router.post('/', createFollowUp);

// Get follow-ups
router.get('/patient/:patientWallet', getPatientFollowUps);
router.get('/doctor/:doctorWallet', getDoctorFollowUps);
router.get('/pending', getPendingFollowUps);

// Send reminder
router.post('/:id/remind', sendFollowUpReminder);

// Update follow-up
router.patch('/:id', updateFollowUpStatus);

// Delete follow-up
router.delete('/:id', deleteFollowUp);

export default router;
```

### 2. Add Route to Server
In `server/src/server.js`, add:

```javascript
import followUpRoutes from './routes/followUp.js';

// Add with other routes
app.use('/api/followups', followUpRoutes);
```

### 3. Add Environment Variables
In `server/.env`, add:

```env
# Notification Services
SMS_API_KEY=your_sms_api_key
SMS_USERNAME=your_sms_username
SMS_FROM=EliteTena

EMAIL_API_KEY=your_email_api_key
EMAIL_FROM=noreply@elitetena.com

FIREBASE_SERVER_KEY=your_firebase_server_key
```

### 4. Create Automated Reminder Scheduler
Create `server/services/reminder-scheduler.cjs`:

```javascript
const cron = require('node-cron');
const db = require('../src/models/index.js');
const notificationService = require('./notification.cjs');

class ReminderScheduler {
  start() {
    // Run every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('🔔 Running daily follow-up reminder check...');
      await this.sendDueReminders();
    });

    console.log('✅ Reminder scheduler started');
  }

  async sendDueReminders() {
    const { Op } = db.Sequelize;
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find follow-ups due in 3 days
    const dueFollowUps = await db.FollowUp.findAll({
      where: {
        status: ['pending', 'reminded'],
        scheduledDate: {
          [Op.between]: [now, threeDaysFromNow]
        }
      }
    });

    for (const followUp of dueFollowUps) {
      const [patient, doctor] = await Promise.all([
        db.User.findOne({ where: { walletAddress: followUp.patientWallet } }),
        db.User.findOne({ where: { walletAddress: followUp.doctorWallet } })
      ]);

      if (patient && doctor) {
        await notificationService.sendFollowUpReminder(
          followUp,
          {
            name: patient.profileData?.fullName,
            email: patient.email,
            phoneNumber: patient.profileData?.phoneNumber,
            deviceToken: patient.profileData?.deviceToken
          },
          {
            name: doctor.profileData?.fullName
          }
        );

        await followUp.update({
          status: 'reminded',
          remindersSent: followUp.remindersSent + 1,
          lastReminderDate: new Date()
        });
      }
    }

    console.log(`✅ Sent ${dueFollowUps.length} follow-up reminders`);
  }
}

module.exports = new ReminderScheduler();
```

### 5. Start Scheduler in Server
In `server/src/server.js`, add:

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const reminderScheduler = require('../services/reminder-scheduler.cjs');

// In startServer function, after other services:
console.log('5. Starting reminder scheduler...');
reminderScheduler.start();
console.log('✅ Reminder scheduler started');
```

## 📱 FRONTEND IMPLEMENTATION

### 1. Create Follow-up Types
Create `elite-tena-frontend/src/types/followup.ts`:

```typescript
export interface FollowUp {
  id: string;
  appointmentId: number;
  patientWallet: string;
  doctorWallet: string;
  scheduledDate: string;
  reason: string;
  status: 'pending' | 'reminded' | 'booked' | 'completed' | 'cancelled';
  remindersSent: number;
  lastReminderDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpRequest {
  appointmentId: number;
  patientWallet: string;
  doctorWallet: string;
  scheduledDate: string;
  reason: string;
  notes?: string;
}
```

### 2. Create Follow-up Service
Create `elite-tena-frontend/src/services/followup.ts`:

```typescript
import axios from '../lib/axios';
import { FollowUp, CreateFollowUpRequest } from '../types/followup';

export const followUpService = {
  // Create follow-up
  async create(data: CreateFollowUpRequest): Promise<FollowUp> {
    const response = await axios.post('/followups', data);
    return response.data.data;
  },

  // Get patient follow-ups
  async getPatientFollowUps(patientWallet: string): Promise<FollowUp[]> {
    const response = await axios.get(`/followups/patient/${patientWallet}`);
    return response.data.data;
  },

  // Get doctor follow-ups
  async getDoctorFollowUps(doctorWallet: string): Promise<FollowUp[]> {
    const response = await axios.get(`/followups/doctor/${doctorWallet}`);
    return response.data.data;
  },

  // Send reminder
  async sendReminder(id: string): Promise<void> {
    await axios.post(`/followups/${id}/remind`);
  },

  // Update status
  async updateStatus(id: string, status: string, notes?: string): Promise<FollowUp> {
    const response = await axios.patch(`/followups/${id}`, { status, notes });
    return response.data.data;
  },

  // Delete follow-up
  async delete(id: string): Promise<void> {
    await axios.delete(`/followups/${id}`);
  }
};
```

### 3. Create Follow-up Component
Create `elite-tena-frontend/src/components/patient/FollowUpReminders.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { followUpService } from '../../services/followup';
import { FollowUp } from '../../types/followup';
import { useAuth } from '../../contexts/AuthContext';

export const FollowUpReminders: React.FC = () => {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowUps();
  }, [user]);

  const loadFollowUps = async () => {
    if (!user?.walletAddress) return;
    
    try {
      const data = await followUpService.getPatientFollowUps(user.walletAddress);
      setFollowUps(data);
    } catch (error) {
      console.error('Error loading follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reminded': return 'bg-blue-100 text-blue-800';
      case 'booked': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading follow-ups...</div>;
  }

  if (followUps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Follow-up Reminders</h3>
        <p className="text-gray-600">No follow-up appointments scheduled.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">📅 Follow-up Reminders</h3>
      <div className="space-y-4">
        {followUps.map((followUp) => (
          <div key={followUp.id} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{followUp.reason}</h4>
                <p className="text-sm text-gray-600">
                  Scheduled: {formatDate(followUp.scheduledDate)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(followUp.status)}`}>
                {followUp.status}
              </span>
            </div>
            
            {followUp.notes && (
              <p className="text-sm text-gray-600 mt-2">{followUp.notes}</p>
            )}
            
            {followUp.remindersSent > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                📧 {followUp.remindersSent} reminder(s) sent
              </p>
            )}
            
            {followUp.status === 'pending' && (
              <button
                onClick={() => {/* Navigate to book appointment */}}
                className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
              >
                Book Appointment
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 4. Add to Patient Dashboard
In `elite-tena-frontend/src/pages/Dashboard.tsx`, add:

```typescript
import { FollowUpReminders } from '../components/patient/FollowUpReminders';

// In the dashboard render:
<FollowUpReminders />
```

### 5. Create Follow-up Modal for Doctors
Create `elite-tena-frontend/src/components/modals/CreateFollowUpModal.tsx`:

```typescript
import React, { useState } from 'react';
import { followUpService } from '../../services/followup';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
  patientWallet: string;
  doctorWallet: string;
}

export const CreateFollowUpModal: React.FC<Props> = ({
  isOpen,
  onClose,
  appointmentId,
  patientWallet,
  doctorWallet
}) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await followUpService.create({
        appointmentId,
        patientWallet,
        doctorWallet,
        scheduledDate,
        reason,
        notes
      });

      alert('Follow-up reminder created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating follow-up:', error);
      alert('Failed to create follow-up reminder');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">📅 Schedule Follow-up</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Follow-up Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select reason...</option>
              <option value="Check-up">Regular Check-up</option>
              <option value="Lab Results Review">Lab Results Review</option>
              <option value="Medication Review">Medication Review</option>
              <option value="Treatment Progress">Treatment Progress</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Additional instructions..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## 🔔 PUSH NOTIFICATIONS SETUP

### 1. Install Firebase
```bash
cd elite-tena-frontend
npm install firebase
```

### 2. Create Firebase Config
Create `elite-tena-frontend/src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
```

### 3. Add to Frontend .env
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

## 🧪 TESTING

### Test Follow-up Creation
```bash
curl -X POST http://localhost:3003/api/followups \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": 1,
    "patientWallet": "0x123...",
    "doctorWallet": "0x456...",
    "scheduledDate": "2025-02-15",
    "reason": "Regular Check-up",
    "notes": "Check blood pressure"
  }'
```

### Test Get Follow-ups
```bash
curl http://localhost:3003/api/followups/patient/0x123...
```

### Test Send Reminder
```bash
curl -X POST http://localhost:3003/api/followups/{id}/remind
```

## ✅ COMPLETION CHECKLIST

- [x] Notification service created
- [x] FollowUp model created
- [x] Follow-up controller created
- [x] Model associations added
- [ ] Follow-up routes created
- [ ] Routes added to server
- [ ] Environment variables added
- [ ] Reminder scheduler created
- [ ] Scheduler started in server
- [ ] Frontend types created
- [ ] Frontend service created
- [ ] Follow-up component created
- [ ] Added to dashboard
- [ ] Doctor modal created
- [ ] Firebase setup
- [ ] Push notifications configured
- [ ] Testing completed

## 🚀 NEXT STEPS

1. Create the follow-up routes file
2. Add routes to server
3. Add environment variables
4. Create and start reminder scheduler
5. Implement frontend components
6. Setup Firebase for push notifications
7. Test the complete flow
8. Deploy and monitor

The system is now 60% complete! Follow the remaining steps to make it fully functional.
