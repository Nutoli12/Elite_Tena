import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  autoClose = true,
  autoCloseDelay = 5000
}) => {
  // Auto close functionality
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          icon: CheckCircle,
          defaultTitle: 'Success'
        };
      case 'error':
        return {
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          icon: XCircle,
          defaultTitle: 'Error'
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
          icon: AlertTriangle,
          defaultTitle: 'Warning'
        };
      default:
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          icon: Info,
          defaultTitle: 'Information'
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={`relative max-w-md w-full rounded-lg shadow-xl border-2 ${config.bgColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-opacity-20">
              <div className="flex items-center space-x-3">
                <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
                <h3 className={`font-semibold text-lg ${config.textColor}`}>
                  {title || config.defaultTitle}
                </h3>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors ${config.textColor}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <p className={`${config.textColor} leading-relaxed`}>
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-opacity-20 flex justify-end space-x-3">
              {autoClose && (
                <div className={`text-sm ${config.textColor} opacity-70 flex items-center`}>
                  Auto-closes in {Math.ceil(autoCloseDelay / 1000)}s
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${config.buttonColor}`}
              >
                OK
              </motion.button>
            </div>

            {/* Progress bar for auto-close */}
            {autoClose && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
                className={`h-1 ${config.buttonColor.split(' ')[0]} opacity-30`}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};