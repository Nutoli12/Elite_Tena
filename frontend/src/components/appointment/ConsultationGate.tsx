import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentConsentAPI } from '../../services/appointmentConsentAPI';
import ConsentRequestButton from './ConsentRequestButton';
import ConsentReviewModal from './ConsentReviewModal';

interface ConsultationGateProps {
  appointmentId: string;
  appointment?: {
    id: string;
    patientWalletAddress: string;
    doctorWalletAddress: string;
    appointmentDate: string;
    serviceType: string;
    paymentStatus: string;
    workflowState: string;
    consentStatus?: string;
    requiresConsent?: boolean;
  };
  requiredPermission?: string;
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  onConsentChange?: (hasConsent: boolean) => void;
}

export const ConsultationGate: React.FC<ConsultationGateProps> = ({
  appointmentId,
  appointment,
  requiredPermission = 'allow_consultation',
  children,
  fallbackComponent,
  onConsentChange
}) => {
  const { user } = useAuth();
  const [consentStatus, setConsentStatus] = useState<{
    hasConsent: boolean;
    loading: boolean;
    error?: string;
    status?: string;
    message?: string;
    canRequest?: boolean;
    canGrant?: boolean;
  }>({
    hasConsent: false,
    loading: true
  });
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      checkConsentStatus();
    }
  }, [appointmentId, requiredPermission]);

  const checkConsentStatus = async () => {
    try {
      setConsentStatus(prev => ({ ...prev, loading: true }));

      // Check if appointment requires consent
      if (appointment && appointment.requiresConsent === false) {
        setConsentStatus({
          hasConsent: true,
          loading: false,
          message: 'No consent required for this appointment'
        });
        if (onConsentChange) onConsentChange(true);
        return;
      }

      // Get consent summary
      const summary = await appointmentConsentAPI.getConsentSummary(appointmentId);
      
      // Check specific permission if consent is granted
      let hasPermission = false;
      if (summary.status === 'granted') {
        hasPermission = await appointmentConsentAPI.hasPermission(appointmentId, requiredPermission);
      }

      const newStatus = {
        hasConsent: summary.status === 'granted' && hasPermission,
        loading: false,
        status: summary.status,
        message: summary.message,
        canRequest: summary.canRequest,
        canGrant: summary.canGrant
      };

      setConsentStatus(newStatus);
      if (onConsentChange) onConsentChange(newStatus.hasConsent);
    } catch (error) {
      console.error('❌ Error checking consent status:', error);
      setConsentStatus({
        hasConsent: false,
        loading: false,
        error: 'Failed to check consent status'
      });
      if (onConsentChange) onConsentChange(false);
    }
  };

  const handleConsentRequested = () => {
    // Refresh consent status after request
    checkConsentStatus();
  };

  const handleConsentDecision = (decision: 'granted' | 'denied') => {
    // Refresh consent status after decision
    checkConsentStatus();
  };

  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';

  // Loading state
  if (consentStatus.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Checking consent status...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (consentStatus.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 font-medium">Consent Check Failed</span>
        </div>
        <p className="text-red-600 mt-1">{consentStatus.error}</p>
      </div>
    );
  }

  // Has consent - show protected content
  if (consentStatus.hasConsent) {
    return <>{children}</>;
  }

  // No consent - show appropriate gate based on user role and status
  const renderConsentGate = () => {
    if (fallbackComponent) {
      return fallbackComponent;
    }

    switch (consentStatus.status) {
      case 'not_requested':
        if (isDoctor && consentStatus.canRequest && appointment) {
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Consent Required</h3>
                <p className="text-blue-700 mb-4">
                  Patient consent is required before starting the consultation. Request consent to proceed.
                </p>
                <ConsentRequestButton
                  appointment={appointment}
                  onConsentRequested={handleConsentRequested}
                />
              </div>
            </div>
          );
        } else {
          return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-7a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Consent Not Requested</h3>
                <p className="text-gray-600">
                  The doctor has not yet requested consent for this consultation.
                </p>
              </div>
            </div>
          );
        }

      case 'requested':
        if (isPatient && consentStatus.canGrant) {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-yellow-900 mb-2">Consent Request Pending</h3>
                <p className="text-yellow-700 mb-4">
                  Your doctor has requested consent to access your medical information for this consultation.
                </p>
                <button
                  onClick={() => setShowConsentModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Review Consent Request
                </button>
              </div>
            </div>
          );
        } else {
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Waiting for Patient Consent</h3>
                <p className="text-blue-700">
                  Consent request has been sent to the patient. Waiting for approval to start consultation.
                </p>
              </div>
            </div>
          );
        }

      case 'denied':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-900 mb-2">Consent Denied</h3>
              <p className="text-red-700">
                The patient has denied consent for this consultation. Please contact the patient to discuss.
              </p>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-orange-900 mb-2">Consent Expired</h3>
              <p className="text-orange-700 mb-4">
                The patient's consent has expired. A new consent request is required to continue.
              </p>
              {isDoctor && appointment && (
                <ConsentRequestButton
                  appointment={appointment}
                  onConsentRequested={handleConsentRequested}
                />
              )}
            </div>
          </div>
        );

      case 'revoked':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-900 mb-2">Consent Revoked</h3>
              <p className="text-red-700">
                The patient has revoked consent for this consultation. Access has been terminated.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Consent Status Unknown</h3>
              <p className="text-gray-600">
                {consentStatus.message || 'Unable to determine consent status for this consultation.'}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {renderConsentGate()}
      
      {/* Consent Review Modal */}
      {showConsentModal && isPatient && (
        <ConsentReviewModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          appointmentId={appointmentId}
          patientWalletAddress={user?.walletAddress || ''}
          onConsentDecision={handleConsentDecision}
        />
      )}
    </>
  );
};

export default ConsultationGate;