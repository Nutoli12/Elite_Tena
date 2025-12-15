import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import videoCallService from '../../services/videoCallService';
import type { VideoCall } from '../../services/videoCallService';
import { Modal } from '../../services/modalService';

interface IncomingCallModalProps {
  call: VideoCall | null;
  onAnswer: (callId: string) => void;
  onReject: (callId: string) => void;
  onClose: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAnswer,
  onReject,
  onClose
}) => {
  const { user } = useAuth();
  const [isAnswering, setIsAnswering] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 second timeout

  // Auto-reject after timeout
  useEffect(() => {
    if (!call) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleReject('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [call]);

  const handleAnswer = async () => {
    if (!call || isAnswering) return;

    setIsAnswering(true);
    try {
      await videoCallService.answerCall(call.id, user?.walletAddress || '');
      onAnswer(call.id);
    } catch (error) {
      console.error('Failed to answer call:', error);
      Modal.error('Failed to answer call. Please try again.', 'Alert');
    } finally {
      setIsAnswering(false);
    }
  };

  const handleReject = async (reason = 'declined') => {
    if (!call || isRejecting) return;

    setIsRejecting(true);
    try {
      await videoCallService.rejectCall(call.id, user?.walletAddress || '', reason);
      onReject(call.id);
    } catch (error) {
      console.error('Failed to reject call:', error);
    } finally {
      setIsRejecting(false);
      onClose();
    }
  };

  if (!call) return null;

  const callerName = call.initiator?.profileData?.fullName || 
                    call.initiator?.profileData?.firstName || 
                    'Someone';
  const callerRole = call.initiator?.role || 'user';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-600 animate-slideUp">
        {/* Caller Info */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-4xl">
              {callerRole === 'doctor' ? '👨‍⚕️' : callerRole === 'patient' ? '🧑‍💼' : '👤'}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Incoming Video Call
          </h2>
          
          <p className="text-xl text-blue-400 font-semibold mb-1">
            {callerName}
          </p>
          
          <p className="text-sm text-gray-400 capitalize">
            {callerRole} • Video Consultation
          </p>

          {call.appointmentId && (
            <div className="mt-3 px-3 py-1 bg-green-600/20 border border-green-500 rounded-full inline-block">
              <span className="text-green-400 text-sm">📅 Scheduled Appointment</span>
            </div>
          )}
        </div>

        {/* Call Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-2xl">📹</span>
            </div>
            <div className="absolute inset-0 w-16 h-16 bg-green-500/30 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-full">
            <span className="text-gray-400 text-sm">Auto-decline in</span>
            <span className="text-white font-mono font-bold">{timeLeft}s</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {/* Reject Button */}
          <button
            onClick={() => handleReject('declined')}
            disabled={isRejecting || isAnswering}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <span className="text-2xl">📞</span>
            {isRejecting ? 'Declining...' : 'Decline'}
          </button>

          {/* Answer Button */}
          <button
            onClick={handleAnswer}
            disabled={isAnswering || isRejecting}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <span className="text-2xl">📹</span>
            {isAnswering ? 'Joining...' : 'Answer'}
          </button>
        </div>

        {/* Additional Options */}
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <button
            onClick={() => handleReject('busy')}
            disabled={isRejecting || isAnswering}
            className="text-gray-400 hover:text-white transition-colors"
          >
            I'm busy
          </button>
          <button
            onClick={() => handleReject('no_video')}
            disabled={isRejecting || isAnswering}
            className="text-gray-400 hover:text-white transition-colors"
          >
            No video available
          </button>
        </div>

        {/* Call Details */}
        {call.metadata?.scheduledTime && (
          <div className="mt-6 p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xs text-gray-400 text-center">
              Scheduled: {new Date(call.metadata.scheduledTime).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingCallModal;