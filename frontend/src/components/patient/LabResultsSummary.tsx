import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock } from 'lucide-react';

export const LabResultsSummary: React.FC = () => {
  const results = [
    {
      id: 1,
      testName: 'Complete Blood Count',
      date: '2024-01-15',
      status: 'approved',
      result: 'Normal'
    },
    {
      id: 2,
      testName: 'Lipid Panel',
      date: '2024-01-18',
      status: 'pending',
      result: 'Pending Review'
    },
    {
      id: 3,
      testName: 'Glucose Test',
      date: '2024-01-12',
      status: 'approved',
      result: 'Normal'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7 }}
      className="medical-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Lab Results</h3>
        <a href="/lab-results" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
          View All →
        </a>
      </div>

      <div className="space-y-3">
        {results.map((result, index) => (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            whileHover={{ x: 5 }}
            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              result.status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {result.status === 'approved' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{result.testName}</p>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{result.date}</span>
                <span>•</span>
                <span className={result.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}>
                  {result.result}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
