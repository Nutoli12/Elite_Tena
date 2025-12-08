import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertCircle, Send } from 'lucide-react';
import { RequestAccessModal } from '../modals/RequestAccessModal';

interface NoAccessViewProps {
  patientName?: string;
  patientWalletAddress: string;
  message?: string;
  onAccessGranted?: () => void;
}

export const NoAccessView: React.FC<NoAccessViewProps> = ({
  patientName,
  patientWalletAddress,
  message,
  onAccessGranted
}) => {
  const [showRequestModal, setShowRequestModal] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[600px]"
      >
        <div className="max-w-2xl w-full">
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="medical-card p-12 text-center"
          >
            {/* Lock Icon */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center"
            >
              <Lock className="w-12 h-12 text-yellow-600" />
            </motion.div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🔒 Access Required
            </h2>

            {/* Message */}
            <p className="text-lg text-gray-700 mb-6">
              {message || `You need patient consent to view ${patientName ? `${patientName}'s` : 'these'} medical records.`}
            </p>

            {/* Info Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Why do I need consent?</h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Patients control access to their healthcare data</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>All access is time-limited and logged for security</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>You can request access and the patient will be notified</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Once granted, you'll have full access for the approved duration</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRequestModal(true)}
                className="px-8 py-4 bg-medical-600 text-white rounded-xl font-semibold hover:bg-medical-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Send className="w-5 h-5" />
                Request Access
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.history.back()}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Go Back
              </motion.button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Your request will be sent securely and logged for compliance</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Request Access Modal */}
      <RequestAccessModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        patientWalletAddress={patientWalletAddress}
        onSuccess={() => {
          setShowRequestModal(false);
          onAccessGranted?.();
        }}
      />
    </>
  );
};
