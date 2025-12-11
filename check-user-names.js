#!/usr/bin/env node

/**
 * Check what user names exist in the database
 */

import db from './server/src/models/index.js';

console.log('🔍 Checking user names in database...');

try {
  // Check users table
  const users = await db.User.findAll({
    attributes: ['walletAddress', 'email', 'profileData', 'role'],
    limit: 10
  });
  
  console.log('\n👥 Users in database:');
  users.forEach(user => {
    let profileData = {};
    try {
      profileData = user.profileData ? (typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData) : {};
    } catch (e) {
      profileData = {};
    }
    const name = profileData.name || profileData.firstName || 'No name';
    console.log(`  - ${user.walletAddress}: ${name} (${user.email}) [${user.role}]`);
  });
  
  // Check patients table
  const patients = await db.Patient.findAll({
    attributes: ['walletAddress'],
    include: [
      {
        model: db.User,
        as: 'user',
        attributes: ['email', 'profileData']
      }
    ],
    limit: 5
  });
  
  console.log('\n🏥 Patients with user data:');
  patients.forEach(patient => {
    let profileData = {};
    try {
      profileData = patient.user?.profileData ? (typeof patient.user.profileData === 'string' ? JSON.parse(patient.user.profileData) : patient.user.profileData) : {};
    } catch (e) {
      profileData = {};
    }
    const name = profileData.name || profileData.firstName || 'No name';
    console.log(`  - ${patient.walletAddress}: ${name} (${patient.user?.email || 'No email'})`);
  });
  
  // Check doctors table
  const doctors = await db.Doctor.findAll({
    attributes: ['walletAddress', 'specialization'],
    include: [
      {
        model: db.User,
        as: 'user',
        attributes: ['email', 'profileData']
      }
    ],
    limit: 5
  });
  
  console.log('\n👨‍⚕️ Doctors with user data:');
  doctors.forEach(doctor => {
    let profileData = {};
    try {
      profileData = doctor.user?.profileData ? (typeof doctor.user.profileData === 'string' ? JSON.parse(doctor.user.profileData) : doctor.user.profileData) : {};
    } catch (e) {
      profileData = {};
    }
    const name = profileData.name || profileData.firstName || 'No name';
    console.log(`  - ${doctor.walletAddress}: ${name} (${doctor.specialization}) (${doctor.user?.email || 'No email'})`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}