import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Calendar, User, Hash, ExternalLink } from 'lucide-react';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    title: string;
    diagnosis: string;
    treatment: string;
    symptoms: string;
    date: string;
    doctorId: string;
    doctorName?: string;
    ipfsHash?: string;
    blockchainTxHash?: string;
  };
}

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  record
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-2xl w-full pointer-events-auto bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-medical-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-medical-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Medical Record Details</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Record Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Title:</span>
                    <p className="text-gray-900 font-medium">{record.title}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{record.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{record.doctorName || `Dr. ${record.doctorId.substring(0, 8)}...`}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Details */}
              <div className="space-y-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Diagnosis</h4>
                  <p className="text-gray-700">{record.diagnosis}</p>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Treatment</h4>
                  <p className="text-gray-700">{record.treatment}</p>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h4 className="font-semibold text-amber-800 mb-2">Symptoms</h4>
                  <p className="text-gray-700">{record.symptoms}</p>
                </div>
              </div>

              {/* Blockchain Information */}
              {(record.ipfsHash || record.blockchainTxHash) && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Blockchain Verification
                  </h4>
                  <div className="space-y-3">
                    {record.ipfsHash && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">IPFS Hash:</span>
                        <p className="text-gray-900 font-mono text-sm break-all bg-white p-2 rounded border">
                          {record.ipfsHash}
                        </p>
                      </div>
                    )}
                    {record.blockchainTxHash && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Transaction Hash:</span>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-mono text-sm break-all bg-white p-2 rounded border flex-1">
                            {record.blockchainTxHash}
                          </p>
                          {!record.blockchainTxHash.startsWith('0xLEGACY') && 
                           !record.blockchainTxHash.startsWith('0xDEMO') && (
                            <button
                              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${record.blockchainTxHash}`, '_blank')}
                              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                              title="View on Etherscan"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 pt-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-6 py-3 bg-medical-600 text-white rounded-xl font-semibold hover:bg-medical-700 transition-colors"
              >
                Close
              </motion.button>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};