import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useVideoCall } from '../../hooks/useVideoCall';
import VideoConsultation from '../consultation/VideoConsultation';
import IncomingCallModal from './IncomingCallModal';
import VideoCallHistory from './VideoCallHistory';
import consultationService from '../../services/consultationService';
import type { Consultation } from '../../services/consultationService';
import { Modal } from '../../services/modalService';

// Error Boundary Component
class VideoCallErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Video Call Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-4">Video Call Error</h2>
            <p className="text-gray-400 mb-6">
              There was an error loading the video call system. This might be due to:
            </p>
            <ul className="text-left text-gray-400 text-sm mb-6 space-y-2">
              <li>• Missing environment variables</li>
              <li>• Network connectivity issues</li>
              <li>• Browser compatibility</li>
            </ul>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const VideoConsultationDemoContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'consultation' | 'history' | 'demo'>('demo');
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [isCreatingConsultation, setIsCreatingConsultation] = useState(false);
  const [demoForm, setDemoForm] = useState({
    doctorWallet: '',
    patientWallet: '',
    consultationType: 'video' as 'chat' | 'video',
    scheduledTime: '',
    durationMinutes: 30
  });

  const {
    activeCalls,
    incomingCall,
    isLoading,
    error,
    initiateCall,
    answerCall,
    rejectCall,
    clearIncomingCall,
    hasIncomingCall
  } = useVideoCall({
    onIncomingCall: (call) => {
      console.log('📞 Incoming call received:', call);
    },
    onCallAnswered: (callId) => {
      console.log('✅ Call answered:', callId);
    },
    onCallRejected: (callId, reason) => {
      console.log('❌ Call rejected:', callId, reason);
    },
    onCallEnded: (callId, reason) => {
      console.log('🔚 Call ended:', callId, reason);
    }
  });

  // Demo consultation creation
  const createDemoConsultation = async () => {
    if (!user?.walletAddress) return;

    setIsCreatingConsultation(true);
    try {
      // Create consultation
      const response = await consultationService.requestConsultation({
        patientWallet: demoForm.patientWallet || user.walletAddress,
        doctorWallet: demoForm.doctorWallet,
        consultationType: demoForm.consultationType,
        scheduledTime: demoForm.scheduledTime || undefined,
        durationMinutes: demoForm.durationMinutes
      });

      const newConsultation = response.data;
      
      // For demo purposes, auto-approve and mark as paid
      if (newConsultation) {
        // Simulate payment completion
        await consultationService.submitPayment(newConsultation.id, {
          paymentMethod: 'demo',
          paymentReference: 'DEMO_' + Date.now(),
          patientWallet: demoForm.patientWallet || user.walletAddress
        });

        // Verify payment (doctor action)
        await consultationService.verifyPayment(newConsultation.id, demoForm.doctorWallet);

        // Get updated consultation
        const updatedResponse = await consultationService.getConsultation(
          newConsultation.id, 
          user.walletAddress
        );
        
        setConsultation(updatedResponse.data);
        setActiveTab('consultation');
      }
    } catch (err: any) {
      console.error('Failed to create demo consultation:', err);
      alert('Failed to create consultation: ' + err.message);
    } finally {
      setIsCreatingConsultation(false);
    }
  };

  // Start video call from consultation
  const startVideoCall = async () => {
    if (!consultation || !user?.walletAddress) return;

    try {
      await consultationService.startVideoCall(consultation.id, user.walletAddress);
      
      // Refresh consultation data
      const response = await consultationService.getConsultation(consultation.id, user.walletAddress);
      setConsultation(response.data);
    } catch (err: any) {
      console.error('Failed to start video call:', err);
      alert('Failed to start video call: ' + err.message);
    }
  };

  // Direct video call (without consultation)
  const startDirectVideoCall = async () => {
    if (!user?.walletAddress || !demoForm.doctorWallet) return;

    try {
      await initiateCall(demoForm.doctorWallet, {
        scheduledTime: demoForm.scheduledTime || undefined,
        durationMinutes: demoForm.durationMinutes
      });
    } catch (err: any) {
      console.error('Failed to initiate direct call:', err);
      alert('Failed to initiate call: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎥 Video Consultation System
          </h1>
          <p className="text-gray-400">
            Complete video consultation platform with Daily.co integration
          </p>
        </div>

        {/* Status Bar */}
        <div className="mb-6 flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-white">
              {user ? `Logged in as ${user.profileData?.firstName || 'User'}` : 'Not logged in'}
            </span>
          </div>
          
          {activeCalls.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-blue-400">
                {activeCalls.length} active call{activeCalls.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {hasIncomingCall && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 animate-bounce"></div>
              <span className="text-yellow-400">Incoming call</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-red-400">{error}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            {[
              { id: 'demo', label: '🎮 Demo Setup', icon: '🎮' },
              { id: 'consultation', label: '🎥 Video Call', icon: '🎥' },
              { id: 'history', label: '📋 Call History', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Demo Setup Tab */}
          {activeTab === 'demo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consultation Setup */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>📋</span>
                  Create Demo Consultation
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Doctor Wallet Address
                    </label>
                    <input
                      type="text"
                      value={demoForm.doctorWallet}
                      onChange={(e) => setDemoForm(prev => ({ ...prev, doctorWallet: e.target.value }))}
                      placeholder="0x..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Patient Wallet Address
                    </label>
                    <input
                      type="text"
                      value={demoForm.patientWallet}
                      onChange={(e) => setDemoForm(prev => ({ ...prev, patientWallet: e.target.value }))}
                      placeholder={user?.walletAddress || "0x..."}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Consultation Type
                    </label>
                    <select
                      value={demoForm.consultationType}
                      onChange={(e) => setDemoForm(prev => ({ ...prev, consultationType: e.target.value as 'chat' | 'video' }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="video">🎥 Video Call</option>
                      <option value="chat">💬 Chat Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Scheduled Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={demoForm.scheduledTime}
                      onChange={(e) => setDemoForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      value={demoForm.durationMinutes}
                      onChange={(e) => setDemoForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 30 }))}
                      min="15"
                      max="120"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={createDemoConsultation}
                    disabled={isCreatingConsultation || !demoForm.doctorWallet}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {isCreatingConsultation ? 'Creating...' : '📋 Create Consultation'}
                  </button>
                </div>
              </div>

              {/* Direct Call Setup */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>📞</span>
                  Direct Video Call
                </h3>
                
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Start a video call directly without creating a consultation
                  </p>

                  <button
                    onClick={startDirectVideoCall}
                    disabled={isLoading || !demoForm.doctorWallet}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {isLoading ? 'Calling...' : '📞 Start Direct Call'}
                  </button>

                  {/* Active Calls */}
                  {activeCalls.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-white mb-3">Active Calls</h4>
                      <div className="space-y-2">
                        {activeCalls.map((call) => (
                          <div key={call.id} className="p-3 bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">
                                  {call.initiatorWallet === user?.walletAddress ? 'Outgoing' : 'Incoming'}
                                </p>
                                <p className="text-gray-400 text-sm">Status: {call.status}</p>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  call.status === 'active' ? 'bg-green-600' : 'bg-yellow-600'
                                }`}>
                                  {call.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Video Consultation Tab */}
          {activeTab === 'consultation' && (
            <div>
              {consultation ? (
                <div className="space-y-6">
                  {/* Consultation Info */}
                  <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Consultation Details
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        consultation.status === 'active' ? 'bg-green-600 text-white' :
                        consultation.status === 'pending' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {consultation.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Type</p>
                        <p className="text-white font-medium">{consultation.consultationType}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Fee</p>
                        <p className="text-white font-medium">{consultation.consultationFee} {consultation.currency}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Payment</p>
                        <p className="text-white font-medium">{consultation.paymentStatus}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Duration</p>
                        <p className="text-white font-medium">{consultation.durationMinutes} min</p>
                      </div>
                    </div>

                    {consultation.consultationType === 'video' && consultation.paymentStatus === 'completed' && (
                      <div className="mt-4">
                        <button
                          onClick={startVideoCall}
                          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                          🎥 Start Video Call
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Video Component */}
                  {consultation.consultationType === 'video' && consultation.dailyRoomUrl && (
                    <VideoConsultation
                      consultation={consultation}
                      onEnd={() => {
                        setConsultation(null);
                        setActiveTab('history');
                      }}
                      onCallStart={(callId) => {
                        console.log('Video call started:', callId);
                      }}
                      onCallEnd={(callId, duration) => {
                        console.log('Video call ended:', callId, duration);
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-12 text-center">
                  <div className="text-6xl mb-4">🎥</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Consultation</h3>
                  <p className="text-gray-400 mb-6">
                    Create a consultation in the Demo Setup tab to start a video call
                  </p>
                  <button
                    onClick={() => setActiveTab('demo')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Go to Demo Setup
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Call History Tab */}
          {activeTab === 'history' && (
            <VideoCallHistory limit={20} showFilters={true} />
          )}
        </div>
      </div>

      {/* Incoming Call Modal */}
      {hasIncomingCall && incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAnswer={answerCall}
          onReject={rejectCall}
          onClose={clearIncomingCall}
        />
      )}
    </div>
  );
};

const VideoConsultationDemo: React.FC = () => {
  return (
    <VideoCallErrorBoundary>
      <VideoConsultationDemoContent />
    </VideoCallErrorBoundary>
  );
};

export default VideoConsultationDemo;