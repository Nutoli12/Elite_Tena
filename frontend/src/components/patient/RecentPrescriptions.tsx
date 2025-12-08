import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle } from 'lucide-react';

export const RecentPrescriptions: React.FC = () => {
  const prescriptions = [
    {
      id: 1,
      medication: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      status: 'active',
      refills: 2
    },
    {
      id: 2,
      medication: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      status: 'filled',
      refills: 1
    },
    {
      id: 3,
      medication: 'Amoxicillin',
      dosage: '250mg',
      frequency: 'Three times daily',
      status: 'active',
      refills: 0
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="medical-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Prescriptions</h3>
        <a href="/prescriptions" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
          View All →
        </a>
      </div>

      <div className="space-y-3">
        {prescriptions.map((prescription, index) => (
          <motion.div
            key={prescription.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            whileHover={{ x: 5 }}
            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              prescription.status === 'active' ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              {prescription.status === 'active' ? (
                <Clock className="w-5 h-5 text-yellow-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{prescription.medication}</p>
              <p className="text-sm text-gray-600">{prescription.dosage} - {prescription.frequency}</p>
            </div>

            {prescription.refills > 0 && (
              <div className="text-xs text-medical-600 font-medium">
                {prescription.refills} refills
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
