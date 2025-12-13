/**
 * Create a test appointment with a real patient who has a name
 * This will test if the patient name display fix is working
 */

import db from './server/src/models/index.js';
const { Patient, User, Appointment, Doctor } = db;

async function createTestAppointmentWithRealPatient() {
  console.log('📅 ========== CREATING TEST APPOINTMENT WITH REAL PATIENT ==========');
  
  try {
    // Find a patient with a name
    console.log('\n📝 Finding patient with name...');
    
    const patientWithName = await Patient.findOne({
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'profileData', 'role']
      }],
      where: {
        walletAddress: '0x1764380165137m5p9l8' // Meron Tadesse
      }
    });
    
    if (!patientWithName) {
      console.log('❌ Patient not found');
      return;
    }
    
    console.log('✅ Found patient:', {
      wallet: patientWithName.walletAddress,
      name: patientWithName.name || patientWithName.user?.profileData?.name,
      email: patientWithName.user?.email
    });
    
    // Find a doctor
    console.log('\n📝 Finding doctor...');
    
    const doctor = await Doctor.findOne({
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'profileData', 'role']
      }]
    });
    
    if (!doctor) {
      console.log('❌ No doctor found');
      return;
    }
    
    console.log('✅ Found doctor:', {
      wallet: doctor.walletAddress,
      name: doctor.name || doctor.user?.profileData?.name,
      specialization: doctor.specialization
    });
    
    // Create test appointment
    console.log('\n📝 Creating test appointment...');
    
    const testAppointment = await Appointment.create({
      patientWalletAddress: patientWithName.walletAddress,
      doctorWalletAddress: doctor.walletAddress,
      appointmentDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      reason: 'Test consultation to verify patient name display',
      status: 'scheduled',
      fee: 0,
      duration: 30,
      serviceType: 'inPerson'
    });
    
    console.log('✅ Created test appointment:', {
      id: testAppointment.id,
      patientWallet: testAppointment.patientWalletAddress,
      doctorWallet: testAppointment.doctorWalletAddress,
      date: testAppointment.appointmentDate,
      reason: testAppointment.reason
    });
    
    // Verify the appointment shows the correct patient name
    console.log('\n📝 Verifying appointment data...');
    
    const appointmentWithDetails = await Appointment.findByPk(testAppointment.id, {
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
    
    // Manually fetch user data (like in the controller)
    const patientUser = await User.findOne({
      where: { walletAddress: appointmentWithDetails.patientWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });
    
    const doctorUser = await User.findOne({
      where: { walletAddress: appointmentWithDetails.doctorWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });
    
    // Extract patient name using the same logic as the controller
    let patientName = 'Unknown Patient';
    
    // Priority 1: Patient table name
    if (appointmentWithDetails.patientDetails && appointmentWithDetails.patientDetails.name) {
      patientName = appointmentWithDetails.patientDetails.name;
      console.log('✅ Using Patient table name:', patientName);
    }
    // Priority 2: User profileData
    else if (patientUser?.profileData) {
      const profileData = patientUser.profileData;
      patientName = profileData?.name || 
                   profileData?.fullName || 
                   (profileData?.firstName && profileData?.lastName 
                     ? `${profileData.firstName} ${profileData.lastName}` 
                     : profileData?.firstName || 'Unknown Patient');
      console.log('✅ Using User profileData name:', patientName);
    }
    
    // Extract doctor name
    let doctorName = 'Unknown Doctor';
    if (appointmentWithDetails.doctorDetails && appointmentWithDetails.doctorDetails.name) {
      doctorName = appointmentWithDetails.doctorDetails.name;
    } else if (doctorUser?.profileData) {
      const profileData = doctorUser.profileData;
      doctorName = profileData?.name || 
                  profileData?.fullName || 
                  (profileData?.firstName && profileData?.lastName 
                    ? `${profileData.firstName} ${profileData.lastName}` 
                    : profileData?.firstName || 'Unknown Doctor');
    }
    
    console.log('\n📋 Appointment Details:');
    console.log(`   - Patient Name: ${patientName}`);
    console.log(`   - Doctor Name: ${doctorName}`);
    console.log(`   - Appointment Date: ${appointmentWithDetails.appointmentDate}`);
    console.log(`   - Reason: ${appointmentWithDetails.reason}`);
    
    if (patientName !== 'Unknown Patient') {
      console.log('\n✅ SUCCESS: Patient name is correctly extracted!');
      console.log('✅ The appointment controller should now show real patient names');
    } else {
      console.log('\n❌ ISSUE: Patient name still shows as "Unknown Patient"');
    }
    
    console.log('\n🎉 ========== TEST APPOINTMENT CREATION COMPLETE ==========');
    console.log(`📅 Test appointment ID: ${testAppointment.id}`);
    console.log('💡 You can now test the appointments API to see if patient names display correctly');
    
  } catch (error) {
    console.error('❌ Error creating test appointment:', error);
  } finally {
    await db.sequelize.close();
  }
}

createTestAppointmentWithRealPatient();