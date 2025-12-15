import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import videoCallService from '../services/videoCallService';
import { useNotification } from '../contexts/NotificationContext';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Settings,
  MessageCircle,
  Users,
  Clock,
  Star
} from 'lucide-react';

interface VideoCallState {
  callId: string;
  doctorName?: string;
  isInitiator?: boolean;
}

const VideoCall: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const state = location.state as VideoCallState;
  
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (callId) {
      loadCallDetails();
    }
  }, [callId]);

  useEffect(() => {
    if (callStatus === 'active') {
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      // Clear duration counter
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  const loadCallDetails = async () => {
    try {
      const response = await videoCallService.getCall(callId!);
      if (response.success) {
        setCall(response.data);
        setCallStatus(response.data.status === 'active' ? 'active' : 'ringing');
        
        // If call has Jitsi integration, load the video interface
        if (response.data.metadata?.jitsiRoom?.roomUrl) {
          loadJitsiVideoInterface(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to load call details:', error);
      showNotification('Failed to load call details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadJitsiVideoInterface = async (callData: any) => {
    try {
      // Get Jitsi Meet URL
      const urlResponse = await videoCallService.getJitsiUrl(callId!, user?.walletAddress || '');
      
      if (urlResponse.success && urlResponse.data.joinUrl) {
        console.log('Jitsi Meet join URL:', urlResponse.data.joinUrl);
        
        // Create Jitsi Meet iframe for real video call
        const videoContainer = document.getElementById('jitsi-video-container');
        if (videoContainer) {
          videoContainer.innerHTML = `
            <iframe
              src="${urlResponse.data.joinUrl}"
              width="100%"
              height="100%"
              frameborder="0"
              allow="camera; microphone; fullscreen; speaker; display-capture"
              style="border-radius: 8px; border: none;"
              title="Elite-Tena Video Consultation"
            ></iframe>
          `;
        }
        
        setCallStatus('active');
        showNotification('Connected to Jitsi Meet video call! 🎥', 'success');
      }
    } catch (error) {
      console.error('Failed to load Jitsi interface:', error);
      // Fallback to basic interface
      setCallStatus('active');
      showNotification('Video call started (fallback mode)', 'info');
    }
  };

  const handleEndCall = async () => {
    try {
      await videoCallService.endCall(
        callId!,
        user?.walletAddress || '',
        'ended_by_user'
      );
      
      setCallStatus('ended');
      showNotification('Call ended', 'info');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/video-calls');
      }, 2000);
    } catch (error) {
      console.error('Failed to end call:', error);
      showNotification('Failed to end call', 'error');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, you'd control the actual audio stream
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // In a real implementation, you'd control the actual video stream
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        sender: user?.walletAddress,
        senderName: user?.fullName || 'You',
        message: newMessage,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // In a real implementation, you'd send this via Socket.io
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to video call...</p>
        </div>
      </div>
    );
  }

  if (callStatus === 'ended') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Call Ended</h2>
          <p className="text-gray-300 mb-4">Duration: {formatDuration(duration)}</p>
          <button
            onClick={() => navigate('/video-calls')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Video Calls
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold">
              {state?.doctorName || call?.doctor?.name || 'Video Call'}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <div className={`w-2 h-2 rounded-full ${
                callStatus === 'active' ? 'bg-green-500' : 
                callStatus === 'ringing' ? 'bg-yellow-500' : 'bg-gray-500'
              }`}></div>
              <span className="capitalize">{callStatus}</span>
              {callStatus === 'active' && (
                <>
                  <span>•</span>
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {callStatus === 'ringing' ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Phone className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {state?.isInitiator ? 'Calling...' : 'Incoming Call'}
              </h2>
              <p className="text-gray-300 mb-6">
                {state?.isInitiator 
                  ? `Calling ${state.doctorName || 'Doctor'}...`
                  : `${state.doctorName || 'Doctor'} is calling you`
                }
              </p>
              {!state?.isInitiator && (
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={() => setCallStatus('active')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Answer</span>
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>Decline</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex">
            {/* Main Video Area */}
            <div className="flex-1 relative bg-gray-800">
              {/* Jitsi Meet Video Interface */}
              <div id="jitsi-video-container" className="w-full h-full">
                {/* Fallback content while loading */}
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-16 h-16 text-gray-400" />
                    </div>
                    <p className="font-semibold">{state?.doctorName || state?.patientName || 'Connecting...'}</p>
                    <p className="text-sm text-gray-300 mt-2">Loading video interface...</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Sidebar */}
            {showChat && (
              <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Chat</h3>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="text-white">
                      <div className="text-sm text-gray-300">{msg.senderName}</div>
                      <div className="bg-gray-700 p-2 rounded-lg">{msg.message}</div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>
          
          <button
            onClick={handleEndCall}
            className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;