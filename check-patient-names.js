/**
 * Check patient names in database and create test data if needed
 */

import db from './server/src/models/index.js';
const { Patient, User, Appointment } = db;

async function checkPatientNames() {
  console.log('👤 ========== CHECKING PATIENT NAMES IN DATABASE ==========');
  
  try {
    // Check existing patients
    console.log('\n📝 Checking existing patients...');
    
    const patients = await Patient.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'profileData', 'role']
      }],
      limit: 10
    });
    
    console.log(`Found ${patients.length} patients in database:`);
    
    patients.forEach((patient, index) => {
      console.log(`\n👤 Patient ${index + 1}:`);
      console.log(`   - Wallet: ${patient.walletAddress}`);
      console.log(`   - Name (Patient table): ${patient.name || 'Not set'}`);
      console.log(`   - Email: ${patient.user?.email || 'Not set'}`);
      console.log(`   - ProfileData name: ${patient.user?.profileData?.name || 'Not set'}`);
      console.log(`   - ProfileData firstName: ${patient.user?.profileData?.firstName || 'Not set'}`);
      console.log(`   - ProfileData lastName: ${patient.user?.profileData?.lastName || 'Not set'}`);
      
      const hasName = patient.name || 
                     patient.user?.profileData?.name || 
                     (patient.user?.profileData?.firstName && patient.user?.profileData?.lastName);
      
      if (hasName) {
        console.log('   ✅ Patient has name data');
      } else {
        console.log('   ⚠️  Patient missing name data');
      }
    });
    
    // Create a test patient with proper name if none exist
    const patientsWithNames = patients.filter(p => 
      p.name || 
      p.user?.profileData?.name || 
      (p.user?.profileData?.firstName && p.user?.profileData?.lastName)
    );
    
    if (patientsWithNames.length === 0) {
      console.log('\n🔧 Creating test patient with proper name...');
      
      // Create test user first
      const testUser = await User.create({
        walletAddress: '0xtest1234567890123456789012345678901234567890',
        email: 'testpatient@example.com',
        role: 'patient',
        profileData: {
          firstName: 'John',
          lastName: 'Doe',
          name: 'John Doe'
        }
      });
      
      // Create test patient
      const testPatient = await Patient.create({
        walletAddress: '0xtest1234567890123456789012345678901234567890',
        name: 'John Doe',
        dateOfBirth: '1995-06-15',
        gender: 'Male',
        phone: '+251912345678'
      });
      
      console.log('✅ Created test patient:', {
        wallet: testPatient.walletAddress,
        name: testPatient.name,
        email: testUser.email
      });
      
      // Create test appointment
      const testAppointment = await Appointment.create({
        patientWalletAddress: testPatient.walletAddress,
        doctorWalletAddress: '0x8ba1f109551bD432803012645Hac136c30C6756M',
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        reason: 'Test consultation',
        status: 'scheduled',
        fee: 0
      });
      
      console.log('✅ Created test appointment:', {
        id: testAppointment.id,
        patient: testPatient.walletAddress,
        date: testAppointment.appointmentDate
      });
    } else {
      console.log(`\n✅ Found ${patientsWithNames.length} patients with names`);
    }
    
    // Check appointments with patient names
    console.log('\n📝 Checking appointments with patient data...');
    
    const appointmentsWithPatients = await Appointment.findAll({
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress', 'name', 'dateOfBirth']
        }
      ],
      limit: 5
    });
    
    console.log(`Found ${appointmentsWithPatients.length} appointments:`);
    
    appointmentsWithPatients.forEach((appointment, index) => {
      console.log(`\n📅 Appointment ${index + 1}:`);
      console.log(`   - ID: ${appointment.id}`);
      console.log(`   - Patient Wallet: ${appointment.patientWalletAddress}`);
      console.log(`   - Patient Name (from Patient table): ${appointment.patientDetails?.name || 'Not found'}`);
      console.log(`   - Patient DOB: ${appointment.patientDetails?.dateOfBirth || 'Not found'}`);
      
      if (appointment.patientDetails?.name) {
        console.log('   ✅ This appointment should show real patient name');
      } else {
        console.log('   ⚠️  This appointment will show "Unknown Patient"');
      }
    });
    
    console.log('\n🎉 ========== PATIENT NAME CHECK COMPLETE ==========');
    
  } catch (error) {
    console.error('❌ Error checking patient names:', error);
  } finally {
    await db.sequelize.close();
  }
}

checkPatientNames();