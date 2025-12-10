import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, AlertTriangle, Trash2, QrCode, UserCheck, Plus } from 'lucide-react';
import { RevokeAccessModal } from '../modals/RevokeAccessModal';

interface AccessGrantsListProps {
  grants: any[];
  prescriptionId: string;
  onUpdate: () => void;
}

export const AccessGrantsList: React.FC<AccessGrantsListProps> = ({
  grants,
  prescriptionId,
  onUpdate
}) => {
  const [selectedGrant, setSelectedGrant] = useState<any>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const handleRevoke = (grant: any) => {
    setSelectedGrant(grant);
    setShowRevokeModal(true);
  };

  const getStatusIcon = (grant: any) => {
    const now = new Date();
    const expiresAt = new Date(grant.expiresAt);

    if (grant.status === 'used') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (grant.status === 'revoked') {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    if (grant.status === 'expired' || expiresAt < now) {
      return <Clock className="w-5 h-5 text-gray-400" />;
    }
    if (grant.isEmergency && !grant.emergencyConfirmedByPatient) {
      return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getStatusText = (grant: any) => {
    const now = new Date();
    const expiresAt = new Date(grant.expiresAt);

    if (grant.status === 'used') return 'Dispensed';
    if (grant.status === 'revoked') return 'Revoked';
    if (grant.status === 'expired' || expiresAt < now) return 'Expired';
    if (grant.isEmergency && !grant.emergencyConfirmedByPatient) return 'Emergency (Pending Confirmation)';
    return 'Active';
  };

  const getStatusColor = (grant: any) => {
    const now = new Date();
    const expiresAt = new Date(grant.expiresAt);

    if (grant.status === 'used') return 'text-green-700 bg-green-50 border-green-200';
    if (grant.status === 'revoked') return 'text-red-700 bg-red-50 border-red-200';
    if (grant.status === 'expired' || expiresAt < now) return 'text-gray-700 bg-gray-50 border-gray-200';
    if (grant.isEmergency && !grant.emergencyConfirmedByPatient) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-green-700 bg-green-50 border-green-200';
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'quick_approve':
        return <UserCheck className="w-4 h-4" />;
      case 'qr_code':
        return <QrCode className="w-4 h-4" />;
      case 'manual_grant':
        return <Plus className="w-4 h-4" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'quick_approve':
        return 'Quick Approve';
      case 'qr_code':
        return 'QR Code';
      case 'manual_grant':
        return 'Manual Grant';
      case 'emergency':
        return 'Emergency';
      default:
        return method;
    }
  };

  const canRevoke = (grant: any) => {
    return grant.status === 'active' && grant.status !== 'used';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff < 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expires soon';
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-900">Access History</h4>

      <div className="space-y-3">
        {grants.map((grant) => (
          <motion.div
            key={grant.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-xl p-4 ${getStatusColor(grant)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(grant)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-semibold text-gray-900">
                      {grant.pharmacyName || 'Pharmacy'}
                    </h5>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full text-xs font-medium">
                      {getMethodIcon(grant.accessMethod)}
                      {getMethodText(grant.accessMethod)}
                    </span>
                  </div>

                  {grant.pharmacistWalletAddress && (
                    <p className="text-xs text-gray-600 mt-1 font-mono truncate">
                      {grant.pharmacistWalletAddress}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">
                      Granted: {formatDate(grant.grantedAt || grant.createdAt)}
                    </span>
                    {grant.status === 'active' && new Date(grant.expiresAt) > new Date() && (
                      <span className="text-gray-900 font-medium">
                        {getTimeRemaining(grant.expiresAt)}
                      </span>
                    )}
                  </div>

                  {grant.isEmergency && (
                    <div className="mt-2 text-sm">
                      <p className="text-orange-700 font-medium">⚠️ Emergency Access</p>
                      {grant.emergencyReason && (
                        <p className="text-orange-600 text-xs mt-1">
                          Reason: {grant.emergencyReason}
                        </p>
                      )}
                      {!grant.emergencyConfirmedByPatient && (
                        <p className="text-orange-600 text-xs mt-1">
                          Please confirm this emergency access was legitimate
                        </p>
                      )}
                    </div>
                  )}

                  {grant.qrCodeRegenerationCount > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      QR Code regenerated {grant.qrCodeRegenerationCount} time(s)
                    </p>
                  )}

                  {grant.patientNote && (
                    <p className="text-sm text-gray-700 mt-2 italic">
                      Note: {grant.patientNote}
                    </p>
                  )}
                </div>
              </div>

              {canRevoke(grant) && (
                <button
                  onClick={() => handleRevoke(grant)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                  title="Revoke access"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <span className="text-sm font-medium">{getStatusText(grant)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedGrant && (
        <RevokeAccessModal
          isOpen={showRevokeModal}
          onClose={() => {
            setShowRevokeModal(false);
            setSelectedGrant(null);
          }}
          grant={selectedGrant}
          onSuccess={onUpdate}
        />
      )}
    </div>
  );
};
