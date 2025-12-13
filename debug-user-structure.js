/**
 * Debug User Structure to understand wallet_address issue
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function debugUserStructure() {
  console.log('🔍 Debugging User Structure');
  console.log('='.repeat(30));

  try {
    // Test patient login
    console.log('\n👤 Testing Patient Login');
    const patientLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'patient@test.com',
      password: 'password123'
    });

    if (patientLogin.data.success) {
      console.log('✅ Patient login successful');
      console.log('📋 Patient response:', JSON.stringify(patientLogin.data, null, 2));
    }

    // Test doctor login
    console.log('\n👨‍⚕️ Testing Doctor Login');
    const doctorLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'doctor@test.com',
      password: 'password123'
    });

    if (doctorLogin.data.success) {
      console.log('✅ Doctor login successful');
      console.log('📋 Doctor response:', JSON.stringify(doctorLogin.data, null, 2));
    }

    // Test appointment creation with fallback wallet
    console.log('\n🧪 Testing Appointment Creation with Fallback');
    const patientToken = patientLogin.data.data.auth.token;
    const patientWallet = patientLogin.data.data.user.walletAddress;
    const doctorWallet = doctorLogin.data.data.user.walletAddress;

    console.log('🔧 Using patient wallet:', patientWallet);
    console.log('🔧 Using doctor wallet:', doctorWallet);

    const appointmentData = {
      doctorWallet: doctorWallet,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      serviceType: 'inPerson',
      duration: 30,
      reason: 'Debug test appointment'
    };

    const appointmentResponse = await axios.post(
      `${BASE_URL}/api/enhanced-appointments/appointments`,
      appointmentData,
      { 
        headers: { 
          Authorization: `Bearer ${patientToken}`,
          'x-wallet-address': patientWallet
        } 
      }
    );

    if (appointmentResponse.data.success) {
      console.log('✅ Appointment created successfully!');
      console.log('📋 Appointment ID:', appointmentResponse.data.data.appointment.id);
    } else {
      console.log('❌ Appointment creation failed:', appointmentResponse.data.error);
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('📋 Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug
debugUserStructure();