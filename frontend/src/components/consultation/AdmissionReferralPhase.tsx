import React from 'react';
import { Shield } from 'lucide-react';

interface AdmissionReferralPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const AdmissionReferralPhase: React.FC<AdmissionReferralPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-medical-600" />
          Admission & Referral
        </h2>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="admissionRequired"
              checked={data.admissionRequired || false}
              onChange={(e) => onUpdate('admissionRequired', e.target.checked)}
              className="w-4 h-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500"
            />
            <label htmlFor="admissionRequired" className="text-sm font-medium text-gray-700">
              Admission Required
            </label>
          </div>

          {data.admissionRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Orders</label>
              <textarea
                value={data.activityOrders || ''}
                onChange={(e) => onUpdate('activityOrders', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
                rows={3}
                placeholder="Activity restrictions and orders..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};