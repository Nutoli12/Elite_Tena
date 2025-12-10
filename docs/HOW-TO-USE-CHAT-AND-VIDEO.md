# How to Use Chat and Video Call Components

## Quick Start Guide

The Chat and VideoCall components are ready to use. Here's how to integrate them into your pages.

## 1. Chat Component

### Import:
```tsx
import { Chat } from '../components/Chat';
```

### Basic Usage:
```tsx
const [showChat, setShowChat] = useState(false);

// In your JSX:
{showChat && (
  <Chat
    appointmentId={appointment.id}  // Optional: ties chat to appointment
    otherUserWallet={patientWallet}
    otherUserName="John Doe"
  />
)}

// Button to open chat:
<button onClick={() => setShowChat(true)}>
  <MessageSquare /> Chat
</button>
```

### Example Integration in Appointment View:
```tsx
// In DoctorAppointments.tsx or patient appointment view
import { Chat } from '../../components/Chat';

const [selectedChat, setSelectedChat] = useState<{
  wallet: string;
  name: string;
  appointmentId?: string;
} | null>(null);

// Add chat button to each appointment:
<button
  onClick={() => setSelectedChat({
    wallet: appointment.patientWalletAddress,
    name: appointment.patientName,
    appointmentId: appointment.id
  })}
  className="btn-secondary"
>
  <MessageSquare className="w-4 h-4" />
  Chat
</button>

// Render chat modal:
{selectedChat && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Chat with {selectedChat.name}</h2>
        <button onClick={() => setSelectedChat(null)}>
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Chat
          appointmentId={selectedChat.appointmentId}
          otherUserWallet={selectedChat.wallet}
          otherUserName={selectedChat.name}
        />
      </div>
    </div>
  </div>
)}
```

## 2. Video Call Component

### Import:
```tsx
import { VideoCall } from '../components/VideoCall';
```

### Basic Usage:
```tsx
const [showVideoCall, setShowVideoCall] = useState(false);
const [callData, setCallData] = useState(null);

// Start a video call:
const startVideoCall = async () => {
  try {
    const response = await axios.post('/video-calls/initiate', {
      initiatorWallet: user.walletAddress,
      receiverWallet: patientWallet,
      appointmentId: appointment.id
    });
    
    setCallData(response.data.data);
    setShowVideoCall(true);
  } catch (error) {
    console.error('Failed to start call:', error);
    alert('Failed to start video call');
  }
};

// In your JSX:
{showVideoCall && callData && (
  <VideoCall
    callId={callData.id}
    roomId={callData.roomId}
    otherUserWallet={patientWallet}
    otherUserName="John Doe"
    isInitiator={true}
    onCallEnd={() => {
      setShowVideoCall(false);
      setCallData(null);
    }}
  />
)}

// Button to start call:
<button onClick={startVideoCall}>
  <Video /> Start Video Call
</button>
```

### Example Integration in Consultation:
```tsx
// In ConsultationRoom.tsx or similar
import { VideoCall } from '../../components/VideoCall';
import { Video, MessageSquare } from 'lucide-react';

const [activeView, setActiveView] = useState<'consultation' | 'video' | 'chat'>('consultation');
const [videoCallData, setVideoCallData] = useState(null);

// Start video consultation
const startVideoConsultation = async () => {
  const response = await axios.post('/video-calls/initiate', {
    initiatorWallet: user.walletAddress,
    receiverWallet: appointment.patientWalletAddress,
    appointmentId: appointment.id
  });
  
  setVideoCallData(response.data.data);
  setActiveView('video');
};

// Render based on active view:
{activeView === 'video' && videoCallData && (
  <VideoCall
    callId={videoCallData.id}
    roomId={videoCallData.roomId}
    otherUserWallet={appointment.patientWalletAddress}
    otherUserName={patientName}
    isInitiator={true}
    onCallEnd={() => setActiveView('consultation')}
  />
)}

{activeView === 'chat' && (
  <div className="h-screen">
    <Chat
      appointmentId={appointment.id}
      otherUserWallet={appointment.patientWalletAddress}
      otherUserName={patientName}
    />
  </div>
)}

// Control buttons:
<div className="flex gap-2">
  <button onClick={startVideoConsultation}>
    <Video /> Video Call
  </button>
  <button onClick={() => setActiveView('chat')}>
    <MessageSquare /> Chat
  </button>
</div>
```

## 3. Quick Integration - Add to Existing Pages

### A. Add to Doctor Dashboard (DoctorDashboard.tsx):
```tsx
// Add a "Messages" section showing recent chats
import { MessageSquare } from 'lucide-react';

<div className="medical-card p-6">
  <h3 className="text-lg font-bold mb-4">Recent Messages</h3>
  {/* List of recent conversations */}
  <button onClick={() => navigate('/messages')}>
    View All Messages
  </button>
</div>
```

