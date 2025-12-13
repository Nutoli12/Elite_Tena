/**
 * Debug script to check why patient names are not showing in appointments
 */

import db from './server/src/models/index.js';
const { Patient, User, Appointment, Doctor } = db;

async function debugAppointmentPatientNames() {
  console.log('🔍 ========== DEBUGGING APPOINTMENT PATIENT NAMES ==========');
  
  try {
    // Check the specific appointment we created
    const appointmentId = '0a9529f0-4997-475c-88bb-98d87d7b9009';
    
    console.log('\n📝 Step 1: Check appointment exists...');
    
    const appointment = await Appointment.findByPk(appointmentId);
    
    if (!appointment) {
      console.log('❌ Appointment not found');
      return;
    }
    
    console.log('✅ Appointment found:', {
      id: appointment.id,
      patientWallet: appointment.patientWalletAddress,
      doctorWallet: appointment.doctorWalletAddress,
      date: appointment.appointmentDate
    });
    
    console.log('\n📝 Step 2: Check patient exists...');
    
    const patient = await Patient.findOne({
      where: { walletAddress: appointment.patientWalletAddress },
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'profileData', 'role']
      }]
    });
    
    if (!patient) {
      console.log('❌ Patient not found for wallet:', appointment.patientWalletAddress);
    } else {
      console.log('✅ Patient found:', {
        wallet: patient.walletAddress,
        name: patient.name,
        email: patient.user?.email,
        profileDataName: patient.user?.profileData?.name,
        profileDataFirstName: patient.user?.profileData?.firstName,
        profileDataLastName: patient.user?.profileData?.lastName
      });
    }
    
    console.log('\n📝 Step 3: Check appointment with includes...');
    
    const appointmentWithIncludes = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress', 'name', 'dateOfBirth']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false,
          attributes: ['walletAddress', 'name', 'specialization']
        }
      ]
    });
    
    console.log('📋 Appointment with includes:', {
      id: appointmentWithIncludes.id,
      patientDetails: appointmentWithIncludes.patientDetails ? {
        wallet: appointmentWithIncludes.patientDetails.walletAddress,
        name: appointmentWithIncludes.patientDetails.name,
        dateOfBirth: appointmentWithIncludes.patientDetails.dateOfBirth
      } : 'NULL',
      doctorDetails: appointmentWithIncludes.doctorDetails ? {
        wallet: appointmentWithIncludes.doctorDetails.walletAddress,
        name: appointmentWithIncludes.doctorDetails.name,
        specialization: appointmentWithIncludes.doctorDetails.specialization
      } : 'NULL'
    });
    
    console.log('\n📝 Step 4: Check User data separately...');
    
    const patientUser = await User.findOne({
      where: { walletAddress: appointment.patientWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });
    
    const doctorUser = await User.findOne({
      where: { walletAddress: appointment.doctorWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });
    
    console.log('👤 Patient User:', patientUser ? {
      email: patientUser.email,
      profileData: patientUser.profileData,
      role: patientUser.role
    } : 'NULL');
    
    console.log('👨‍⚕️ Doctor User:', doctorUser ? {
      email: doctorUser.email,
      profileData: doctorUser.profileData,
      role: doctorUser.role
    } : 'NULL');
    
    console.log('\n📝 Step 5: Simulate name extraction logic...');
    
    let extractedPatientName = 'Unknown Patient';
    
    // Priority 1: Patient table name
    if (appointmentWithIncludes.patientDetails && appointmentWithIncludes.patientDetails.name) {
      extractedPatientName = appointmentWithIncludes.patientDetails.name;
      console.log('✅ Would use Patient table name:', extractedPatientName);
    }
    // Priority 2: User profileData
    else if (patientUser?.profileData) {
      const profileData = patientUser.profileData;
      extractedPatientName = profileData?.name || 
                           profileData?.fullName || 
                           (profileData?.firstName && profileData?.lastName 
                             ? `${profileData.firstName} ${profileData.lastName}` 
                             : profileData?.firstName || 'Unknown Patient');
      console.log('✅ Would use User profileData name:', extractedPatientName);
    } else {
      console.log('❌ No name data available');
    }
    
    console.log('\n📝 Step 6: Check model associations...');
    
    // Check if the associations are properly defined
    console.log('🔗 Appointment associations:', Object.keys(Appointment.associations || {}));
    console.log('🔗 Patient associations:', Object.keys(Patient.associations || {}));
    
    console.log('\n🎉 ========== DEBUG COMPLETE ==========');
    console.log(`📊 Final extracted name: "${extractedPatientName}"`);
    
    if (extractedPatientName !== 'Unknown Patient') {
      console.log('✅ Name extraction should work - check appointment controller logic');
    } else {
      console.log('❌ No name data available - patient needs proper name in database');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await db.sequelize.close();
  }
}

debugAppointmentPatientNames();