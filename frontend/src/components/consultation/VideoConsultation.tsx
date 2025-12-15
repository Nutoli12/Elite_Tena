import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import videoCallService from '../../services/videoCallService';
import type { Consultation } from '../../services/consultationService';
import type { VideoCall, CallQualityMetrics } from '../../services/videoCallService';

interface VideoConsultationProps {
  consultation: Consultation;
  videoCall?: VideoCall;
  onEnd?: () => void;
  onCallStart?: (callId: string) => void;
  onCallEnd?: (callId: string, duration: number) => void;
}

const VideoConsultation: React.FC<VideoConsultationProps> = ({ 
  consultation, 
  videoCall,
  onEnd, 
  onCallStart,
  onCallEnd 
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callQuality, setCallQuality] = useState<CallQualityMetrics>({});
  const [showQualityModal, setShowQualityModal] = useState(false);
  const qualityCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const isDoctor = user?.walletAddress?.toLowerCase() === consultation.doctorWallet.toLowerCase();
  const otherParticipant = isDoctor ? consultation.patient : consultation.doctor;
  const token = isDoctor ? (consultation as any).dailyHostToken : (consultation as any).dailyParticipantToken;

  // Load Daily.co SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Daily.co SDK loaded');
      setIsLoading(false);
    };
    script.onerror = () => setError('Failed to load video SDK');
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Monitor call quality
  const startQualityMonitoring = useCallback(() => {
    if (!callFrame) return;

    qualityCheckInterval.current = setInterval(async () => {
      try {
        const stats = await callFrame.getNetworkStats();
        const quality: CallQualityMetrics = {
          bandwidth: stats.stats?.latest?.recvBitsPerSecond || 0,
          packetLoss: stats.stats?.latest?.videoRecvPacketLoss || 0,
          latency: stats.stats?.latest?.roundTripTime || 0,
          videoQuality: getQualityRating(stats.stats?.latest?.videoRecvPacketLoss || 0),
          audioQuality: getQualityRating(stats.stats?.latest?.audioRecvPacketLoss || 0),
          connectionStability: stats.threshold === 'good' ? 'stable' : 'unstable'
        };

        setCallQuality(quality);

        // Update server with quality metrics
        if (videoCall?.id) {
          await videoCallService.updateCallQuality(videoCall.id, user?.walletAddress || '', quality);
        }
      } catch (err) {
        console.warn('Failed to get network stats:', err);
      }
    }, 10000); // Check every 10 seconds
  }, [callFrame, videoCall?.id, user?.walletAddress]);

  const stopQualityMonitoring = useCallback(() => {
    if (qualityCheckInterval.current) {
      clearInterval(qualityCheckInterval.current);
      qualityCheckInterval.current = null;
    }
  }, []);

  const getQualityRating = (packetLoss: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (packetLoss < 1) return 'excellent';
    if (packetLoss < 3) return 'good';
    if (packetLoss < 5) return 'fair';
    return 'poor';
  };

  // Join call
  const joinCall = useCallback(async () => {
    if (!consultation.dailyRoomUrl || !(window as any).DailyIframe) {
      setError('Video room not available');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      const frame = (window as any).DailyIframe.createFrame(
        document.getElementById('video-container'),
        {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '12px'
          },
          showLeaveButton: true,
          showFullscreenButton: true,
          showParticipantCount: true,
          theme: {
            accent: '#3B82F6',
            accentText: '#FFFFFF',
            background: '#1F2937',
            backgroundAccent: '#374151',
            baseText: '#F9FAFB',
            border: '#4B5563',
            mainAreaBg: '#111827',
            mainAreaBgAccent: '#1F2937',
            mainAreaText: '#F9FAFB',
            supportiveText: '#9CA3AF'
          }
        }
      );

      // Enhanced event handlers
      frame.on('joined-meeting', (event: any) => {
        setIsInCall(true);
        setConnectionStatus('connected');
        startQualityMonitoring();
        onCallStart?.(videoCall?.id || '');
        console.log('✅ Joined video call:', event);
      });

      frame.on('left-meeting', () => {
        setIsInCall(false);
        setConnectionStatus('disconnected');
        stopQualityMonitoring();
        handleEndCall();
      });

      frame.on('participant-joined', (event: any) => {
        console.log('👤 Participant joined:', event.participant.user_name);
        setParticipants(prev => [...prev, event.participant.user_id]);
      });

      frame.on('participant-left', (event: any) => {
        console.log('👋 Participant left:', event.participant.user_name);
        setParticipants(prev => prev.filter(id => id !== event.participant.user_id));
      });

      frame.on('camera-error', (event: any) => {
        console.error('📹 Camera error:', event);
        setError('Camera access denied or unavailable');
      });

      frame.on('microphone-error', (event: any) => {
        console.error('🎤 Microphone error:', event);
        setError('Microphone access denied or unavailable');
      });

      frame.on('error', (e: any) => {
        console.error('Daily.co error:', e);
        setConnectionStatus('failed');
        setError('Video call error: ' + e.errorMsg);
      });

      frame.on('network-quality-change', (event: any) => {
        const quality = event.threshold;
        setCallQuality(prev => ({
          ...prev,
          connectionStability: quality === 'good' ? 'stable' : quality === 'low' ? 'poor' : 'unstable'
        }));
      });

      // Media device event handlers
      frame.on('active-speaker-change', (event: any) => {
        console.log('🔊 Active speaker:', event.activeSpeaker.peerId);
      });

      frame.on('recording-started', () => {
        console.log('🔴 Recording started');
      });

      frame.on('recording-stopped', () => {
        console.log('⏹️ Recording stopped');
      });

      // Get Daily.co token if available
      let joinUrl = consultation.dailyRoomUrl;
      if (videoCall?.id) {
        try {
          const tokenResponse = await videoCallService.getDailyToken(videoCall.id, user?.walletAddress || '');
          joinUrl = tokenResponse.data.joinUrl;
        } catch (tokenError) {
          console.warn('Failed to get Daily.co token, using fallback:', tokenError);
          joinUrl = token ? `${consultation.dailyRoomUrl}?t=${token}` : consultation.dailyRoomUrl;
        }
      } else {
        joinUrl = token ? `${consultation.dailyRoomUrl}?t=${token}` : consultation.dailyRoomUrl;
      }

      await frame.join({ 
        url: joinUrl,
        userName: user?.fullName || user?.firstName || 'User'
      });
      
      setCallFrame(frame);

    } catch (err: any) {
      console.error('Failed to join call:', err);
      setConnectionStatus('failed');
      setError('Failed to join video call: ' + err.message);
    }
  }, [consultation.dailyRoomUrl, token, videoCall?.id, user?.walletAddress, user, startQualityMonitoring, onCallStart, stopQualityMonitoring]);

  // Track call duration
  useEffect(() => {
    if (!isInCall) return;

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isInCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopQualityMonitoring();
      if (callFrame) {
        try {
          callFrame.destroy();
        } catch (e) {
          console.warn('Error destroying call frame:', e);
        }
      }
    };
  }, [callFrame, stopQualityMonitoring]);

  // Media controls
  const toggleVideo = useCallback(async () => {
    if (!callFrame) return;
    
    try {
      const newState = !isVideoEnabled;
      await callFrame.setLocalVideo(newState);
      setIsVideoEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle video:', err);
    }
  }, [callFrame, isVideoEnabled]);

  const toggleAudio = useCallback(async () => {
    if (!callFrame) return;
    
    try {
      const newState = !isAudioEnabled;
      await callFrame.setLocalAudio(newState);
      setIsAudioEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle audio:', err);
    }
  }, [callFrame, isAudioEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!callFrame) return;
    
    try {
      if (isScreenSharing) {
        await callFrame.stopScreenShare();
      } else {
        await callFrame.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  }, [callFrame, isScreenSharing]);

  // Handle end call
  const handleEndCall = async (reason?: string) => {
    stopQualityMonitoring();
    
    if (callFrame) {
      try {
        await callFrame.leave();
        callFrame.destroy();
      } catch (e) {
        console.warn('Error leaving call:', e);
      }
    }

    // End video call if it exists
    if (videoCall?.id) {
      try {
        await videoCallService.endCall(
          videoCall.id, 
          user?.walletAddress || '', 
          reason || 'normal',
          callQuality
        );
        onCallEnd?.(videoCall.id, callDuration);
      } catch (e) {
        console.error('Failed to end video call:', e);
      }
    }

    // End consultation
    try {
      await consultationService.endConsultation(consultation.id, {
        userWallet: user?.walletAddress || ''
      });
    } catch (e) {
      console.error('Failed to end consultation:', e);
    }

    onEnd?.();
  };

  const handleEndCallWithFeedback = () => {
    setShowQualityModal(true);
  };

  const submitCallFeedback = async (rating: number, feedback?: string) => {
    const finalQuality = {
      ...callQuality,
      userRating: rating,
      technicalIssues: feedback ? [feedback] : []
    };

    setCallQuality(finalQuality);
    setShowQualityModal(false);
    await handleEndCall('normal');
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Waiting room (before scheduled time)
  const scheduledTime = consultation.scheduledTime ? new Date(consultation.scheduledTime) : null;
  const now = new Date();
  const isBeforeScheduled = scheduledTime && now < scheduledTime;
  const minutesUntilStart = scheduledTime 
    ? Math.max(0, Math.floor((scheduledTime.getTime() - now.getTime()) / 60000))
    : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-white">Loading video...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <p className="text-white mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Waiting room
  if (isBeforeScheduled && minutesUntilStart > 5) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg text-white">
        <div className="text-6xl mb-6">🎥</div>
        <h2 className="text-2xl font-bold mb-2">Video Consultation</h2>
        <p className="text-gray-400 mb-6">
          with {isDoctor ? consultation.patient?.firstName : consultation.doctor?.firstName}
        </p>
        <div className="bg-gray-700/50 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-2">Starts in</p>
          <p className="text-4xl font-bold text-blue-400">{minutesUntilStart} minutes</p>
          <p className="text-sm text-gray-400 mt-2">
            {scheduledTime?.toLocaleString()}
          </p>
        </div>
        <p className="text-sm text-gray-500 mt-6">
          You can join 5 minutes before the scheduled time
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[700px] bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-xl">🎥</span>
            </div>
            {connectionStatus === 'connected' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">
              Video Consultation
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">
                {isInCall ? `Duration: ${formatDuration(callDuration)}` : 'Ready to join'}
              </span>
              {otherParticipant && (
                <span className="text-blue-400">
                  with {otherParticipant.firstName || otherParticipant.fullName}
                </span>
              )}
              {participants.length > 0 && (
                <span className="text-green-400">
                  {participants.length + 1} participants
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-700">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionStatus === 'failed' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-xs text-gray-300 capitalize">{connectionStatus}</span>
          </div>

          {/* Call Quality Indicator */}
          {isInCall && callQuality.connectionStability && (
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              callQuality.connectionStability === 'stable' ? 'bg-green-600 text-white' :
              callQuality.connectionStability === 'unstable' ? 'bg-yellow-600 text-white' :
              'bg-red-600 text-white'
            }`}>
              {callQuality.connectionStability}
            </div>
          )}

          {isInCall && (
            <button
              onClick={handleEndCallWithFeedback}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>📞</span>
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {!isInCall ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center max-w-md">
              <div className="text-8xl mb-6">📹</div>
              <h3 className="text-2xl font-semibold text-white mb-3">Ready to Start</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Click below to join the video consultation with{' '}
                {otherParticipant?.firstName || otherParticipant?.fullName || 'the other participant'}
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-600/20 border border-red-500 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={joinCall}
                disabled={isLoading || !!error}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center gap-3 mx-auto"
              >
                <span>🎥</span>
                {isLoading ? 'Loading...' : 'Join Video Call'}
              </button>
              
              <div className="mt-6 text-sm text-gray-500 space-y-2">
                <p>📹 Make sure your camera is enabled</p>
                <p>🎤 Make sure your microphone is enabled</p>
                <p>🔊 Use headphones for better audio quality</p>
              </div>
            </div>
          </div>
        ) : null}
        
        <div 
          id="video-container" 
          className={`w-full h-full ${!isInCall ? 'hidden' : ''}`}
        />

        {/* Floating Controls */}
        {isInCall && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              <span className="text-white text-lg">
                {isVideoEnabled ? '📹' : '📷'}
              </span>
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              <span className="text-white text-lg">
                {isAudioEnabled ? '🎤' : '🔇'}
              </span>
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
            >
              <span className="text-white text-lg">🖥️</span>
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      {isInCall && (
        <div className="p-4 bg-gray-800 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>📊 Quality: {callQuality.videoQuality || 'Good'}</span>
              {callQuality.latency && (
                <span>⚡ Latency: {Math.round(callQuality.latency)}ms</span>
              )}
              {callQuality.bandwidth && (
                <span>📡 Bandwidth: {Math.round(callQuality.bandwidth / 1000)}kbps</span>
              )}
            </div>
            <div className="text-sm text-gray-400">
              Use the video controls above or in the video window
            </div>
          </div>
        </div>
      )}

      {/* Call Quality Feedback Modal */}
      {showQualityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Rate Your Call Experience</h3>
            <p className="text-gray-400 mb-6">How was the video call quality?</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => submitCallFeedback(rating)}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  {rating <= 2 ? '😞' : rating === 3 ? '😐' : rating === 4 ? '🙂' : '😊'}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => submitCallFeedback(3)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setShowQualityModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConsultation;
