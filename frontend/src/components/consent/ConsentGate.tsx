import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertTriangle, Clock, User, Send } from 'lucide-react';
import { useConsentGate } from '../../hooks/useConsentGate';

interface ConsentGateProps {
  patientWallet: string;
  patientName?: string;
  action: 'viewRecords' | 'createRecord' | 'prescribe' | 'orderLab' | 'consultation';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showEmergencyOption?: boolean;
}

export const ConsentGate: React.FC<ConsentGateProps> = ({
  patientWallet,
  patientName,
  action,
  children,
  fallback,
  showEmergencyOption = false
}) => {
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [emergencyJustification, setEmergencyJustification] = useState('');
  const [requestingConsent, setRequestingConsent] = useState(false);
  const [requestingEmergency, setRequestingEmergency] = useState(false);

  const {
    consentStatus,
    loading,
    checkConsent,
    requestConsent,
    requestEmergencyOverride,
    hasAccess
  } = useConsentGate({
    patientWallet,
    autoCheck: true
  });

  const handleRequestConsent = async () => {
    setRequestingConsent(true);
    try {
      await requestConsent(
        patientWallet,
        getPermissionsForAction(action),
        `Access required for ${getActionDescription(action)}`
      );
      
      // Show success message
      alert('Consent request sent to patient successfully!');
    } catch (error: any) {
      alert(`Failed to request consent: ${error.message}`);
    } finally {
      setRequestingConsent(false);
    }
  };

  const handleEmergencyOverride = async () => {
    if (!emergencyJustification.trim()) {
      alert('Emergency justification is required');
      return;
    }

    setRequestingEmergency(true);
    try {
      await requestEmergencyOverride(emergencyJustification, patientWallet);
      alert('Emergency access granted');
      setShowEmergencyForm(false);
    } catch (error: any) {
      alert(`Emergency access denied: ${error.message}`);
    } finally {
      setRequestingEmergency(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-medical-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-600">Checking consent...</span>
      </div>
    );
  }

  // If consent is granted, show the protected content
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show consent required UI
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6"
    >
      <div className="text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Shield className="w-8 h-8 text-amber-600" />
        </motion.div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Patient Consent Required
        </h3>

        {/* Description */}
        <p className="text-gray-700 mb-6">
          You need consent from{' '}
          <span className="font-semibold">
            {patientName || consentStatus?.patientName || 'this patient'}
          </span>{' '}
          to {getActionDescription(action)}.
        </p>

        {/* Patient Info */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-amber-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>Patient: {patientWallet.substring(0, 8)}...{patientWallet.substring(-6)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Request Consent Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRequestConsent}
            disabled={requestingConsent}
            className="w-full bg-medical-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-medical-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {requestingConsent ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Sending Request...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Request Patient Consent
              </>
            )}
          </motion.button>

          {/* Emergency Override */}
          {showEmergencyOption && (
            <div className="border-t border-amber-200 pt-4">
              {!showEmergencyForm ? (
                <button
                  onClick={() => setShowEmergencyForm(true)}
                  className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Emergency Override
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={emergencyJustification}
                    onChange={(e) => setEmergencyJustification(e.target.value)}
                    placeholder="Provide detailed justification for emergency access..."
                    className="w-full p-3 border border-red-200 rounded-lg text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleEmergencyOverride}
                      disabled={requestingEmergency || !emergencyJustification.trim()}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {requestingEmergency ? 'Processing...' : 'Request Emergency Access'}
                    </button>
                    <button
                      onClick={() => setShowEmergencyForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Info */}
        {consentStatus?.consent && (
          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              <span>Last consent status: {consentStatus.consent.status}</span>
            </div>
            {consentStatus.consent.expiresAt && (
              <div className="text-xs">
                Expired: {new Date(consentStatus.consent.expiresAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Helper functions
function getActionDescription(action: string): string {
  const descriptions = {
    viewRecords: 'view their medical records',
    createRecord: 'create new medical records',
    prescribe: 'prescribe medications',
    orderLab: 'order lab tests',
    consultation: 'start a consultation'
  };
  return descriptions[action as keyof typeof descriptions] || 'perform this action';
}

function getPermissionsForAction(action: string): string[] {
  const permissionMap = {
    viewRecords: ['viewMedicalHistory'],
    createRecord: ['createRecords', 'viewMedicalHistory'],
    prescribe: ['prescribeMedications', 'viewMedicalHistory'],
    orderLab: ['orderLabTests', 'viewMedicalHistory'],
    consultation: ['viewMedicalHistory', 'createRecords']
  };
  return permissionMap[action as keyof typeof permissionMap] || ['viewMedicalHistory'];
}