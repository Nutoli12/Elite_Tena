import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, Eye, AlertTriangle, X } from 'lucide-react';

interface AccessGrantedBannerProps {
  patientName: string;
  expiresAt: string;
  permissions: any;
  recordsAvailable?: {
    consultations: number;
    labResults: number;
    imagingReports: number;
    medications: number;
  };
  onViewRecords?: () => void;
  onRequestExtension?: () => void;
  onDismiss?: () => void;
}

export const AccessGrantedBanner: React.FC<AccessGrantedBannerProps> = ({
  patientName,
  expiresAt,
  permissions,
  recordsAvailable,
  onViewRecords,
  onRequestExtension,
  onDismiss
}) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsExpiringSoon(hours < 2);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}d ${hours % 24}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const activePermissions = Object.entries(permissions)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative overflow-hidden rounded-2xl shadow-lg mb-6 ${
          isExpiringSoon
            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300'
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
        }`}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
        </div>

        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  {isExpiringSoon ? (
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  )}
                </motion.div>
                <div>
                  <h3 className={`text-xl font-bold ${isExpiringSoon ? 'text-yellow-900' : 'text-green-900'}`}>
                    {isExpiringSoon ? '⚠️ Access Expiring Soon' : '✅ Access Granted'}
                  </h3>
                  <p className={`text-sm ${isExpiringSoon ? 'text-yellow-700' : 'text-green-700'}`}>
                    Patient: <span className="font-semibold">{patientName}</span>
                  </p>
                </div>
              </div>

              {/* Time Remaining */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`px-4 py-2 rounded-xl ${
                  isExpiringSoon ? 'bg-yellow-200' : 'bg-green-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${isExpiringSoon ? 'text-yellow-700' : 'text-green-700'}`} />
                    <motion.span
                      key={timeRemaining}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className={`font-bold text-lg ${isExpiringSoon ? 'text-yellow-900' : 'text-green-900'}`}
                    >
                      {timeRemaining}
                    </motion.span>
                  </div>
                  <p className={`text-xs ${isExpiringSoon ? 'text-yellow-700' : 'text-green-700'} mt-1`}>
                    Expires: {new Date(expiresAt).toLocaleString()}
                  </p>
                </div>

                {/* Records Available */}
                {recordsAvailable && (
                  <div className="flex gap-3">
                    {recordsAvailable.consultations > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{recordsAvailable.consultations}</p>
                        <p className="text-xs text-gray-600">Consultations</p>
                      </div>
                    )}
                    {recordsAvailable.labResults > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{recordsAvailable.labResults}</p>
                        <p className="text-xs text-gray-600">Lab Results</p>
                      </div>
                    )}
                    {recordsAvailable.imagingReports > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{recordsAvailable.imagingReports}</p>
                        <p className="text-xs text-gray-600">Imaging</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Permissions */}
              <div className="mb-4">
                <p className={`text-sm font-medium mb-2 ${isExpiringSoon ? 'text-yellow-800' : 'text-green-800'}`}>
                  ✅ You Can:
                </p>
                <div className="flex flex-wrap gap-2">
                  {activePermissions.slice(0, 4).map((permission) => (
                    <span
                      key={permission}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isExpiringSoon
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {permission.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  ))}
                  {activePermissions.length > 4 && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      +{activePermissions.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Restrictions */}
              <div className={`p-3 rounded-lg ${isExpiringSoon ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <p className={`text-xs ${isExpiringSoon ? 'text-yellow-800' : 'text-green-800'}`}>
                  ⚠️ <span className="font-medium">Restrictions:</span> Cannot share records • Cannot export data • 
                  Access logs recorded • Auto-revoke at expiry
                </p>
              </div>
            </div>

            {/* Dismiss Button */}
            {onDismiss && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onDismiss}
                className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {onViewRecords && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onViewRecords}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isExpiringSoon
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Eye className="w-5 h-5" />
                View Records
              </motion.button>
            )}

            {onRequestExtension && isExpiringSoon && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRequestExtension}
                className="px-6 py-3 bg-white border-2 border-yellow-600 text-yellow-700 rounded-xl font-semibold hover:bg-yellow-50 transition-colors flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                Request Extension
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
