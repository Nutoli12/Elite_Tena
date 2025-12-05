import React from 'react';
import { Shield } from 'lucide-react';

interface AdmissionReferralPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const AdmissionReferralPhase: React.FC<AdmissionReferralPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Admission Required */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-medical-600" />
          Admission Required?
        </h2>
        <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={data.admissionRequired || false}
            onChange={(e) => onUpdate('admissionRequired', e.target.checked)}
            className="w-5 h-5 text-medical-600 rounded focus:ring-medical-500"
          />
          <span className="text-gray-900 font-medium">Patient requires hospital admission</span>
        </label>
      </div>

      {/* Admission Details */}
      {data.admissionRequired && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Admission Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
              <input
                type="text"
                value={data.admissionDetails?.unit || ''}
                onChange={(e) => onUpdate('admissionDetails', { ...data.admissionDetails, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                placeholder="e.g., CCU, ICU, General Ward"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bed Number</label>
              <input
                type="text"
                value={data.admissionDetails?.bed || ''}
                onChange={(e) => onUpdate('admissionDetails', { ...data.admissionDetails, bed: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                placeholder="e.g., CCU-5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Length of Stay</label>
              <input
                type="text"
                value={data.admissionDetails?.expectedLOS || ''}
                onChange={(e) => onUpdate('admissionDetails', { ...data.admissionDetails, expectedLOS: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                placeholder="e.g., 3-5 days"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={data.admissionDetails?.priority || 'routine'}
                onChange={(e) => onUpdate('admissionDetails', { ...data.admissionDetails, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Consultations Requested */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Consultations Requested</h2>
        <textarea
          value={(data.consultationsRequested || []).join('\n')}
          onChange={(e) => onUpdate('consultationsRequested', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Enter consultations (one per line)&#10;• Cardiology - Dr. Sara (Urgent)&#10;• Endocrinology - For diabetes management"
        />
      </div>

      {/* Dietary Orders */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dietary Orders</h2>
        <textarea
          value={(data.dietaryOrders || []).join('\n')}
          onChange={(e) => onUpdate('dietaryOrders', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Enter dietary orders (one per line)&#10;• Cardiac diet - Low sodium, low cholesterol&#10;• Diabetic diet - Consistent carbohydrates"
        />
      </div>

      {/* Activity Orders */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Orders</h2>
        <textarea
          value={data.activityOrders || ''}
          onChange={(e) => onUpdate('activityOrders', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="e.g., Bed rest with bathroom privileges, Continuous cardiac monitoring, Fall precautions"
        />
      </div>
    </div>
  );
};
