import React from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { BaseModal } from './BaseModal';
import { CheckCircle } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  loading?: boolean;
  showConfetti?: boolean;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Great!',
  onConfirm,
  loading = false,
  showConfetti = true
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
        type="success"
        title={title}
        message={message}
        onClose={onClose}
        className="relative overflow-hidden"
      >
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  y: -20, 
                  x: Math.random() * 400 - 200,
                  rotate: 0 
                }}
                animate={{ 
                  opacity: [0, 1, 0], 
                  y: 400, 
                  rotate: 360 
                }}
                transition={{ 
                  duration: 3, 
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                className={`
                  absolute w-2 h-2 rounded-full
                  ${i % 4 === 0 ? 'bg-green-400' : 
                    i % 4 === 1 ? 'bg-blue-400' : 
                    i % 4 === 2 ? 'bg-yellow-400' : 'bg-pink-400'}
                `}
                style={{
                  left: `${20 + (i % 5) * 15}%`,
                  top: '-10px'
                }}
              />
            ))}
          </div>
        )}

        {/* Success Icon Animation */}
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ 
              duration: 0.6, 
              times: [0, 0.6, 1],
              ease: "easeOut"
            }}
            className="relative"
          >
            <CheckCircle className="w-16 h-16 text-green-500" />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 0], opacity: [0, 0.6, 0] }}
              transition={{ 
                duration: 1, 
                delay: 0.3,
                ease: "easeOut"
              }}
              className="absolute inset-0 rounded-full bg-green-400"
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
              bg-green-600 hover:bg-green-700 text-white
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
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