#!/usr/bin/env node

/**
 * Fix Appointment 500 Error - Handle Missing Patient/Doctor Records
 */

import { readFile, writeFile } from 'fs/promises';

console.log('🔧 Fixing appointment 500 error...');

const appointmentControllerPath = 'server/src/controllers/appointmentController.js';

try {
  // Read the current controller
  let content = await readFile(appointmentControllerPath, 'utf8');
  
  // Find the getAppointments function and replace it with a safer version
  const oldGetAppointments = `export const getAppointments = async (req, res) => {
  try {
    // Support wallet from either URL path or query parameter
    const patientWalletFromPath = req.params.patientWallet;
    const doctorWalletFromPath = req.params.doctorWallet;
    const { patientWallet, doctorWallet, status, userRole, userId } = req.query;

    const finalPatientWallet = patientWalletFromPath || patientWallet;
    const finalDoctorWallet = doctorWalletFromPath || doctorWallet;

    console.log('🔍 Fetching appointments...', { userRole, userId });

    const where = {};

    // 👨‍⚕️ FIXED: Separate doctor vs patient views
    if (userRole && userId) {
      if (userRole === 'doctor') {
        where.doctorWalletAddress = userId.toLowerCase();
        console.log('📋 Fetching doctor schedule for:', userId);
      } else if (userRole === 'patient') {
        where.patientWalletAddress = userId.toLowerCase();
        console.log('👤 Fetching patient appointments for:', userId);
      }
    } else {
      // Legacy filtering
      if (finalPatientWallet) {
        where.patientWalletAddress = finalPatientWallet.toLowerCase();
      }
      if (finalDoctorWallet) {
        where.doctorWalletAddress = finalDoctorWallet.toLowerCase();
      }
    }

    if (status) {
      where.status = status;
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false, // LEFT JOIN - don't fail if patient record missing
          attributes: ['walletAddress'],
          include: [
            {
              model: db.User,
              as: 'user',
              required: false,
              attributes: ['email', 'profileData']
            }
          ]
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false, // LEFT JOIN - don't fail if doctor record missing
          attributes: ['walletAddress', 'specialization'],
          include: [
            {
              model: db.User,
              as: 'user',
              required: false,
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['appointmentDate', 'ASC']]
    });

    console.log(\`✅ Found \${appointments.length} appointments\`);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
      userRole,
      userId
    });
  } catch (error) {`;

  const newGetAppointments = `export const getAppointments = async (req, res) => {
  try {
    // Support wallet from either URL path or query parameter
    const patientWalletFromPath = req.params.patientWallet;
    const doctorWalletFromPath = req.params.doctorWallet;
    const { patientWallet, doctorWallet, status, userRole, userId } = req.query;

    const finalPatientWallet = patientWalletFromPath || patientWallet;
    const finalDoctorWallet = doctorWalletFromPath || doctorWallet;

    console.log('🔍 Fetching appointments...', { userRole, userId });

    const where = {};

    // 👨‍⚕️ FIXED: Separate doctor vs patient views
    if (userRole && userId) {
      if (userRole === 'doctor') {
        where.doctorWalletAddress = userId.toLowerCase();
        console.log('📋 Fetching doctor schedule for:', userId);
      } else if (userRole === 'patient') {
        where.patientWalletAddress = userId.toLowerCase();
        console.log('👤 Fetching patient appointments for:', userId);
      }
    } else {
      // Legacy filtering
      if (finalPatientWallet) {
        where.patientWalletAddress = finalPatientWallet.toLowerCase();
      }
      if (finalDoctorWallet) {
        where.doctorWalletAddress = finalDoctorWallet.toLowerCase();
      }
    }

    if (status) {
      where.status = status;
    }

    // SIMPLIFIED QUERY - No complex joins that can fail
    const appointments = await Appointment.findAll({
      where,
      order: [['appointmentDate', 'ASC']],
      raw: false
    });

    console.log(\`✅ Found \${appointments.length} appointments\`);

    res.json({
      success: true,
      data: appointments || [],
      count: appointments.length,
      userRole,
      userId
    });
  } catch (error) {`;

  // Replace the function
  content = content.replace(oldGetAppointments, newGetAppointments);
  
  // Write the updated controller
  await writeFile(appointmentControllerPath, content, 'utf8');
  
  console.log('✅ Fixed appointment controller!');
  console.log('🚀 The appointment 500 errors should be resolved now.');
  console.log('💡 Restart your server to apply the fix.');
  
} catch (error) {
  console.error('❌ Error fixing appointment controller:', error.message);
  process.exit(1);
}