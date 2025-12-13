const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function checkExistingUsers() {
  console.log('🔍 Checking existing users in the database...');
  
  try {
    // Check patients
    console.log('👤 Checking patients...');
    const patientsResponse = await axios.get(`${BASE_URL}/api/patients`);
    console.log('📊 Found patients:', patientsResponse.data.data?.length || 0);
    
    if (patientsResponse.data.data && patientsResponse.data.data.length > 0) {
      console.log('👤 First few patients:');
      patientsResponse.data.data.slice(0, 3).forEach((patient, index) => {
        console.log(`   ${index + 1}. ${patient.walletAddress} - ${patient.user?.name || 'No name'}`);
      });
    }

    // Check doctors
    console.log('\n🩺 Checking doctors...');
    const doctorsResponse = await axios.get(`${BASE_URL}/api/doctors`);
    console.log('📊 Found doctors:', doctorsResponse.data.data?.length || 0);
    
    if (doctorsResponse.data.data && doctorsResponse.data.data.length > 0) {
      console.log('🩺 First few doctors:');
      doctorsResponse.data.data.slice(0, 3).forEach((doctor, index) => {
        console.log(`   ${index + 1}. ${doctor.walletAddress} - ${doctor.user?.name || doctor.name || 'No name'}`);
      });
    }

    // Check appointments
    console.log('\n📅 Checking existing appointments...');
    const appointmentsResponse = await axios.get(`${BASE_URL}/api/appointments`);
    console.log('📊 Found appointments:', appointmentsResponse.data.data?.length || 0);
    
    if (appointmentsResponse.data.data && appointmentsResponse.data.data.length > 0) {
      console.log('📅 First few appointments:');
      appointmentsResponse.data.data.slice(0, 3).forEach((appointment, index) => {
        console.log(`   ${index + 1}. ${appointment.id} - Patient: ${appointment.patientWalletAddress}, Doctor: ${appointment.doctorWalletAddress}`);
        console.log(`      Status: ${appointment.status}, Payment: ${appointment.paymentStatus}, Workflow: ${appointment.workflowState || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking users:', error.response?.data || error.message);
  }
}

checkExistingUsers().catch(console.error);