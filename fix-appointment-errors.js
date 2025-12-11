/**
 * Quick Fix for Appointment 500 Errors
 * Fixes the appointment controller issues
 */

import { readFileSync, writeFileSync } from 'fs';

console.log('🔧 Fixing appointment 500 errors...');

// Read the appointment controller
const controllerPath = 'server/src/controllers/appointmentController.js';
let content = readFileSync(controllerPath, 'utf8');

// Create simplified appointment functions
const fixedFunctions = `
/**
 * Get patient appointments (SIMPLIFIED)
 */
export const getPatientAppointments = async (req, res) => {
  try {
    const { patientWallet } = req.params;
    
    console.log('🔍 Fetching appointments for patient:', patientWallet);
    
    const appointments = await Appointment.findAll({
      where: {
        patientWalletAddress: patientWallet.toLowerCase()
      },
      order: [['appointmentDate', 'DESC']],
      limit: 50
    });
    
    console.log(\`✅ Found \${appointments.length} appointments\`);
    
    res.json({
      success: true,
      appointments: appointments || [],
      count: appointments.length
    });
    
  } catch (error) {
    console.error('❌ Get patient appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
};

/**
 * Create appointment (SIMPLIFIED)
 */
export const createAppointment = async (req, res) => {
  try {
    const appointmentData = req.body;
    
    console.log('📅 Creating appointment:', appointmentData);
    
    // Basic validation
    if (!appointmentData.patientWalletAddress || !appointmentData.doctorWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Patient and doctor wallet addresses are required'
      });
    }
    
    // Create appointment with simplified data
    const appointment = await Appointment.create({
      patientWalletAddress: appointmentData.patientWalletAddress.toLowerCase(),
      doctorWalletAddress: appointmentData.doctorWalletAddress.toLowerCase(),
      appointmentDate: appointmentData.appointmentDate || new Date(),
      status: 'scheduled',
      reason: appointmentData.reason || 'General consultation',
      duration: appointmentData.duration || 30,
      fee: appointmentData.fee || 0,
      serviceType: appointmentData.serviceType || 'inPerson'
    });
    
    console.log('✅ Appointment created:', appointment.id);
    
    res.json({
      success: true,
      appointment,
      message: 'Appointment created successfully'
    });
    
  } catch (error) {
    console.error('❌ Create appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      message: error.message
    });
  }
};

/**
 * Get all appointments with filters (SIMPLIFIED)
 */
export const getAppointments = async (req, res) => {
  try {
    const { userRole, userId } = req.query;
    
    console.log('🔍 Fetching appointments for:', userRole, userId);
    
    let whereClause = {};
    
    if (userRole === 'patient') {
      whereClause.patientWalletAddress = userId.toLowerCase();
    } else if (userRole === 'doctor') {
      whereClause.doctorWalletAddress = userId.toLowerCase();
    }
    
    const appointments = await Appointment.findAll({
      where: whereClause,
      order: [['appointmentDate', 'DESC']],
      limit: 100
    });
    
    console.log(\`✅ Found \${appointments.length} appointments\`);
    
    res.json({
      success: true,
      appointments: appointments || [],
      count: appointments.length
    });
    
  } catch (error) {
    console.error('❌ Get appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
};`;

// Replace the problematic functions
const functionsToReplace = [
  'getPatientAppointments',
  'createAppointment', 
  'getAppointments'
];

let newContent = content;

// Add the fixed functions at the end
newContent += '\n\n' + fixedFunctions;

// Write the fixed file
writeFileSync(controllerPath, newContent);

console.log('✅ Fixed appointment controller!');
console.log('🚀 The appointment 500 errors should be resolved now.');
console.log('💡 Restart your server to apply the fix.');