import React from 'react';
import { User, Calendar, Phone, MapPin, AlertTriangle } from 'lucide-react';

interface PatientInfoPhaseProps {
  data: any;
  appointment: any;
  onUpdate: (field: string, value: any) => void;
}

export const PatientInfoPhase: React.FC<PatientInfoPhaseProps> = ({ data, appointment, onUpdate }) => {
  const patient = appointment.patientDetails;
  const profile = patient?.user?.profileData || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-medical-600" />
          Patient Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {profile.fullName || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {profile.age || 'N/A'} years
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {profile.gender || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {profile.bloodType || 'N/A'}
              </div>
            </div>
          </div>

          {/* Contact & Additional */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {profile.phoneNumber || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {profile.address || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Allergies Warning */}
        {data.allergies && data.allergies.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Known Allergies</h3>
                <ul className="mt-2 space-y-1">
                  {data.allergies.map((allergy: string, index: number) => (
                    <li key={index} className="text-red-800">• {allergy}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Current Medications */}
        {data.currentMedications && data.currentMedications.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Current Medications</h3>
            <ul className="space-y-1">
              {data.currentMedications.map((med: any, index: number) => (
                <li key={index} className="text-blue-800">
                  • {med.name} - {med.dose} ({med.frequency})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Reason for Visit */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Visit</label>
          <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-gray-900">
            {appointment.reason || 'Not specified'}
          </div>
        </div>

        {/* Vital Signs from Nurse */}
        {data.vitalSigns && Object.keys(data.vitalSigns).length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Vital Signs (From Nurse)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.vitalSigns.bloodPressure && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Blood Pressure</div>
                  <div className="text-lg font-semibold text-gray-900">{data.vitalSigns.bloodPressure}</div>
                </div>
              )}
              {data.vitalSigns.pulse && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Pulse</div>
                  <div className="text-lg font-semibold text-gray-900">{data.vitalSigns.pulse} bpm</div>
                </div>
              )}
              {data.vitalSigns.temperature && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Temperature</div>
                  <div className="text-lg font-semibold text-gray-900">{data.vitalSigns.temperature}°C</div>
                </div>
              )}
              {data.vitalSigns.oxygenSaturation && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">SpO2</div>
                  <div className="text-lg font-semibold text-gray-900">{data.vitalSigns.oxygenSaturation}%</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          ℹ️ Review patient information before proceeding. Click "Next" to begin history taking.
        </p>
      </div>
    </div>
  );
};