### B. Add to Appointment Details:
```tsx
// In any appointment detail view, add action buttons:
<div className="flex gap-2">
  <button onClick={handleStartVideoCall} className="btn-primary">
    <Video className="w-4 h-4" />
    Start Video Call
  </button>
  <button onClick={handleOpenChat} className="btn-secondary">
    <MessageSquare className="w-4 h-4" />
    Open Chat
  </button>
</div>
```

### C. Create a Messages Page:
```tsx
// Create: elite-tena-frontend/src/pages/Messages.tsx
import React, { useState, useEffect } from 'react';
import { Chat } from '../components/Chat';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const response = await axios.get(`/chat/conversations/${user.walletAddress}`);
    setConversations(response.data.data);
  };

  return (
    <div className="flex h-screen">
      {/* Conversation List */}
      <div className="w-1/3 border-r">
        <h2 className="p-4 font-bold">Messages</h2>
        {conversations.map(conv => (
          <div
            key={conv.other_user}
            onClick={() => setSelectedConversation(conv)}
            className="p-4 hover:bg-gray-100 cursor-pointer"
          >
            <p className="font-semibold">{conv.profileData?.fullName}</p>
            <p className="text-sm text-gray-600">{conv.last_message_content}</p>
            {conv.unread_count > 0 && (
              <span className="badge">{conv.unread_count}</span>
            )}
          </div>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {selectedConversation ? (
          <Chat
            otherUserWallet={selectedConversation.other_user}
            otherUserName={selectedConversation.profileData?.fullName}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

// Add route in App.tsx:
<Route path="/messages" element={<Messages />} />
```

## 4. Receiving Incoming Calls

To handle incoming video calls, add a listener in your layout or main component:

```tsx
// In HealthcareLayout.tsx or App.tsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { VideoCall } from '../components/VideoCall';

const [incomingCall, setIncomingCall] = useState(null);
const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);

useEffect(() => {
  const socket = io('http://localhost:3003');
  
  socket.emit('identify', user?.walletAddress);
  
  socket.on('incoming_call', (data) => {
    setIncomingCall(data);
    setShowIncomingCallModal(true);
  });
  
  return () => socket.disconnect();
}, [user]);

// Incoming call modal:
{showIncomingCallModal && incomingCall && (
  <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
    <div className="bg-white rounded-2xl p-8 text-center">
      <Video className="w-16 h-16 mx-auto mb-4 text-medical-600" />
      <h2 className="text-2xl font-bold mb-2">Incoming Call</h2>
      <p className="text-gray-600 mb-6">{incomingCall.initiatorName}</p>
      <div className="flex gap-4">
        <button
          onClick={async () => {
            await axios.post(`/video-calls/${incomingCall.callId}/answer`, {
              userWallet: user.walletAddress
            });
            setShowIncomingCallModal(false);
            // Show video call component
          }}
          className="btn-primary"
        >
          Answer
        </button>
        <button
          onClick={async () => {
            await axios.post(`/video-calls/${incomingCall.callId}/reject`, {
              userWallet: user.walletAddress
            });
            setShowIncomingCallModal(false);
            setIncomingCall(null);
          }}
          className="btn-secondary"
        >
          Decline
        </button>
      </div>
    </div>
  </div>
)}
```

## 5. Component Props Reference

### Chat Component Props:
```typescript
interface ChatProps {
  appointmentId?: string;      // Optional: ties chat to appointment
  otherUserWallet: string;      // Required: who you're chatting with
  otherUserName: string;        // Required: display name
}
```

### VideoCall Component Props:
```typescript
interface VideoCallProps {
  callId?: string;              // Optional: existing call ID
  roomId?: string;              // Optional: room identifier
  otherUserWallet: string;      // Required: who you're calling
  otherUserName: string;        // Required: display name
  isInitiator?: boolean;        // Optional: are you starting the call?
  onCallEnd?: () => void;       // Optional: callback when call ends
}
```

## 6. Testing

### Test Chat:
1. Login as Doctor
2. Go to appointments
3. Click "Chat" button on an appointment
4. Send a message
5. Login as Patient (different browser/incognito)
6. See message appear in real-time

### Test Video Call:
1. Login as Doctor
2. Click "Start Video Call" on an appointment
3. Login as Patient (different browser)
4. Accept incoming call
5. Both should see each other's video

## 7. Troubleshooting

### Chat not working:
- Check Socket.io connection in console
- Verify backend is running on port 3003
- Check user is authenticated

### Video call not connecting:
- Allow camera/microphone permissions
- Check both users are on same network or have STUN access
- Verify WebRTC is supported in browser

### No incoming call notification:
- Check Socket.io connection
- Verify user is identified (`socket.emit('identify', wallet)`)
- Check notification permissions

## Summary

The Chat and VideoCall components are **ready to use** - you just need to:
1. Import them where needed
2. Add buttons to trigger them
3. Pass the required props (wallet addresses and names)

They handle all the complex WebRTC, Socket.io, and real-time messaging automatically!
