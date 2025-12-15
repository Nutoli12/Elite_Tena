import React from 'react';
import { motion } from 'framer-motion';

interface DarkModeCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const DarkModeCard: React.FC<DarkModeCardProps> = ({ 
  children, 
  className = '', 
  hover = true,
  padding = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = `
    bg-white dark:bg-slate-800 
    border border-gray-200 dark:border-slate-700 
    rounded-xl shadow-sm dark:shadow-lg
    transition-all duration-300
    ${paddingClasses[padding]}
    ${className}
  `;

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        className={`${baseClasses} hover:shadow-md dark:hover:shadow-xl hover:border-gray-300 dark:hover:border-dark-600`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
};