/**
 * Test regular appointment creation (non-premium)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testRegularAppointmentCreation() {
  console.log('🧪 Testing Regular Appointment Creation');
  console.log('='.repeat(50));

  try {
    // Step 1: Login as patient
    console.log('\n📝 Step 1: Patient Login');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'patient@test.com',
      password: 'password123'
    });

    const patientToken = loginResponse.data.data.auth.token;
    const patientWallet = loginResponse.data.data.user.walletAddress;
    console.log('✅ Patient logged in successfully');
    console.log('👤 Patient wallet:', patientWallet);

    // Step 2: Get doctors
    console.log('\n👨‍⚕️ Step 2: Get Doctors');
    const doctorsResponse = await axios.get(`${BASE_URL}/api/doctors/department/Cardiology`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    console.log('👥 Available doctors:', doctorsResponse.data.data?.length || 0);

    // Use a real doctor from the response
    const doctor = doctorsResponse.data.data?.[0];
    if (!doctor) {
      throw new Error('No doctors found');
    }
    console.log('🩺 Selected doctor:', doctor.walletAddress);

    // Step 3: Create appointment using regular API
    console.log('\n📅 Step 3: Create Regular Appointment');
    const appointmentData = {
      patientWalletAddress: patientWallet,
      doctorWalletAddress: doctor.walletAddress,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      reason: 'Regular checkup - testing normal appointment',
      duration: 30,
      fee: 400
    };

    console.log('📋 Appointment data:', appointmentData);

    const appointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, appointmentData, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('✅ Appointment created successfully!');
    console.log('📋 Response:', {
      success: appointmentResponse.data.success,
      appointmentId: appointmentResponse.data.data.id,
      status: appointmentResponse.data.data.status,
      appointmentDate: appointmentResponse.data.data.appointmentDate
    });

    console.log('\n🎉 Regular appointment creation working perfectly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Note: Make sure the server is running on port 3005');
    }
  }
}

// Run the test
testRegularAppointmentCreation();