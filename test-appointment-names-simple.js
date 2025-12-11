#!/usr/bin/env node

/**
 * Test appointment data directly from database
 */

import db from './server/src/models/index.js';

const targetWallet = '0x1764894073908ypl7fp';

console.log(`🔍 Testing appointment data for: ${targetWallet}`);

try {
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
  
  console.log(`✅ Found ${appointments.length} appointments with full data:`);
  
  appointments.forEach((appointment, index) => {
    console.log(`\n📅 Appointment ${index + 1}:`);
    console.log(`   Date: ${new Date(appointment.appointmentDate).toLocaleDateString()}`);
    console.log(`   Reason: ${appointment.reason || 'General consultation'}`);
    
    // Patient info
    if (appointment.patientDetails && appointment.patientDetails.user) {
      let patientName = 'No name';
      try {
        const profileData = JSON.parse(appointment.patientDetails.user.profileData);
        patientName = profileData.name || 'No name';
      } catch (e) {
        patientName = 'No name';
      }
      console.log(`   Patient: ${patientName} (${appointment.patientDetails.user.email})`);
    } else {
      console.log(`   Patient: ${appointment.patientWalletAddress} (no user data)`);
    }
    
    // Doctor info
    if (appointment.doctorDetails && appointment.doctorDetails.user) {
      let doctorName = 'No name';
      try {
        const profileData = JSON.parse(appointment.doctorDetails.user.profileData);
        doctorName = profileData.name || 'No name';
      } catch (e) {
        doctorName = 'No name';
      }
      const specialization = appointment.doctorDetails.specialization || 'General';
      console.log(`   Doctor: ${doctorName} (${specialization})`);
    } else {
      console.log(`   Doctor: ${appointment.doctorWalletAddress} (no user data)`);
    }
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}