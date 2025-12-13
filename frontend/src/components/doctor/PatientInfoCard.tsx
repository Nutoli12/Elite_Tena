import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Calendar, 
  Heart, 
  AlertTriangle, 
  Pill, 
  Clock,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface PatientInfoCardProps {
  appointment: any;
  showVitals?: boolean;
  compact?: boolean;
}

export const PatientInfoCard: React.FC<PatientInfoCardProps> = ({ 
  appointment, 
  showVitals = false, 
  compact = false 
}) => {
  // Extract patient information from various sources
  const getPatientInfo = () => {
    const patientDetails = appointment.patientDetails;
    const patientUser = appointment.patientUser || appointment.patientDetails?.user;
    const profileData = patientUser?.profileData || {};
    
    // 🎂 Use calculated age from API response (patientInfo) if available
    const calculatedAge = appointment.patientInfo?.age;
    const ageFormatted = appointment.patientInfo?.ageFormatted;
    
    // Fallback to local calculation if API doesn't provide age
    const fallbackAge = patientDetails?.dateOfBirth ? 
           Math.floor((new Date().getTime() - new Date(patientDetails.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
           null;
    
    return {
      name: appointment.patientInfo?.name || 
            patientDetails?.name || 
            profileData?.fullName || 
            profileData?.firstName + ' ' + profileData?.lastName ||
            'Unknown Patient',
      age: calculatedAge !== null ? calculatedAge : fallbackAge,
      ageFormatted: ageFormatted || (calculatedAge !== null ? `${calculatedAge} years old` : (fallbackAge ? `${fallbackAge} years old` : 'Age unknown')),
      gender: profileData?.gender || 'Not specified',
      bloodType: patientDetails?.bloodType || 'Unknown',
      allergies: patientDetails?.allergies || [],
      currentMeds: patientDetails?.currentMedications || [],
      email: patientUser?.email,
      phone: profileData?.phone,
      walletAddress: appointment.patientWalletAddress
    };
  };

  const getUrgencyLevel = () => {
    // Determine urgency based on reason and other factors
    const reason = appointment.reason?.toLowerCase() || '';
    if (reason.includes('emergency') || reason.includes('urgent') || reason.includes('chest pain')) {
      return { level: 'high', label: '🚨 Emergency', color: 'text-red-600 bg-red-50' };
    }
    if (reason.includes('pain') || reason.includes('fever') || reason.includes('bleeding')) {
      return { level: 'medium', label: '⚠️ Moderate', color: 'text-orange-600 bg-orange-50' };
    }
    return { level: 'low', label: '✅ Routine', color: 'text-green-600 bg-green-50' };
  };

  const getWaitTime = () => {
    if (appointment.checkedInAt) {
      const waitMinutes = Math.floor((new Date().getTime() - new Date(appointment.checkedInAt).getTime()) / (1000 * 60));
      return waitMinutes;
    }
    return appointment.estimatedWaitTime || 0;
  };

  const patient = getPatientInfo();
  const urgency = getUrgencyLevel();
  const waitTime = getWaitTime();

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-lg border border-gray-200 p-4"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-medical-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-medical-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{patient.name}</h4>
            <p className="text-sm text-gray-600">
              {patient.ageFormatted} • {patient.gender}
            </p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${urgency.color}`}>
            {urgency.label}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
    >
      {/* Patient Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-medical-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {patient.ageFormatted}
              </span>
              <span>•</span>
              <span>{patient.gender}</span>
              {patient.bloodType !== 'Unknown' && (
                <>
                  <span>•</span>
                  <span className="flex items-center">
                    <Heart className="w-4 h-4 mr-1 text-red-500" />
                    {patient.bloodType}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Urgency Badge */}
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${urgency.color}`}>
          {urgency.label}
        </div>
      </div>

      {/* Appointment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900">Visit Information</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-700 w-20">Reason:</span>
              <span className="text-gray-600">{appointment.reason || 'General consultation'}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium text-gray-700 w-20">Type:</span>
              <span className="text-gray-600 capitalize">
                {appointment.serviceType === 'inPerson' ? 'In-Person' : 
                 appointment.serviceType === 'videoCall' ? 'Video Call' : 'Chat'}
              </span>
            </div>
            {appointment.checkInStatus === 'checked_in' && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-orange-500" />
                <span className="text-orange-600 font-medium">
                  Waiting: {waitTime} minutes
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900">Contact</h4>
          <div className="space-y-1 text-sm">
            {patient.email && (
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-gray-600">{patient.email}</span>
              </div>
            )}
            {patient.phone && (
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-gray-600">{patient.phone}</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="font-mono text-xs text-gray-500">
                {patient.walletAddress.substring(0, 10)}...
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Alerts */}
      {(patient.allergies.length > 0 || patient.currentMeds.length > 0) && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">Medical Alerts</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patient.allergies.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                  <span className="font-medium text-red-800">Allergies</span>
                </div>
                <div className="space-y-1">
                  {patient.allergies.map((allergy, index) => (
                    <span key={index} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-1">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {patient.currentMeds.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Pill className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">Current Medications</span>
                </div>
                <div className="space-y-1">
                  {patient.currentMeds.map((med, index) => (
                    <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                      {med}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vital Signs Preview (if available) */}
      {showVitals && appointment.vitalSigns && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">Latest Vital Signs</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {appointment.vitalSigns.bloodPressure && (
              <div className="text-center">
                <div className="font-medium text-gray-900">{appointment.vitalSigns.bloodPressure}</div>
                <div className="text-gray-500">BP (mmHg)</div>
              </div>
            )}
            {appointment.vitalSigns.pulse && (
              <div className="text-center">
                <div className="font-medium text-gray-900">{appointment.vitalSigns.pulse}</div>
                <div className="text-gray-500">Pulse (bpm)</div>
              </div>
            )}
            {appointment.vitalSigns.temperature && (
              <div className="text-center">
                <div className="font-medium text-gray-900">{appointment.vitalSigns.temperature}°C</div>
                <div className="text-gray-500">Temperature</div>
              </div>
            )}
            {appointment.vitalSigns.oxygenSaturation && (
              <div className="text-center">
                <div className="font-medium text-gray-900">{appointment.vitalSigns.oxygenSaturation}%</div>
                <div className="text-gray-500">SpO2</div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};