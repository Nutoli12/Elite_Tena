#!/usr/bin/env node

/**
 * Check specific user and their appointments
 */

import db from './server/src/models/index.js';

const targetWallet = '0x1764894073908ypl7fp';

console.log(`🔍 Checking user: ${targetWallet}`);

try {
  // Check if user exists
  const user = await db.User.findOne({
    where: { walletAddress: targetWallet }
  });
  
  if (user) {
    let profileData = {};
    try {
      profileData = user.profileData ? (typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData) : {};
    } catch (e) {
      profileData = {};
    }
    const name = profileData.name || profileData.firstName || 'No name';
    console.log(`✅ User found: ${name} (${user.email}) [${user.role}]`);
  } else {
    console.log('❌ User not found in users table');
  }
  
  // Check if patient record exists
  const patient = await db.Patient.findOne({
    where: { walletAddress: targetWallet },
    include: [
      {
        model: db.User,
        as: 'user',
        required: false
      }
    ]
  });
  
  if (patient) {
    console.log('✅ Patient record exists');
    if (patient.user) {
      let profileData = {};
      try {
        profileData = patient.user.profileData ? (typeof patient.user.profileData === 'string' ? JSON.parse(patient.user.profileData) : patient.user.profileData) : {};
      } catch (e) {
        profileData = {};
      }
      const name = profileData.name || profileData.firstName || 'No name';
      console.log(`   Patient name: ${name}`);
    } else {
      console.log('   No linked user record');
    }
  } else {
    console.log('❌ Patient record not found');
  }
  
  // Check appointments for this user
  const appointments = await db.Appointment.findAll({
    where: { patientWalletAddress: targetWallet },
    attributes: ['id', 'doctorWalletAddress', 'appointmentDate', 'reason']
  });
  
  console.log(`\n📅 Found ${appointments.length} appointments:`);
  appointments.forEach(apt => {
    console.log(`  - ${apt.id}: with ${apt.doctorWalletAddress} on ${apt.appointmentDate}`);
  });
  
  // Check if the doctors in appointments exist
  for (const apt of appointments) {
    const doctor = await db.Doctor.findOne({
      where: { walletAddress: apt.doctorWalletAddress },
      include: [
        {
          model: db.User,
          as: 'user',
          required: false
        }
      ]
    });
    
    if (doctor && doctor.user) {
      let profileData = {};
      try {
        profileData = doctor.user.profileData ? (typeof doctor.user.profileData === 'string' ? JSON.parse(doctor.user.profileData) : doctor.user.profileData) : {};
      } catch (e) {
        profileData = {};
      }
      const name = profileData.name || profileData.firstName || 'No name';
      console.log(`    Doctor: ${name} (${doctor.specialization})`);
    } else {
      console.log(`    Doctor ${apt.doctorWalletAddress}: No user record found`);
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}