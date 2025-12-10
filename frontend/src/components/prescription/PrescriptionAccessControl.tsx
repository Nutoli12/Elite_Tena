import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, QrCode, UserCheck, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';
import { QuickApproveModal } from '../modals/QuickApproveModal';
import { ManualGrantModal } from '../modals/ManualGrantModal';
import { QRCodeModal } from '../modals/QRCodeModal';
import { AccessGrantsList } from './AccessGrantsList';

interface PrescriptionAccessControlProps {
  prescription: any;
  onUpdate?: () => void;
}

export const PrescriptionAccessControl: React.FC<PrescriptionAccessControlProps> = ({
  prescription,
  onUpdate
}) => {
  const { user } = useAuth();
  const [showQuickApprove, setShowQuickApprove] = useState(false);
  const [showManualGrant, setShowManualGrant] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [accessGrants, setAccessGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prescription?.id) {
      loadAccessGrants();
    }
  }, [prescription?.id]);

  const loadAccessGrants = async () => {
    try {
      const response = await axios.get(`/prescriptions/${prescription.id}/access`, {
        params: { patientWalletAddress: user?.walletAddress }
      });
      if (response.data.success) {
        setAccessGrants(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load access grants:', error);
    }
  };

  const handleSuccess = () => {
    loadAccessGrants();
    onUpdate?.();
  };

  const hasSuggestedPharmacy = prescription?.suggestedPharmacyWallet;
  const hasActiveGrants = accessGrants.some(g => g.status === 'active' && new Date(g.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Access Control</h3>
          <p className="text-sm text-gray-600">Manage pharmacy access to this prescription</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Approve */}
        {hasSuggestedPharmacy && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQuickApprove(true)}
            className="p-4 border-2 border-green-200 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">Quick Approve</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Approve doctor's suggested pharmacy
                </p>
                {prescription.suggestedPharmacyName && (
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    {prescription.suggestedPharmacyName}
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        )}

        {/* Manual Grant */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowManualGrant(true)}
          className="p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">Manual Grant</h4>
              <p className="text-sm text-gray-600 mt-1">
                Choose pharmacy and set expiry
              </p>
            </div>
          </div>
        </motion.button>

        {/* QR Code */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowQRCode(true)}
          className="p-4 border-2 border-purple-200 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-left"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">Generate QR Code</h4>
              <p className="text-sm text-gray-600 mt-1">
                For walk-in pharmacy visits
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-blue-900">You Control Access</h4>
            <p className="text-sm text-blue-700 mt-1">
              You own this prescription. Grant time-limited access to pharmacies when you're ready to fill it.
              You can revoke access anytime before dispensing.
            </p>
          </div>
        </div>
      </div>

      {/* Access Grants List */}
      {accessGrants.length > 0 && (
        <AccessGrantsList
          grants={accessGrants}
          prescriptionId={prescription.id}
          onUpdate={handleSuccess}
        />
      )}

      {/* Modals */}
      <QuickApproveModal
        isOpen={showQuickApprove}
        onClose={() => setShowQuickApprove(false)}
        prescription={prescription}
        onSuccess={handleSuccess}
      />

      <ManualGrantModal
        isOpen={showManualGrant}
        onClose={() => setShowManualGrant(false)}
        prescription={prescription}
        onSuccess={handleSuccess}
      />

      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        prescription={prescription}
        onSuccess={handleSuccess}
      />
    </div>
  );
};
