import React from 'react';
import { motion } from 'framer-motion';

interface DarkModeButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const DarkModeButton: React.FC<DarkModeButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: `
      bg-medical-500 hover:bg-medical-600 
      dark:bg-medical-600 dark:hover:bg-medical-700
      text-white
      shadow-lg hover:shadow-xl
    `,
    secondary: `
      bg-gray-100 hover:bg-gray-200 
      dark:bg-slate-700 dark:hover:bg-slate-600
      text-gray-900 dark:text-gray-100
      border border-gray-300 dark:border-slate-600
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 
      dark:hover:bg-slate-700
      text-gray-700 dark:text-gray-300
      hover:text-gray-900 dark:hover:text-gray-100
    `,
    danger: `
      bg-red-500 hover:bg-red-600 
      dark:bg-red-600 dark:hover:bg-red-700
      text-white
      shadow-lg hover:shadow-xl
    `
  };

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `;

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClasses}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};