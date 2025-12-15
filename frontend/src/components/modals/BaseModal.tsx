import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  X
} from 'lucide-react';

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface BaseModalProps {
  type: ModalType;
  title: string;
  message: string;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  type,
  title,
  message,
  onClose,
  children,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-500" />;
      case 'confirm':
        return <AlertTriangle className="w-8 h-8 text-blue-500" />;
      default:
        return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          headerBg: 'bg-green-100 dark:bg-green-900/30'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          headerBg: 'bg-red-100 dark:bg-red-900/30'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          headerBg: 'bg-amber-100 dark:bg-amber-900/30'
        };
      case 'info':
      case 'confirm':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          headerBg: 'bg-blue-100 dark:bg-blue-900/30'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          headerBg: 'bg-gray-100 dark:bg-gray-700'
        };
    }
  };

  const colors = getColors();

  return (
    <div className={`
      ${colors.bg} ${colors.border} 
      border-2 rounded-2xl overflow-hidden
      ${className}
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between p-6 
        ${colors.headerBg}
        border-b border-gray-200 dark:border-gray-600
      `}>
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 300,
              delay: 0.1 
            }}
          >
            {getIcon()}
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold text-gray-900 dark:text-gray-100"
          >
            {title}
          </motion.h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="
            p-2 rounded-lg
            text-gray-400 hover:text-gray-600
            dark:text-gray-500 dark:hover:text-gray-300
            hover:bg-white/50 dark:hover:bg-gray-800/50
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6"
      >
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line mb-6">
          {message}
        </p>
        {children}
      </motion.div>
    </div>
  );
};