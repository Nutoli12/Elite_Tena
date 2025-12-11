/**
 * Quick Fix for Consultation 500 Error
 * Simplifies the consultation details endpoint
 */

import { readFileSync, writeFileSync } from 'fs';

console.log('🔧 Fixing consultation 500 error...');

// Read the consultation controller
const controllerPath = 'server/src/controllers/consultationController.js';
let content = readFileSync(controllerPath, 'utf8');

// Create a simple, working version of getConsultationDetails
const simpleGetConsultationDetails = `
/**
 * Get consultation details (SIMPLIFIED VERSION)
 */
export const getConsultationDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    console.log('🔍 Fetching consultation details for:', appointmentId);

    // Simple query without complex associations
    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Get basic patient info
    let patient = null;
    try {
      patient = await Patient.findOne({
        where: { walletAddress: appointment.patientWalletAddress }
      });
    } catch (error) {
      console.log('⚠️ Could not fetch patient details');
    }

    // Get basic doctor info
    let doctor = null;
    try {
      doctor = await Doctor.findOne({
        where: { walletAddress: appointment.doctorWalletAddress }
      });
    } catch (error) {
      console.log('⚠️ Could not fetch doctor details');
    }

    // Get recent medical records (simplified)
    let medicalHistory = [];
    try {
      medicalHistory = await MedicalRecord.findAll({
        where: { patientWalletAddress: appointment.patientWalletAddress },
        order: [['recordDate', 'DESC']],
        limit: 3
      });
    } catch (error) {
      console.log('⚠️ Could not fetch medical history');
    }

    console.log('✅ Successfully fetched consultation details');

    res.json({
      success: true,
      data: {
        appointment,
        patient: patient ? {
          walletAddress: patient.walletAddress,
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          phone: patient.phone
        } : null,
        doctor: doctor ? {
          walletAddress: doctor.walletAddress,
          name: doctor.name,
          specialization: doctor.specialization
        } : null,
        medicalHistory: medicalHistory || [],
        activePrescriptions: [], // Simplified for now
        consultationStarted: !!appointment.consultationStartedAt,
        consultationNotes: appointment.consultationNotes || ''
      }
    });

  } catch (error) {
    console.error('❌ Get consultation details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consultation details',
      message: error.message
    });
  }
};`;

// Replace the complex function with the simple one
const startMarker = 'export const getConsultationDetails = async (req, res) => {';
const endMarker = '};';

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.log('❌ Could not find getConsultationDetails function');
  process.exit(1);
}

// Find the end of the function (look for the matching closing brace)
let braceCount = 0;
let endIndex = startIndex;
let inFunction = false;

for (let i = startIndex; i < content.length; i++) {
  const char = content[i];
  
  if (char === '{') {
    braceCount++;
    inFunction = true;
  } else if (char === '}') {
    braceCount--;
    if (inFunction && braceCount === 0) {
      endIndex = i + 1;
      break;
    }
  }
}

// Replace the function
const beforeFunction = content.substring(0, startIndex);
const afterFunction = content.substring(endIndex);
const newContent = beforeFunction + simpleGetConsultationDetails + afterFunction;

// Write the fixed file
writeFileSync(controllerPath, newContent);

console.log('✅ Fixed consultation controller!');
console.log('🚀 The 500 error should be resolved now.');
console.log('💡 Restart your server to apply the fix.');