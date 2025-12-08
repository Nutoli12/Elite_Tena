import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Heart, Droplet, Weight } from 'lucide-react';

export const HealthMetrics: React.FC = () => {
  const metrics = [
    {
      label: 'Heart Rate',
      value: '72',
      unit: 'bpm',
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      status: 'normal',
      trend: 'stable'
    },
    {
      label: 'Blood Pressure',
      value: '120/80',
      unit: 'mmHg',
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      status: 'normal',
      trend: 'down'
    },
    {
      label: 'Blood Sugar',
      value: '95',
      unit: 'mg/dL',
      icon: Droplet,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      status: 'normal',
      trend: 'stable'
    },
    {
      label: 'Weight',
      value: '70',
      unit: 'kg',
      icon: Weight,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      status: 'normal',
      trend: 'up'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="medical-card p-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Health Metrics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          
          return (
            <motion.div
              key={metric.label}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  transition: { duration: 2, repeat: Infinity, delay: index * 0.2 }
                }}
                className={`w-12 h-12 ${metric.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}
              >
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </motion.div>
              
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.value}
                <span className="text-sm font-normal text-gray-500 ml-1">{metric.unit}</span>
              </div>
              
              <div className="text-xs text-gray-600 mb-2">{metric.label}</div>
              
              <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                metric.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {metric.status}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
