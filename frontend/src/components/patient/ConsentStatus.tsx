import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export const ConsentStatusWidget: React.FC = () => {
  const consents = [
    {
      id: 1,
      provider: 'Dr. Alemayehu',
      type: 'Medical Records',
      status: 'active',
      expires: '2024-01-22'
    },
    {
      id: 2,
      provider: 'City Laboratory',
      type: 'Lab Results',
      status: 'active',
      expires: '2024-02-10'
    },
    {
      id: 3,
      provider: 'Health Plus Pharmacy',
      type: 'Prescriptions',
      status: 'expired',
      expires: '2024-01-01'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8 }}
      className="medical-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Consent Status</h3>
        <a href="/consent" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
          Manage →
        </a>
      </div>

      <div className="space-y-3">
        {consents.map((consent, index) => (
          <motion.div
            key={consent.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + index * 0.1 }}
            whileHover={{ x: 5 }}
            className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-medical-600" />
                <p className="font-medium text-gray-900 text-sm">{consent.provider}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(consent.status)}`}>
                {getStatusIcon(consent.status)}
                {consent.status}
              </span>
            </div>
            
            <p className="text-xs text-gray-600 mb-1">{consent.type}</p>
            <p className="text-xs text-gray-500">Expires: {consent.expires}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-4 pt-4 border-t border-gray-200"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Active Consents</span>
          <span className="font-semibold text-medical-600">
            {consents.filter(c => c.status === 'active').length} / {consents.length}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};
