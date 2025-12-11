#!/usr/bin/env node

/**
 * Add proper names to users who don't have them
 */

import db from './server/src/models/index.js';

console.log('🔧 Adding names to users...');

try {
  // Update the specific patient
  const patientWallet = '0x1764894073908ypl7fp';
  const patientUser = await db.User.findOne({
    where: { walletAddress: patientWallet }
  });
  
  if (patientUser) {
    const updatedProfileData = {
      name: 'Semir Yusuf',
      firstName: 'Semir',
      lastName: 'Yusuf',
      phone: '+251911234567'
    };
    
    await patientUser.update({
      profileData: JSON.stringify(updatedProfileData)
    });
    
    console.log('✅ Updated patient: Semir Yusuf');
  }
  
  // Update the doctor
  const doctorWallet = '0x1764894943291khtk9h';
  const doctorUser = await db.User.findOne({
    where: { walletAddress: doctorWallet }
  });
  
  if (doctorUser) {
    const updatedProfileData = {
      name: 'Dr. Ahmed Hassan',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      title: 'Dr.',
      phone: '+251911234568'
    };
    
    await doctorUser.update({
      profileData: JSON.stringify(updatedProfileData)
    });
    
    console.log('✅ Updated doctor: Dr. Ahmed Hassan');
  }
  
  // Update other users without names
  const usersWithoutNames = await db.User.findAll({
    where: {
      walletAddress: {
        [db.Sequelize.Op.in]: [
          '0x1764380165137m5p9l8',
          '0x17643803354611udizs',
          '0x17644452147740yvi48',
          '0x1764503803602b7tlna',
          '0x176450749946232azap'
        ]
      }
    }
  });
  
  const sampleNames = [
    { name: 'Meron Tadesse', firstName: 'Meron', lastName: 'Tadesse' },
    { name: 'Dr. Dawit Bekele', firstName: 'Dawit', lastName: 'Bekele', title: 'Dr.' },
    { name: 'Hanan Mohammed', firstName: 'Hanan', lastName: 'Mohammed' },
    { name: 'Yonas Girma', firstName: 'Yonas', lastName: 'Girma' },
    { name: 'Dr. Burhan Ali', firstName: 'Burhan', lastName: 'Ali', title: 'Dr.' }
  ];
  
  for (let i = 0; i < usersWithoutNames.length && i < sampleNames.length; i++) {
    const user = usersWithoutNames[i];
    const nameData = sampleNames[i];
    
    await user.update({
      profileData: JSON.stringify(nameData)
    });
    
    console.log(`✅ Updated user: ${nameData.name}`);
  }
  
  console.log('🚀 All user names updated! Appointments should now show proper names.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}