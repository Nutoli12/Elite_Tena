import React from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { BaseModal } from './BaseModal';
import { Info } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  loading?: boolean;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Got it',
  onConfirm,
  loading = false
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="md"
      showCloseButton={false}
    >
      <BaseModal
        type="info"
        title={title}
        message={message}
        onClose={onClose}
      >
        {/* Info Icon Animation */}
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              damping: 15,
              stiffness: 300
            }}
            className="relative"
          >
            <Info className="w-16 h-16 text-blue-500" />
            <motion.div
              animate={{ 
                rotate: 360
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 rounded-full border-2 border-blue-200 border-t-blue-500"
            />
          </motion.div>
        </div>

        {/* Footer */}
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            disabled={loading}
            className="
              px-8 py-3 rounded-xl font-semibold
              bg-blue-600 hover:bg-blue-700 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg hover:shadow-xl
            "
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              confirmText
            )}
          </motion.button>
        </div>
      </BaseModal>
    </Modal>
  );
};