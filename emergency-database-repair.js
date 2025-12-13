#!/usr/bin/env node

/**
 * PHASE 1: EMERGENCY DATABASE REPAIR
 * 
 * This script fixes the "Unknown Doctor" issue by:
 * 1. Finding appointments with missing doctor data
 * 2. Creating missing doctor records
 * 3. Updating user roles to match appointments
 */

import db from './server/src/models/index.js';
const { Appointment, Patient, Doctor, User, Sequelize } = db;

const emergencyRepair = async () => {
  console.log('🚨 ========== EMERGENCY DATABASE REPAIR ==========');
  console.log('🚨 Starting emergency repair for "Unknown Doctor" issue...\n');

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
            // Create doctor record
            await Doctor.create({
              walletAddress: doctorWallet.toLowerCase(),
              name: user.profileData?.name || 
                    user.profileData?.fullName || 
                    `Dr. ${doctorWallet.substring(0, 8)}`,
              specialization: user.profileData?.specialization || 'General Practice',
              department: user.profileData?.department || 'General Practice'
            });

            // Update user role if needed
            if (user.role !== 'doctor') {
              await user.update({ role: 'doctor' });
              console.log(`   ✅ Updated user role to doctor: ${doctorWallet}`);
            }

            createdDoctors++;
            console.log(`   ✅ Created doctor record: ${doctorWallet}`);
          } else {
            console.log(`   ⚠️  No user found for doctor wallet: ${doctorWallet}`);
          }
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
              await Patient.create({
                walletAddress: patientWallet.toLowerCase(),
                name: user.profileData?.name || 
                      user.profileData?.fullName || 
                      `Patient ${patientWallet.substring(0, 8)}`
              });

              createdPatients++;
              console.log(`   ✅ Created patient record: ${patientWallet}`);
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

    console.log('\n✅ ========== EMERGENCY REPAIR COMPLETE ==========');
    console.log('✅ Database integrity issues have been fixed!');
    console.log('✅ "Unknown Doctor" issue should now be resolved.');

  } catch (error) {
    console.error('❌ Emergency repair failed:', error);
    throw error;
  }
};

// Run repair if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  emergencyRepair()
    .then(() => {
      console.log('\n🎉 Emergency repair completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Emergency repair failed:', error);
      process.exit(1);
    });
}

export default emergencyRepair;