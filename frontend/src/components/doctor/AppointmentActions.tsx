import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Video, 
  MessageSquare, 
  FileText, 
  Clock, 
  Phone, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Stethoscope,
  Eye,
  Edit3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import videoCallService from '../../services/videoCallService';

interface AppointmentActionsProps {
  appointment: any;
  onAction?: (action: string, appointment: any) => void;
  compact?: boolean;
}

export const AppointmentActions: React.FC<AppointmentActionsProps> = ({ 
  appointment, 
  onAction,
  compact = false 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: string) => {
    setIsProcessing(true);
    try {
      await onAction?.(action, appointment);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartVideoCall = async () => {
    if (!user?.walletAddress || !appointment.patientWalletAddress) {
      showNotification('Unable to start video call - missing user information', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // Initiate video call with the patient
      const response = await videoCallService.initiateCall({
        initiatorWallet: user.walletAddress,
        receiverWallet: appointment.patientWalletAddress,
        appointmentId: appointment.id,
        scheduledTime: new Date().toISOString(),
        durationMinutes: 30
      });

      if (response.success) {
        showNotification('Video call initiated! Patient will be notified.', 'success');
        
        // Navigate to video call interface
        navigate(`/video-call/${response.data.id}`, {
          state: {
            callId: response.data.id,
            patientName: appointment.patientName || 'Patient',
            appointmentId: appointment.id,
            isInitiator: true
          }
        });
      } else {
        showNotification(response.error || 'Failed to start video call', 'error');
      }
    } catch (error: any) {
      console.error('Video call error:', error);
      showNotification(
        error.response?.data?.message || 'Failed to start video call', 
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionButtons = () => {
    const buttons = [];
    const status = appointment.workflowState || appointment.status;
    const isCompleted = status === 'completed';
    const isInProgress = status === 'consultation_started' || status === 'video_call_active';
    const isWaiting = appointment.checkInStatus === 'checked_in' || appointment.checkInStatus === 'waiting';

    // Emergency Alert (always available for urgent cases)
    if (appointment.reason?.toLowerCase().includes('emergency') || 
        appointment.reason?.toLowerCase().includes('urgent')) {
      buttons.push({
        key: 'emergency',
        label: 'Emergency Alert',
        icon: AlertTriangle,
        color: 'bg-red-600 hover:bg-red-700 text-white',
        action: () => handleAction('emergency_alert')
      });
    }

    // Start Consultation (primary action)
    if (!isCompleted && !isInProgress) {
      buttons.push({
        key: 'start_consultation',
        label: isWaiting ? 'Start Consultation' : 'Begin Appointment',
        icon: Play,
        color: 'bg-medical-600 hover:bg-medical-700 text-white',
        action: () => navigate(`/comprehensive-consultation/${appointment.id}`)
      });
    }

    // Video Call
    if (appointment.serviceType === 'videoCall' || !isCompleted) {
      buttons.push({
        key: 'video_call',
        label: isInProgress ? 'Join Video Call' : 'Start Video Call',
        icon: Video,
        color: 'bg-blue-600 hover:bg-blue-700 text-white',
        action: handleStartVideoCall
      });
    }

    // Pre-consultation Notes
    if (!isCompleted) {
      buttons.push({
        key: 'pre_notes',
        label: 'Pre-Consult Notes',
        icon: Edit3,
        color: 'bg-purple-600 hover:bg-purple-700 text-white',
        action: () => handleAction('pre_consultation_notes')
      });
    }

    // View Full History
    buttons.push({
      key: 'view_history',
      label: 'View Full History',
      icon: FileText,
      color: 'bg-gray-600 hover:bg-gray-700 text-white',
      action: () => navigate(`/medical-records?patient=${appointment.patientWalletAddress}`)
    });

    // Chat with Patient
    buttons.push({
      key: 'chat',
      label: 'Chat Patient',
      icon: MessageSquare,
      color: 'bg-green-600 hover:bg-green-700 text-white',
      action: () => navigate(`/messages?userId=${appointment.patientWalletAddress}`)
    });

    // Call Patient (for waiting room management)
    if (isWaiting) {
      buttons.push({
        key: 'call_patient',
        label: 'Call Patient',
        icon: Phone,
        color: 'bg-orange-600 hover:bg-orange-700 text-white',
        action: () => handleAction('call_patient')
      });
    }

    // Reschedule
    if (!isCompleted && !isInProgress) {
      buttons.push({
        key: 'reschedule',
        label: 'Reschedule',
        icon: Calendar,
        color: 'border border-blue-300 text-blue-600 hover:bg-blue-50',
        action: () => handleAction('reschedule')
      });
    }

    // View Details
    buttons.push({
      key: 'view_details',
      label: 'View Details',
      icon: Eye,
      color: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      action: () => handleAction('view_details')
    });

    // Cancel (only if not completed or in progress)
    if (!isCompleted && !isInProgress) {
      buttons.push({
        key: 'cancel',
        label: 'Cancel',
        icon: XCircle,
        color: 'border border-red-300 text-red-600 hover:bg-red-50',
        action: () => handleAction('cancel')
      });
    }

    return buttons;
  };

  const actionButtons = getActionButtons();

  if (compact) {
    // Show only the most important actions in compact mode
    const primaryActions = actionButtons.slice(0, 3);
    
    return (
      <div className="flex gap-2">
        {primaryActions.map((button) => (
          <motion.button
            key={button.key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={button.action}
            disabled={isProcessing}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${button.color} ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <button.icon className="w-4 h-4" />
            {button.label}
          </motion.button>
        ))}
        
        {actionButtons.length > 3 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => handleAction('show_more_actions')}
          >
            +{actionButtons.length - 3} more
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <div className="flex flex-wrap gap-2">
        {actionButtons.slice(0, 4).map((button) => (
          <motion.button
            key={button.key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={button.action}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${button.color} ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <button.icon className="w-4 h-4" />
            {button.label}
          </motion.button>
        ))}
      </div>

      {/* Secondary Actions */}
      {actionButtons.length > 4 && (
        <div className="flex flex-wrap gap-2">
          {actionButtons.slice(4).map((button) => (
            <motion.button
              key={button.key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={button.action}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${button.color} ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <button.icon className="w-4 h-4" />
              {button.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Quick Stats for this appointment */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-gray-600">Status:</span>
            <span className="ml-2 font-medium capitalize">
              {appointment.workflowState?.replace('_', ' ') || appointment.status}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Service:</span>
            <span className="ml-2 font-medium">
              {appointment.serviceType === 'inPerson' ? 'In-Person' : 
               appointment.serviceType === 'videoCall' ? 'Video Call' : 'Chat'}
            </span>
          </div>
          {appointment.fee > 0 && (
            <div>
              <span className="text-gray-600">Fee:</span>
              <span className="ml-2 font-medium text-medical-600">{appointment.fee} Birr</span>
            </div>
          )}
          {appointment.estimatedWaitTime && (
            <div>
              <span className="text-gray-600">Est. Wait:</span>
              <span className="ml-2 font-medium">{appointment.estimatedWaitTime} min</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};