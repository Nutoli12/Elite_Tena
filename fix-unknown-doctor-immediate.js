#!/usr/bin/env node

/**
 * IMMEDIATE FIX: Unknown Doctor Issue
 * 
 * This script fixes the "Unknown Doctor" issue immediately
 */

import db from './server/src/models/index.js';
const { Appointment, Patient, Doctor, User, Sequelize } = db;

const fixUnknownDoctorIssue = async () => {
  console.log('🚨 ========== FIXING UNKNOWN DOCTOR ISSUE ==========');
  console.log('🚨 Starting immediate fix...\n');

  try {
    // 1. Find appointments with missing doctor data
    console.log('🔍 Step 1: Finding appointments with missing doctor data...');
    
    const orphanedAppointments = await Appointment.findAll({
      include: [
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false
        }
      ],
      where: {
        '$doctorDetails.walletAddress$': null
      }
    });

    console.log(`❌ Found ${orphanedAppointments.length} appointments with missing doctor records`);

    if (orphanedAppointments.length > 0) {
      console.log('\n📋 Sample orphaned appointments:');
      orphanedAppointments.slice(0, 3).forEach((apt, index) => {
        console.log(`   ${index + 1}. ID: ${apt.id}`);
        console.log(`      Doctor Wallet: ${apt.doctorWalletAddress}`);
        console.log(`      Patient Wallet: ${apt.patientWalletAddress}`);
        console.log(`      Date: ${apt.appointmentDate}`);
      });
    }

    // 2. Create missing doctor records
    console.log('\n🔧 Step 2: Creating missing doctor records...');
    
    const uniqueDoctorWallets = [...new Set(
      orphanedAppointments.map(apt => apt.doctorWalletAddress)
    )].filter(wallet => wallet && wallet !== '');

    console.log(`🔍 Found ${uniqueDoctorWallets.length} unique doctor wallets needing records`);

    let createdDoctors = 0;
    for (const doctorWallet of uniqueDoctorWallets) {
      try {
        // Check if doctor record already exists
        const existingDoctor = await Doctor.findOne({
          where: { walletAddress: doctorWallet.toLowerCase() }
        });

        if (!existingDoctor) {
          // Check if user exists
          const user = await User.findOne({
            where: { walletAddress: doctorWallet.toLowerCase() }
          });

          if (user) {
            // Extract name from user profile
            let doctorName = 'Unknown Doctor';
            if (user.profileData) {
              const profile = user.profileData;
              doctorName = profile.name || 
                          profile.fullName || 
                          (profile.firstName && profile.lastName 
                            ? `${profile.firstName} ${profile.lastName}` 
                            : profile.firstName || `Dr. ${doctorWallet.substring(0, 8)}`);
            }

            // Create doctor record
            await Doctor.create({
              walletAddress: doctorWallet.toLowerCase(),
              name: doctorName,
              specialization: user.profileData?.specialization || 'General Practice',
              department: user.profileData?.department || 'General Practice'
            });

            // Update user role if needed
            if (user.role !== 'doctor') {
              await user.update({ role: 'doctor' });
              console.log(`   ✅ Updated user role to doctor: ${doctorWallet}`);
            }

            createdDoctors++;
            console.log(`   ✅ Created doctor record: ${doctorName} (${doctorWallet})`);
          } else {
            console.log(`   ⚠️  No user found for doctor wallet: ${doctorWallet}`);
          }
        } else {
          console.log(`   ℹ️  Doctor record already exists: ${existingDoctor.name}`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating doctor record for ${doctorWallet}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${createdDoctors} missing doctor records`);

    // 3. Verify repair
    console.log('\n🔍 Step 3: Verifying repair...');
    
    const remainingOrphaned = await Appointment.findAll({
      include: [
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false
        }
      ],
      where: {
        '$doctorDetails.walletAddress$': null
      }
    });

    console.log(`📊 Remaining orphaned appointments: ${remainingOrphaned.length}`);

    // 4. Check patient records too
    console.log('\n🔍 Step 4: Checking patient records...');
    
    const orphanedPatientAppointments = await Appointment.findAll({
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false
        }
      ],
      where: {
        '$patientDetails.walletAddress$': null
      }
    });

    console.log(`❌ Found ${orphanedPatientAppointments.length} appointments with missing patient records`);

    if (orphanedPatientAppointments.length > 0) {
      const uniquePatientWallets = [...new Set(
        orphanedPatientAppointments.map(apt => apt.patientWalletAddress)
      )].filter(wallet => wallet && wallet !== '');

      let createdPatients = 0;
      for (const patientWallet of uniquePatientWallets) {
        try {
          const existingPatient = await Patient.findOne({
            where: { walletAddress: patientWallet.toLowerCase() }
          });

          if (!existingPatient) {
            const user = await User.findOne({
              where: { walletAddress: patientWallet.toLowerCase() }
            });

            if (user && user.role === 'patient') {
              // Extract name from user profile
              let patientName = 'Unknown Patient';
              if (user.profileData) {
                const profile = user.profileData;
                patientName = profile.name || 
                            profile.fullName || 
                            (profile.firstName && profile.lastName 
                              ? `${profile.firstName} ${profile.lastName}` 
                              : profile.firstName || `Patient ${patientWallet.substring(0, 8)}`);
              }

              await Patient.create({
                walletAddress: patientWallet.toLowerCase(),
                name: patientName
              });

              createdPatients++;
              console.log(`   ✅ Created patient record: ${patientName} (${patientWallet})`);
            }
          }
        } catch (error) {
          console.error(`   ❌ Error creating patient record for ${patientWallet}:`, error.message);
        }
      }

      console.log(`✅ Created ${createdPatients} missing patient records`);
    }

    // 5. Final verification
    console.log('\n🔍 Step 5: Final verification...');
    
    const totalAppointments = await Appointment.count();
    const appointmentsWithDoctors = await Appointment.count({
      include: [
        {
          model: Doctor,
          as: 'doctorDetails',
          required: true
        }
      ]
    });

    const appointmentsWithPatients = await Appointment.count({
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: true
        }
      ]
    });

    console.log(`📊 Total appointments: ${totalAppointments}`);
    console.log(`📊 Appointments with doctor records: ${appointmentsWithDoctors}`);
    console.log(`📊 Appointments with patient records: ${appointmentsWithPatients}`);
    console.log(`📊 Doctor coverage: ${((appointmentsWithDoctors / totalAppointments) * 100).toFixed(1)}%`);
    console.log(`📊 Patient coverage: ${((appointmentsWithPatients / totalAppointments) * 100).toFixed(1)}%`);

    console.log('\n✅ ========== REPAIR COMPLETE ==========');
    console.log('✅ "Unknown Doctor" issue should now be resolved!');
    console.log('✅ Please refresh your frontend to see the changes.');

    return {
      success: true,
      createdDoctors,
      totalAppointments,
      appointmentsWithDoctors,
      doctorCoverage: ((appointmentsWithDoctors / totalAppointments) * 100).toFixed(1)
    };

  } catch (error) {
    console.error('❌ Repair failed:', error);
    throw error;
  }
};

// Run repair if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixUnknownDoctorIssue()
    .then((result) => {
      console.log('\n🎉 Unknown Doctor fix completed successfully!');
      console.log(`🎉 Doctor coverage is now ${result.doctorCoverage}%`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error);
      process.exit(1);
    });
}

export default fixUnknownDoctorIssue;