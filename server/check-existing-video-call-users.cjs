#!/usr/bin/env node

/**
 * 🔍 CHECK EXISTING USERS FOR VIDEO CALLS
 * Find existing users to test video calls with
 */

const { Sequelize } = require('sequelize');

async function checkExistingUsers() {
  console.log('🔍 Checking existing users for video call testing...\n');

  try {
    // Connect to database
    const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena', {
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get users with different roles
    const [results] = await sequelize.query(`
      SELECT 
        "walletAddress",
        email,
        role,
        "profileData",
        "createdAt"
      FROM users 
      WHERE role IN ('doctor', 'patient')
      ORDER BY role, "createdAt" DESC
      LIMIT 10
    `);

    console.log('\n👥 Available Users:');
    console.log('==================');

    const doctors = results.filter(user => user.role === 'doctor');
    const patients = results.filter(user => user.role === 'patient');

    console.log('\n👨‍⚕️ DOCTORS:');
    doctors.forEach((doctor, index) => {
      const profileData = typeof doctor.profileData === 'string' 
        ? JSON.parse(doctor.profileData) 
        : doctor.profileData;
      
      console.log(`   ${index + 1}. ${doctor.walletAddress}`);
      console.log(`      Name: ${profileData?.fullName || profileData?.firstName || 'Unknown'}`);
      console.log(`      Email: ${doctor.email}`);
      console.log('');
    });

    console.log('\n👤 PATIENTS:');
    patients.forEach((patient, index) => {
      const profileData = typeof patient.profileData === 'string' 
        ? JSON.parse(patient.profileData) 
        : patient.profileData;
      
      console.log(`   ${index + 1}. ${patient.walletAddress}`);
      console.log(`      Name: ${profileData?.fullName || profileData?.firstName || 'Unknown'}`);
      console.log(`      Email: ${patient.email}`);
      console.log('');
    });

    if (doctors.length > 0 && patients.length > 0) {
      console.log('\n🎯 RECOMMENDED TEST PAIR:');
      console.log(`   Doctor: ${doctors[0].walletAddress}`);
      console.log(`   Patient: ${patients[0].walletAddress}`);
      
      // Test video call with these users
      console.log('\n🧪 Testing video call with these users...');
      
      const axios = require('axios');
      const baseURL = 'http://localhost:3005';
      
      try {
        const response = await axios.post(`${baseURL}/api/video-calls/initiate`, {
          initiatorWallet: doctors[0].walletAddress,
          receiverWallet: patients[0].walletAddress,
          scheduledTime: new Date().toISOString(),
          durationMinutes: 30
        });

        if (response.data.success) {
          console.log('✅ Video call test successful!');
          console.log(`   Call ID: ${response.data.data.id}`);
          console.log(`   Daily.co Room: ${response.data.data.metadata?.dailyRoom ? 'Created' : 'Not created'}`);
          
          if (response.data.data.metadata?.dailyRoom) {
            console.log(`   Room URL: ${response.data.data.metadata.dailyRoom.roomUrl}`);
          }
          
          // Clean up - end the test call
          await axios.post(`${baseURL}/api/video-calls/${response.data.data.id}/end`, {
            userWallet: doctors[0].walletAddress,
            reason: 'test_cleanup'
          });
          console.log('✅ Test call cleaned up');
        }
      } catch (testError) {
        console.log('❌ Video call test failed:', testError.response?.data?.message || testError.message);
      }
    } else {
      console.log('\n⚠️ Not enough users found for testing');
      console.log('   Need at least 1 doctor and 1 patient');
    }

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkExistingUsers();