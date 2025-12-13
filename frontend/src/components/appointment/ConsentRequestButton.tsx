import React, { useState } from 'react';
import { useAlert } from '../../hooks/useAlert';
import { appointmentConsentAPI } from '../../services/appointmentConsentAPI';

interface ConsentRequestButtonProps {
  appointment: {
    id: string;
    patientWalletAddress: string;
    doctorWalletAddress: string;
    appointmentDate: string;
    serviceType: string;
    paymentStatus: string;
    workflowState: string;
    consentStatus?: string;
  };
  onConsentRequested?: () => void;
  className?: string;
}

export const ConsentRequestButton: React.FC<ConsentRequestButtonProps> = ({
  appointment,
  onConsentRequested,
  className = ''
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const { showAlert } = useAlert();

  const handleRequestConsent = async () => {
    try {
      setIsRequesting(true);

      // Validate appointment state
      if (appointment.paymentStatus !== 'confirmed' && appointment.paymentStatus !== 'paid') {
        showAlert('warning', 'Payment Required', 'Patient must complete payment before consent can be requested.');
        return;
      }

      if (appointment.consentStatus === 'granted') {
        showAlert('info', 'Consent Already Granted', 'Patient has already granted consent for this appointment.');
        return;
      }

      if (appointment.consentStatus === 'requested') {
        showAlert('info', 'Consent Already Requested', 'Consent request is already pending patient approval.');
        return;
      }

      // Determine consultation type and permissions based on appointment
      const consultationType = appointment.serviceType || 'general_consultation';
      const customPermissions = {
        allow_consultation: true,
        allow_medical_history_view: true,
        allow_prescription_write: true,
        allow_lab_test_order: false,
        allow_diagnosis_recording: true,
        allow_video_call: appointment.serviceType === 'videoCall',
        allow_chat: appointment.serviceType === 'chat',
        valid_for_hours: 24,
        purpose: `Consultation consent for appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()}`
      };

      // Request consent
      const response = await appointmentConsentAPI.requestConsent(appointment.id, {
        doctorWalletAddress: appointment.doctorWalletAddress,
        customPermissions,
        consultationType,
        purpose: customPermissions.purpose
      });

      if (response.success) {
        showAlert('success', 'Consent Requested', 'Consent request sent to patient. They will be notified to review and approve.');

        // Callback to refresh appointment data
        if (onConsentRequested) {
          onConsentRequested();
        }
      } else {
        throw new Error(response.message || 'Failed to request consent');
      }
    } catch (error) {
      console.error('❌ Error requesting consent:', error);
      showAlert('error', 'Request Failed', (error as any).message || 'Failed to request consent. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  // Don't show button if payment not confirmed
  if (appointment.paymentStatus !== 'confirmed' && appointment.paymentStatus !== 'paid') {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
          <span>Waiting for payment confirmation</span>
        </div>
      </div>
    );
  }

  // Show status if consent already requested/granted
  if (appointment.consentStatus === 'requested') {
    return (
      <div className={`text-sm text-blue-600 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>Consent requested - waiting for patient approval</span>
        </div>
      </div>
    );
  }

  if (appointment.consentStatus === 'granted') {
    return (
      <div className={`text-sm text-green-600 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>Consent granted - ready to start consultation</span>
        </div>
      </div>
    );
  }

  if (appointment.consentStatus === 'denied') {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span>Consent denied by patient</span>
        </div>
      </div>
    );
  }

  // Show request button
  return (
    <button
      onClick={handleRequestConsent}
      disabled={isRequesting}
      className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${className}`}
    >
      {isRequesting ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Requesting...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Request Consent</span>
        </div>
      )}
    </button>
  );
};

export default ConsentRequestButton;