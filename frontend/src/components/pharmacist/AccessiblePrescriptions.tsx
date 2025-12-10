import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pill, Clock, AlertCircle, Loader2, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';
import { DispensePrescriptionModal } from '../modals/DispensePrescriptionModal';

export const AccessiblePrescriptions: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);

  useEffect(() => {
    loadAccessiblePrescriptions();
  }, [user?.walletAddress]);

  const loadAccessiblePrescriptions = async () => {
    if (!user?.walletAddress) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `/prescriptions/pharmacist/${user.walletAddress}/accessible`
      );

      if (response.data.success) {
        setPrescriptions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load accessible prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = (grant: any) => {
    setSelectedPrescription(grant.prescription);
    setShowDispenseModal(true);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff < 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expires soon';
  };

  const getAccessMethodBadge = (method: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      quick_approve: { color: 'bg-green-100 text-green-700', text: 'Quick Approve' },
      manual_grant: { color: 'bg-blue-100 text-blue-700', text: 'Manual Grant' },
      qr_code: { color: 'bg-purple-100 text-purple-700', text: 'QR Code' },
      emergency: { color: 'bg-orange-100 text-orange-700', text: 'Emergency' }
    };

    const badge = badges[method] || { color: 'bg-gray-100 text-gray-700', text: method };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading accessible prescriptions...</p>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Accessible Prescriptions</h3>
          <p className="text-gray-600 mb-6">
            You don't have access to any prescriptions yet. Patients need to grant you access first.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-left max-w-md mx-auto">
            <p className="font-semibold mb-2">How to get access:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Patient generates a QR code</li>
              <li>Scan the QR code with the scanner</li>
              <li>Or patient manually grants you access</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Accessible Prescriptions</h3>
          <p className="text-sm text-gray-600">
            {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} with active access
          </p>
        </div>
        <button
          onClick={loadAccessiblePrescriptions}
          className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {prescriptions.map((grant) => {
          const prescription = grant.prescription;
          const isExpiringSoon = new Date(grant.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

          return (
            <motion.div
              key={grant.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Pill className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">
                        {prescription.medicationName}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getAccessMethodBadge(grant.accessMethod)}
                        {grant.isEmergency && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            ⚠️ Emergency
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prescription Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Dosage</span>
                      <p className="font-medium text-gray-900">{prescription.dosage}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Frequency</span>
                      <p className="font-medium text-gray-900">{prescription.frequency}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Quantity</span>
                      <p className="font-medium text-gray-900">{prescription.quantity}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Duration</span>
                      <p className="font-medium text-gray-900">{prescription.duration}</p>
                    </div>
                  </div>

                  {/* Instructions */}
                  {prescription.instructions && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-600">Instructions</span>
                      <p className="text-gray-900 mt-1">{prescription.instructions}</p>
                    </div>
                  )}

                  {/* Access Info */}
                  <div className={`border rounded-xl p-3 ${
                    isExpiringSoon
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className={`w-4 h-4 ${isExpiringSoon ? 'text-orange-600' : 'text-gray-600'}`} />
                      <span className={isExpiringSoon ? 'text-orange-700 font-medium' : 'text-gray-700'}>
                        {getTimeRemaining(grant.expiresAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Granted: {new Date(grant.grantedAt || grant.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Emergency Warning */}
                  {grant.isEmergency && !grant.emergencyConfirmedByPatient && (
                    <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-orange-700 font-medium">
                            Emergency access - Pending patient confirmation
                          </p>
                          {grant.emergencyReason && (
                            <p className="text-xs text-orange-600 mt-1">
                              Reason: {grant.emergencyReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleDispense(grant)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  <Eye className="w-5 h-5" />
                  View & Dispense
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dispense Modal */}
      {selectedPrescription && (
        <DispensePrescriptionModal
          isOpen={showDispenseModal}
          onClose={() => {
            setShowDispenseModal(false);
            setSelectedPrescription(null);
          }}
          prescription={selectedPrescription}
          onSuccess={loadAccessiblePrescriptions}
        />
      )}
    </div>
  );
};
