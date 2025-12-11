import React from 'react';
import { motion } from 'framer-motion';
import type { QuickAction } from '../../services/navigationService';

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: number;
  delay?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
  columns = 4,
  delay = 0.8
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-2 md:grid-cols-3';
      case 4: return 'grid-cols-2 md:grid-cols-4';
      case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
      default: return 'grid-cols-2 md:grid-cols-4';
    }
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'purple':
        return 'border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100';
      case 'blue':
        return 'border-blue-200 bg-blue-50 hover:border-blue-500 hover:bg-blue-100';
      case 'green':
        return 'border-green-200 bg-green-50 hover:border-green-500 hover:bg-green-100';
      case 'red':
        return 'border-red-200 bg-red-50 hover:border-red-500 hover:bg-red-100';
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50 hover:border-yellow-500 hover:bg-yellow-100';
      default:
        return 'border-gray-200 hover:border-medical-500 hover:bg-medical-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className={`grid ${getGridCols()} gap-4`}>
        {actions.map((action, index) => (
          <motion.button
            key={action.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.1 + index * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.action}
            disabled={action.disabled}
            className={`
              flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all
              ${action.disabled 
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
                : getColorClasses(action.color)
              }
            `}
            title={action.description}
          >
            <span className="text-3xl mb-2">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700 text-center">
              {action.name}
            </span>
            {action.description && (
              <span className="text-xs text-gray-500 text-center mt-1 hidden md:block">
                {action.description}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};