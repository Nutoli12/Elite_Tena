import React, { useState, useEffect } from 'react';
import { useAlert } from '../../hooks/useAlert';
import { appointmentConsentAPI } from '../../services/appointmentConsentAPI';

interface ConsentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientWalletAddress: string;
  onConsentDecision?: (decision: 'granted' | 'denied') => void;
}

interface ConsentRequest {
  id: string;
  appointmentId: string;
  status: string;
  permissions: {
    allow_consultation: boolean;
    allow_medical_history_view: boolean;
    allow_prescription_write: boolean;
    allow_lab_test_order: boolean;
    allow_diagnosis_recording: boolean;
    allow_video_call: boolean;
    allow_chat: boolean;
    valid_for_hours: number;
    purpose: string;
  };
  purpose: string;
  consultationType: string;
  requestedAt: string;
  appointment: {
    id: string;
    appointmentDate: string;
    serviceType: string;
    doctorDetails: {
      user: {
        name: string;
      };
      specialty?: string;
    };
  };
}

export const ConsentReviewModal: React.FC<ConsentReviewModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  patientWalletAddress,
  onConsentDecision
}) => {
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<any>({});
  const [customDuration, setCustomDuration] = useState<number>(24);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyForm, setShowDenyForm] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (isOpen && appointmentId) {
      loadConsentRequest();
    }
  }, [isOpen, appointmentId]);

  const loadConsentRequest = async () => {
    try {
      setIsLoading(true);
      const response = await appointmentConsentAPI.getConsentDetails(appointmentId);
      
      if (response.success && response.data) {
        setConsentRequest(response.data);
        setCustomPermissions(response.data.permissions);
        setCustomDuration(response.data.permissions.valid_for_hours || 24);
      } else {
        throw new Error('No consent request found for this appointment');
      }
    } catch (error) {
      console.error('❌ Error loading consent request:', error);
      showAlert('error', 'Load Failed', 'Failed to load consent request details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    try {
      setIsProcessing(true);

      const response = await appointmentConsentAPI.grantConsent(appointmentId, {
        patientWalletAddress,
        customPermissions,
        customDuration
      });

      if (response.success) {
        showAlert('success', 'Consent Granted', 'You have successfully granted consent. The doctor can now start the consultation.');

        if (onConsentDecision) {
          onConsentDecision('granted');
        }
        onClose();
      } else {
        throw new Error(response.message || 'Failed to grant consent');
      }
    } catch (error) {
      console.error('❌ Error granting consent:', error);
      showAlert('error', 'Grant Failed', (error as Error).message || 'Failed to grant consent. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDenyConsent = async () => {
    try {
      setIsProcessing(true);

      const response = await appointmentConsentAPI.denyConsent(appointmentId, {
        patientWalletAddress,
        reason: denyReason
      });

      if (response.success) {
        showAlert('info', 'Consent Denied', 'You have denied the consent request. The doctor has been notified.');

        if (onConsentDecision) {
          onConsentDecision('denied');
        }
        onClose();
      } else {
        throw new Error(response.message || 'Failed to deny consent');
      }
    } catch (error) {
      console.error('❌ Error denying consent:', error);
      showAlert('error', 'Deny Failed', (error as Error).message || 'Failed to deny consent. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setCustomPermissions((prev: any) => ({
      ...prev,
      [permission]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              🔐 Consent Request
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading consent request...</span>
            </div>
          ) : consentRequest ? (
            <div className="space-y-6">
              {/* Appointment Details */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Appointment Details</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Doctor:</strong> {consentRequest.appointment.doctorDetails.user.name}</p>
                  {consentRequest.appointment.doctorDetails.specialty && (
                    <p><strong>Specialty:</strong> {consentRequest.appointment.doctorDetails.specialty}</p>
                  )}
                  <p><strong>Date:</strong> {new Date(consentRequest.appointment.appointmentDate).toLocaleString()}</p>
                  <p><strong>Type:</strong> {consentRequest.appointment.serviceType}</p>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Purpose</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{consentRequest.purpose}</p>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Requested Permissions</h3>
                <div className="space-y-3">
                  {[
                    { key: 'allow_consultation', label: 'Allow General Consultation', description: 'Basic consultation and discussion' },
                    { key: 'allow_medical_history_view', label: 'View Medical History', description: 'Access to your past medical records' },
                    { key: 'allow_prescription_write', label: 'Write Prescriptions', description: 'Create and manage prescriptions' },
                    { key: 'allow_lab_test_order', label: 'Order Lab Tests', description: 'Request laboratory tests' },
                    { key: 'allow_diagnosis_recording', label: 'Record Diagnosis', description: 'Document medical findings and diagnosis' },
                    { key: 'allow_video_call', label: 'Video Call Access', description: 'Conduct video consultations' },
                    { key: 'allow_chat', label: 'Chat Access', description: 'Text-based communication' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id={key}
                        checked={customPermissions[key] || false}
                        onChange={(e) => handlePermissionChange(key, e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label htmlFor={key} className="font-medium text-gray-900 cursor-pointer">
                          {label}
                        </label>
                        <p className="text-sm text-gray-600">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Consent Duration</h3>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-700">hours</span>
                  <span className="text-sm text-gray-500">
                    (Expires: {new Date(Date.now() + customDuration * 60 * 60 * 1000).toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Deny Form */}
              {showDenyForm && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-medium text-red-900 mb-2">Reason for Denial (Optional)</h3>
                  <textarea
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Please provide a reason for denying this consent request..."
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                {!showDenyForm ? (
                  <>
                    <button
                      onClick={() => setShowDenyForm(true)}
                      className="text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      Deny Request
                    </button>
                    <button
                      onClick={handleGrantConsent}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Granting...</span>
                        </div>
                      ) : (
                        'Grant Consent'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowDenyForm(false)}
                      className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDenyConsent}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Denying...</span>
                        </div>
                      ) : (
                        'Confirm Denial'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No consent request found for this appointment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentReviewModal;