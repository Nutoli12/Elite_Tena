/**
 * Debug Doctor Display - Check how doctor data is structured in appointments
 */

import db from './server/src/models/index.js';

const debugDoctorDisplay = async () => {
  try {
    console.log('🔍 Debugging doctor display in appointments...\n');

    // Get some appointments with doctor information
    const appointments = await db.Appointment.findAll({
      limit: 5,
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
        },
        {
          model: db.User,
          as: 'patient'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${appointments.length} appointments to analyze:\n`);

    for (const apt of appointments) {
      console.log(`📅 Appointment ID: ${apt.id}`);
      console.log(`   Patient: ${apt.patientWalletAddress}`);
      console.log(`   Doctor Wallet: ${apt.doctorWalletAddress}`);
      
      // Check doctor user data
      if (apt.doctor) {
        console.log(`   Doctor User Data:`);
        console.log(`     Email: ${apt.doctor.email}`);
        console.log(`     Name: ${apt.doctor.name || 'NULL'}`);
        console.log(`     ProfileData:`, JSON.stringify(apt.doctor.profileData, null, 2));
        
        // Check doctor profile
        if (apt.doctor.doctorProfile) {
          console.log(`   Doctor Profile Data:`);
          console.log(`     Name: ${apt.doctor.doctorProfile.name || 'NULL'}`);
          console.log(`     Specialization: ${apt.doctor.doctorProfile.specialization || 'NULL'}`);
          console.log(`     Specialty: ${apt.doctor.doctorProfile.specialty || 'NULL'}`);
        } else {
          console.log(`   ❌ No doctor profile found`);
        }
      } else {
        console.log(`   ❌ No doctor user data found`);
      }
      
      // Check what the frontend should display
      const doctorName = apt.doctor?.profileData?.name || 
                        apt.doctor?.profileData?.fullName ||
                        apt.doctor?.name ||
                        (apt.doctor?.profileData?.firstName && apt.doctor?.profileData?.lastName 
                          ? `${apt.doctor.profileData.firstName} ${apt.doctor.profileData.lastName}` 
                          : 'Unknown Doctor');
      
      const specialization = apt.doctor?.doctorProfile?.specialization || 
                           apt.doctor?.doctorProfile?.specialty ||
                           apt.doctor?.profileData?.specialization ||
                           'General';
      
      console.log(`   ✅ Should Display: "${doctorName} (${specialization})"`);
      console.log('   ' + '-'.repeat(50));
    }

    // Also check doctors table directly
    console.log('\n👨‍⚕️ Checking doctors table directly...\n');
    
    const doctors = await db.Doctor.findAll({
      limit: 5,
      include: [
        {
          model: db.User,
          as: 'user'
        }
      ]
    });

    for (const doctor of doctors) {
      console.log(`👨‍⚕️ Doctor: ${doctor.walletAddress}`);
      console.log(`   Doctor.name: ${doctor.name || 'NULL'}`);
      console.log(`   Doctor.specialization: ${doctor.specialization || 'NULL'}`);
      console.log(`   Doctor.specialty: ${doctor.specialty || 'NULL'}`);
      
      if (doctor.user) {
        console.log(`   User.name: ${doctor.user.name || 'NULL'}`);
        console.log(`   User.profileData:`, JSON.stringify(doctor.user.profileData, null, 2));
      }
      console.log('   ---');
    }

  } catch (error) {
    console.error('❌ Error debugging doctor display:', error);
  } finally {
    await db.sequelize.close();
  }
};

debugDoctorDisplay();