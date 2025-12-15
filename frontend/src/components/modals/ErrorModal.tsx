import React from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { BaseModal } from './BaseModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  onRetry?: () => void;
  retryText?: string;
  loading?: boolean;
  showRetry?: boolean;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'OK',
  onConfirm,
  onRetry,
  retryText = 'Try Again',
  loading = false,
  showRetry = false
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  const handleRetry = async () => {
    if (onRetry) {
      await onRetry();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="md"
      showCloseButton={false}
    >
      <BaseModal
        type="error"
        title={title}
        message={message}
        onClose={onClose}
        className="relative"
      >
        {/* Error Icon Animation */}
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              damping: 10,
              stiffness: 200
            }}
            className="relative"
          >
            <AlertCircle className="w-16 h-16 text-red-500" />
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-red-400 opacity-20"
            />
          </motion.div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-3">
          {showRetry && onRetry && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
              disabled={loading}
              className="
                px-6 py-3 rounded-xl font-semibold
                border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-700
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
              "
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {retryText}
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            disabled={loading}
            className="
              px-8 py-3 rounded-xl font-semibold
              bg-red-600 hover:bg-red-700 text-white
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg hover:shadow-xl
            "
          >
            {confirmText}
          </motion.button>
        </div>
      </BaseModal>
    </Modal>
  );
};