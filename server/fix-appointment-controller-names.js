#!/usr/bin/env node

/**
 * Fix the appointment controller to properly resolve doctor and patient names
 */

import db from './src/models/index.js';
const { Appointment, Patient, Doctor, User, Sequelize } = db;

const testAppointmentNameResolution = async () => {
  console.log('🔍 ========== TESTING APPOINTMENT NAME RESOLUTION ==========');
  
  try {
    // Get a sample appointment to test
    console.log('🔍 Step 1: Fetching sample appointment...');
    
    const sampleAppointment = await Appointment.findOne({
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress', 'name']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false,
          attributes: ['walletAddress', 'name', 'specialization']
        }
      ]
    });

    if (!sampleAppointment) {
      console.log('❌ No appointments found in database');
      return;
    }

    console.log('✅ Found sample appointment:', sampleAppointment.id);
    console.log('📋 Appointment data:');
    console.log(`   Patient Wallet: ${sampleAppointment.patientWalletAddress}`);
    console.log(`   Doctor Wallet: ${sampleAppointment.doctorWalletAddress}`);
    console.log(`   Date: ${sampleAppointment.appointmentDate}`);

    // Test doctor details
    console.log('\n🔍 Step 2: Testing doctor details...');
    if (sampleAppointment.doctorDetails) {
      console.log('✅ Doctor details found:');
      console.log(`   Name: ${sampleAppointment.doctorDetails.name}`);
      console.log(`   Specialization: ${sampleAppointment.doctorDetails.specialization}`);
    } else {
      console.log('❌ No doctor details found');
      
      // Try to find doctor manually
      const doctor = await Doctor.findOne({
        where: { walletAddress: sampleAppointment.doctorWalletAddress }
      });
      
      if (doctor) {
        console.log('✅ Doctor found manually:');
        console.log(`   Name: ${doctor.name}`);
        console.log(`   Specialization: ${doctor.specialization}`);
      } else {
        console.log('❌ Doctor not found in doctors table');
      }
    }

    // Test patient details
    console.log('\n🔍 Step 3: Testing patient details...');
    if (sampleAppointment.patientDetails) {
      console.log('✅ Patient details found:');
      console.log(`   Name: ${sampleAppointment.patientDetails.name}`);
    } else {
      console.log('❌ No patient details found');
      
      // Try to find patient manually
      const patient = await Patient.findOne({
        where: { walletAddress: sampleAppointment.patientWalletAddress }
      });
      
      if (patient) {
        console.log('✅ Patient found manually:');
        console.log(`   Name: ${patient.name}`);
      } else {
        console.log('❌ Patient not found in patients table');
      }
    }

    // Test user data fetching
    console.log('\n🔍 Step 4: Testing user data fetching...');
    
    const doctorUser = await User.findOne({
      where: { walletAddress: sampleAppointment.doctorWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });

    if (doctorUser) {
      console.log('✅ Doctor user found:');
      console.log(`   Role: ${doctorUser.role}`);
      console.log(`   Email: ${doctorUser.email}`);
      
      if (doctorUser.profileData) {
        const profile = doctorUser.profileData;
        const doctorName = profile.name || 
                          profile.fullName || 
                          (profile.firstName && profile.lastName 
                            ? `${profile.firstName} ${profile.lastName}` 
                            : profile.firstName || 'Unknown Doctor');
        console.log(`   Resolved Name: ${doctorName}`);
      } else {
        console.log('   No profile data found');
      }
    } else {
      console.log('❌ Doctor user not found');
    }

    const patientUser = await User.findOne({
      where: { walletAddress: sampleAppointment.patientWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });

    if (patientUser) {
      console.log('✅ Patient user found:');
      console.log(`   Role: ${patientUser.role}`);
      console.log(`   Email: ${patientUser.email}`);
      
      if (patientUser.profileData) {
        const profile = patientUser.profileData;
        const patientName = profile.name || 
                           profile.fullName || 
                           (profile.firstName && profile.lastName 
                             ? `${profile.firstName} ${profile.lastName}` 
                             : profile.firstName || 'Unknown Patient');
        console.log(`   Resolved Name: ${patientName}`);
      } else {
        console.log('   No profile data found');
      }
    } else {
      console.log('❌ Patient user not found');
    }

    // Test the complete appointment formatting
    console.log('\n🔍 Step 5: Testing complete appointment formatting...');
    
    const formattedAppointment = {
      id: sampleAppointment.id,
      patientWallet: sampleAppointment.patientWalletAddress,
      doctorWallet: sampleAppointment.doctorWalletAddress,
      appointmentDate: sampleAppointment.appointmentDate,
      status: sampleAppointment.status,
      
      // Doctor information
      doctorName: sampleAppointment.doctorDetails?.name || 
                  (doctorUser?.profileData?.name || 
                   doctorUser?.profileData?.fullName || 
                   'Unknown Doctor'),
      doctorSpecialization: sampleAppointment.doctorDetails?.specialization || 'General Practice',
      
      // Patient information  
      patientName: sampleAppointment.patientDetails?.name || 
                   (patientUser?.profileData?.name || 
                    patientUser?.profileData?.fullName || 
                    'Unknown Patient'),
      
      // Display strings
      displayDoctor: `${sampleAppointment.doctorDetails?.name || 'Unknown Doctor'} (${sampleAppointment.doctorDetails?.specialization || 'General Practice'})`,
      displayPatient: sampleAppointment.patientDetails?.name || 'Unknown Patient'
    };

    console.log('✅ Formatted appointment:');
    console.log(`   Doctor: ${formattedAppointment.displayDoctor}`);
    console.log(`   Patient: ${formattedAppointment.displayPatient}`);

    if (formattedAppointment.doctorName === 'Unknown Doctor') {
      console.log('\n❌ ISSUE FOUND: Doctor name is still "Unknown Doctor"');
      console.log('🔧 This indicates the doctor association or name resolution is failing');
    } else {
      console.log('\n✅ SUCCESS: Doctor name resolved correctly');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testAppointmentNameResolution()
  .then(() => {
    console.log('\n✅ Name resolution test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });