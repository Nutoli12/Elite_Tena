# 💬🎥 Premium Consultations System

## Status: ✅ FULLY IMPLEMENTED AND TESTED

**Last Updated:** December 14, 2025

## Overview

Complete real-time chat and video consultation system for Elite-Tena Healthcare platform. Patients can request premium consultations with doctors, pay via Chapa or P2P methods, and engage in chat or video sessions.

## Test Results

All API endpoints tested and working:
- ✅ Request Chat Consultation (201 Created)
- ✅ Request Video Consultation (201 Created)
- ✅ Get User Consultations (200 OK)
- ✅ Submit P2P Payment Reference (200 OK)
- ✅ Doctor Verify Payment (200 OK)
- ✅ Get Consultation Details (200 OK)
- ✅ Join Consultation (200 OK)

## Features

### Chat Consultations
- 24-hour access to doctor via chat
- Real-time messaging with Socket.io
- Typing indicators
- Read receipts
- Message history

### Video Consultations
- Scheduled video calls via Daily.co
- Waiting room before scheduled time
- Professional video infrastructure
- Screen sharing support
- Call duration tracking

### Payment Options
1. **Chapa** - Card, Telebirr, CBE Birr via gateway
2. **P2P Telebirr** - Direct transfer to doctor
3. **P2P CBE Birr** - Direct bank transfer
4. **P2P Bank Transfer** - Traditional bank transfer

## Setup

### 1. Run Migration

```bash
node run-premium-consultations-migration.js
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Daily.co Video (Optional - for video consultations)
DAILY_API_KEY=your_daily_api_key
DAILY_DOMAIN=your-domain.daily.co

# Chapa (Already configured)
CHAPA_SECRET_KEY=your_chapa_key
```

### 3. Get Daily.co API Key

1. Sign up at https://www.daily.co/
2. Go to Dashboard → Developers
3. Copy your API key
4. Your domain is shown in the dashboard (e.g., `yourcompany.daily.co`)

## API Endpoints

### Consultation Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/premium-consultations/request` | Request new consultation |
| GET | `/api/premium-consultations` | Get user's consultations |
| GET | `/api/premium-consultations/:id` | Get consultation details |
| POST | `/api/premium-consultations/:id/join` | Join consultation |
| POST | `/api/premium-consultations/:id/end` | End consultation |
| POST | `/api/premium-consultations/:id/rate` | Rate consultation |

### Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/premium-consultations/:id/submit-payment` | Submit P2P payment reference |
| POST | `/api/premium-consultations/:id/pay-chapa` | Initialize Chapa payment |
| POST | `/api/premium-consultations/:id/verify-payment` | Doctor verifies payment |

### Chat Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/premium-consultations/:id/messages` | Send message |
| GET | `/api/premium-consultations/:id/messages` | Get messages |
| POST | `/api/premium-consultations/:id/messages/read` | Mark as read |
| GET | `/api/premium-consultations/:id/messages/unread` | Get unread count |
| POST | `/api/premium-consultations/:id/typing` | Typing indicator |

## Database Schema

### Tables Created

1. **premium_consultations** - Main consultation records
2. **consultation_messages** - Chat messages
3. **video_call_sessions** - Video call tracking
4. **consultation_availability** - Doctor availability slots

### DoctorPaymentSettings Columns Added

- `chat_consultation_fee` - Fee for chat consultations
- `video_consultation_fee` - Fee for video consultations
- `chat_duration_hours` - Chat access duration (default 24)
- `video_slot_duration_minutes` - Video call duration (default 30)
- `accepts_chat_consultations` - Enable/disable chat
- `accepts_video_consultations` - Enable/disable video

## Workflow

### Patient Flow

1. Patient selects doctor and consultation type (chat/video)
2. System shows fee and payment options
3. Patient pays via Chapa or submits P2P payment reference
4. Doctor verifies payment (for P2P)
5. Consultation is activated
6. Patient joins chat/video session
7. After completion, patient can rate

### Doctor Flow

1. Doctor receives consultation request notification
2. For P2P payments, doctor verifies payment received
3. System activates consultation
4. Doctor joins when ready
5. Doctor can add notes and end consultation

## Frontend Components

- `RequestConsultation.tsx` - Request form
- `P2PPaymentSubmit.tsx` - P2P payment submission
- `ChatConsultation.tsx` - Chat interface
- `VideoConsultation.tsx` - Video call interface
- `DoctorPaymentVerification.tsx` - Doctor verification queue
- `Consultations.tsx` - Main consultations page

## Socket Events

### Emitted Events
- `consultation_message` - New message
- `typing_indicator` - User typing
- `messages_read` - Messages marked as read

### Listened Events
- `identify` - User identification
- `join_chat` - Join consultation room

## Notes

- Video consultations require Daily.co configuration
- Chat works without Daily.co
- P2P payments require manual doctor verification
- Chapa payments auto-verify via webhook
- Consultations expire based on type (24h for chat, scheduled time + duration for video)
