#!/usr/bin/env node

/**
 * Test enhanced appointment API with clear "appointedWith" information
 */

import db from './server/src/models/index.js';

const targetWallet = '0x1764894073908ypl7fp';

console.log(`🔍 Testing enhanced appointment API for: ${targetWallet}`);

try {
  // Simulate the API call by calling the same logic
  const appointments = await db.Appointment.findAll({
    where: { patientWalletAddress: targetWallet },
    include: [
      {
        model: db.Patient,
        as: 'patientDetails',
        required: false,
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
        model: db.Doctor,
        as: 'doctorDetails',
        required: false,
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
  
  // Format appointments with clear "appointedWith" information
  const formattedAppointments = appointments.map(appointment => {
    const appointmentData = appointment.toJSON();
    
    // Extract doctor information
    let doctorName = 'Unknown Doctor';
    let doctorSpecialization = 'General';
    let doctorEmail = '';
    
    if (appointment.doctorDetails && appointment.doctorDetails.user) {
      try {
        const profileData = JSON.parse(appointment.doctorDetails.user.profileData);
        doctorName = profileData.name || profileData.firstName || 'Unknown Doctor';
      } catch (e) {
        doctorName = 'Unknown Doctor';
      }
      doctorSpecialization = appointment.doctorDetails.specialization || 'General';
      doctorEmail = appointment.doctorDetails.user.email || '';
    }
    
    // Extract patient information
    let patientName = 'Unknown Patient';
    let patientEmail = '';
    
    if (appointment.patientDetails && appointment.patientDetails.user) {
      try {
        const profileData = JSON.parse(appointment.patientDetails.user.profileData);
        patientName = profileData.name || profileData.firstName || 'Unknown Patient';
      } catch (e) {
        patientName = 'Unknown Patient';
      }
      patientEmail = appointment.patientDetails.user.email || '';
    }
    
    // Add clear appointment information
    return {
      id: appointmentData.id,
      appointmentDate: appointmentData.appointmentDate,
      reason: appointmentData.reason,
      status: appointmentData.status,
      // Clear appointment information
      appointedWith: {
        name: doctorName,
        specialization: doctorSpecialization,
        email: doctorEmail,
        walletAddress: appointment.doctorWalletAddress
      },
      patientInfo: {
        name: patientName,
        email: patientEmail,
        walletAddress: appointment.patientWalletAddress
      },
      // Formatted display strings
      displayDoctor: `${doctorName} (${doctorSpecialization})`,
      displayPatient: patientName,
      appointmentSummary: `Appointment with ${doctorName} (${doctorSpecialization}) on ${new Date(appointment.appointmentDate).toLocaleDateString()}`
    };
  });
  
  console.log(`✅ Found ${formattedAppointments.length} enhanced appointments:`);
  
  formattedAppointments.forEach((appointment, index) => {
    console.log(`\n📅 Appointment ${index + 1}:`);
    console.log(`   📋 Summary: ${appointment.appointmentSummary}`);
    console.log(`   👨‍⚕️ Appointed With: ${appointment.appointedWith.name}`);
    console.log(`   🏥 Specialization: ${appointment.appointedWith.specialization}`);
    console.log(`   📧 Doctor Email: ${appointment.appointedWith.email}`);
    console.log(`   📅 Date: ${new Date(appointment.appointmentDate).toLocaleDateString()}`);
    console.log(`   📝 Reason: ${appointment.reason}`);
    console.log(`   ✅ Status: ${appointment.status}`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}