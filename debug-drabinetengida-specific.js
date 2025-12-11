/**
 * Debug drabinetengida@gmail.com specifically - Deep dive into this user's display issues
 */

import db from './server/src/models/index.js';
import axios from 'axios';

const debugDrabinetengidaSpecific = async () => {
  try {
    console.log('🔍 Deep debugging drabinetengida@gmail.com specifically...\n');

    const email = 'drabinetengida@gmail.com';
    const password = 'doctor123';

    // 1. Check database data
    console.log('1. 📊 Database Analysis:');
    console.log('='.repeat(50));
    
    const user = await db.User.findOne({
      where: { email: email.toLowerCase() },
      include: [
        {
          model: db.Doctor,
          as: 'doctorProfile'
        }
      ]
    });

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log(`✅ User found:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Wallet: ${user.walletAddress}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Name field: ${user.name || 'NULL'}`);
    console.log(`   ProfileData:`, JSON.stringify(user.profileData, null, 2));
    
    if (user.doctorProfile) {
      console.log(`   Doctor Profile:`);
      console.log(`     Name: ${user.doctorProfile.name || 'NULL'}`);
      console.log(`     Specialization: ${user.doctorProfile.specialization || 'NULL'}`);
      console.log(`     Specialty: ${user.doctorProfile.specialty || 'NULL'}`);
    }

    // 2. Test API login response
    console.log('\n2. 🌐 API Login Test:');
    console.log('='.repeat(50));
    
    try {
      const loginResponse = await axios.post('http://localhost:3004/api/auth/login', {
        email,
        password
      });

      if (loginResponse.data.success) {
        console.log('✅ Login successful');
        console.log('API Response User Data:');
        console.log(JSON.stringify(loginResponse.data.data.user, null, 2));
        
        const apiUser = loginResponse.data.data.user;
        
        // Test name extraction logic
        const extractedName = apiUser.profileData?.fullName || 
                             apiUser.profileData?.name || 
                             (apiUser.profileData?.firstName && apiUser.profileData?.lastName 
                               ? `${apiUser.profileData.firstName} ${apiUser.profileData.lastName}` 
                               : 'User');
        
        console.log(`\n🔍 Name Extraction Test:`);
        console.log(`   profileData.fullName: "${apiUser.profileData?.fullName || 'NULL'}"`);
        console.log(`   profileData.name: "${apiUser.profileData?.name || 'NULL'}"`);
        console.log(`   firstName + lastName: "${apiUser.profileData?.firstName && apiUser.profileData?.lastName ? `${apiUser.profileData.firstName} ${apiUser.profileData.lastName}` : 'NULL'}"`);
        console.log(`   Final extracted name: "${extractedName}"`);
        
      } else {
        console.log('❌ Login failed:', loginResponse.data.message);
      }
    } catch (error) {
      console.log('❌ API Error:', error.response?.data?.message || error.message);
    }

    // 3. Check appointments where this doctor appears
    console.log('\n3. 📅 Appointments Analysis:');
    console.log('='.repeat(50));
    
    const appointments = await db.Appointment.findAll({
      where: { doctorWalletAddress: user.walletAddress },
      limit: 3,
      include: [
        {
          model: db.User,
          as: 'doctor',
          include: [
            {
              model: db.Doctor,
              as: 'doctorProfile'
            }
          ]
        }
      ]
    });

    console.log(`Found ${appointments.length} appointments for this doctor:`);
    
    for (const apt of appointments) {
      console.log(`\n📅 Appointment ${apt.id.substring(0, 8)}...`);
      console.log(`   Doctor data in appointment:`);
      
      if (apt.doctor) {
        console.log(`     doctor.profileData:`, JSON.stringify(apt.doctor.profileData, null, 2));
        console.log(`     doctor.name: ${apt.doctor.name || 'NULL'}`);
        
        if (apt.doctor.doctorProfile) {
          console.log(`     doctor.doctorProfile.name: ${apt.doctor.doctorProfile.name || 'NULL'}`);
          console.log(`     doctor.doctorProfile.specialization: ${apt.doctor.doctorProfile.specialization || 'NULL'}`);
        }
        
        // Test what the frontend should show
        const frontendName = apt.doctor?.profileData?.name || 
                           apt.doctor?.profileData?.fullName || 
                           (apt.doctor?.profileData?.firstName && apt.doctor?.profileData?.lastName 
                             ? `${apt.doctor.profileData.firstName} ${apt.doctor.profileData.lastName}` 
                             : 'Unknown Doctor');
        
        const specialization = apt.doctor?.doctorProfile?.specialization || 'General';
        
        console.log(`   ✅ Frontend should show: "${frontendName} (${specialization})"`);
      } else {
        console.log(`   ❌ No doctor data in appointment`);
      }
    }

    // 4. Test specific frontend API endpoints
    console.log('\n4. 🔍 Frontend API Endpoints Test:');
    console.log('='.repeat(50));
    
    try {
      // Test appointments endpoint (what the frontend calls)
      const appointmentsResponse = await axios.get(`http://localhost:3004/api/appointments/patient/${user.walletAddress}`);
      
      if (appointmentsResponse.data.success) {
        console.log('✅ Appointments API successful');
        const appointments = appointmentsResponse.data.data;
        
        if (appointments.length > 0) {
          console.log(`Found ${appointments.length} appointments in API response`);
          const firstApt = appointments[0];
          console.log('First appointment data structure:');
          console.log('Keys:', Object.keys(firstApt));
          
          if (firstApt.doctor) {
            console.log('Doctor data in API response:');
            console.log(JSON.stringify(firstApt.doctor, null, 2));
          } else {
            console.log('❌ No doctor data in API response');
          }
        }
      }
    } catch (error) {
      console.log('❌ Appointments API Error:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error debugging drabinetengida:', error);
  } finally {
    await db.sequelize.close();
  }
};

debugDrabinetengidaSpecific();