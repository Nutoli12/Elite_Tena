import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import videoCallService from '../services/videoCallService';
import type { VideoCall } from '../services/videoCallService';
import VideoCallHistory from '../components/video/VideoCallHistory';
import IncomingCallModal from '../components/video/IncomingCallModal';

const VideoCalls: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videoCalls, setVideoCalls] = useState<VideoCall[]>([]);
  const [activeCalls, setActiveCalls] = useState<VideoCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<VideoCall | null>(null);

  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    loadVideoCalls();
    loadActiveCalls();
  }, [user?.walletAddress]);

  const loadVideoCalls = async () => {
    if (!user?.walletAddress) return;
    
    try {
      const response = await videoCallService.getCallHistory(user.walletAddress);
      setVideoCalls(response.data || []);
    } catch (error) {
      console.error('Failed to load video calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveCalls = async () => {
    if (!user?.walletAddress) return;
    
    try {
      const response = await videoCallService.getActiveCalls(user.walletAddress);
      setActiveCalls(response.data || []);
    } catch (error) {
      console.error('Failed to load active calls:', error);
    }
  };

  const handleStartVideoCall = () => {
    // Navigate to doctor selection for patients, or show doctor's available patients
    if (isDoctor) {
      // For doctors, show a list of patients they can call
      navigate('/patient/doctor-selection?mode=video-call');
    } else {
      // For patients, go to doctor selection for video calls
      navigate('/patient/doctor-selection?mode=video-call');
    }
  };

  const handleJoinCall = async (call: VideoCall) => {
    try {
      await videoCallService.answerCall(call.id, user?.walletAddress || '');
      // Navigate to video call interface
      navigate(`/video-call/${call.id}`);
    } catch (error) {
      console.error('Failed to join call:', error);
    }
  };

  const getCallStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      initiated: { color: 'bg-blue-100 text-blue-700', label: 'Calling...' },
      ringing: { color: 'bg-yellow-100 text-yellow-700', label: 'Ringing' },
      active: { color: 'bg-green-100 text-green-700', label: 'Active' },
      ended: { color: 'bg-gray-100 text-gray-700', label: 'Ended' },
      missed: { color: 'bg-orange-100 text-orange-700', label: 'Missed' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      failed: { color: 'bg-red-100 text-red-700', label: 'Failed' }
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-3xl">🎥</span>
              Video Calls
            </h1>
            <p className="text-gray-600">
              {isDoctor ? 'Make video calls to your patients' : 'Video calls with doctors'}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleStartVideoCall}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>📞</span>
              Start Video Call
            </button>
          </div>
        </div>

        {/* Active Calls */}
        {activeCalls.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              Active Calls
            </h2>
            <div className="space-y-3">
              {activeCalls.map((call) => {
                const isInitiator = call.initiatorWallet.toLowerCase() === user?.walletAddress?.toLowerCase();
                const otherParty = isInitiator ? call.receiver : call.initiator;
                const otherName = otherParty?.name || otherParty?.fullName || 'Unknown';

                return (
                  <div key={call.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl">🎥</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{otherName}</h3>
                        <p className="text-sm text-gray-600">
                          {isInitiator ? 'Outgoing call' : 'Incoming call'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getCallStatusBadge(call.status)}
                      <button
                        onClick={() => handleJoinCall(call)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Join Call
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Call History */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Call History</h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading call history...</p>
            </div>
          ) : videoCalls.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📞</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Video Calls Yet</h3>
              <p className="text-gray-600 mb-4">
                {isDoctor 
                  ? 'You haven\'t made any video calls to patients yet.' 
                  : 'You haven\'t made any video calls with doctors yet.'}
              </p>
              <button
                onClick={handleStartVideoCall}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Your First Video Call
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {videoCalls.map((call) => {
                const isInitiator = call.initiatorWallet.toLowerCase() === user?.walletAddress?.toLowerCase();
                const otherParty = isInitiator ? call.receiver : call.initiator;
                const otherName = otherParty?.name || otherParty?.fullName || 'Unknown';

                return (
                  <div key={call.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xl">
                            {isInitiator ? '📞' : '📱'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{otherName}</h3>
                          <p className="text-sm text-gray-600">
                            {isInitiator ? 'Outgoing call' : 'Incoming call'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(call.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getCallStatusBadge(call.status)}
                        {call.duration && (
                          <span className="text-sm text-gray-500">
                            {Math.floor(call.duration / 60)}m {call.duration % 60}s
                          </span>
                        )}
                        {call.status === 'ended' && call.quality?.userRating && (
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < call.quality.userRating ? 'text-yellow-400' : 'text-gray-300'}>
                                ⭐
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Incoming Call Modal */}
      {showIncomingCall && incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAnswer={() => handleJoinCall(incomingCall)}
          onReject={() => {
            setShowIncomingCall(false);
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
};

export default VideoCalls;