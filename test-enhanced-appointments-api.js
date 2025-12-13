/**
 * Quick test to verify Enhanced Appointments API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testEnhancedAppointmentsAPI() {
  console.log('🧪 Testing Enhanced Appointments API');
  console.log('='.repeat(40));

  try {
    // Test 1: Check if server is running
    console.log('\n🔍 Step 1: Check Server Health');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running:', healthResponse.data.message);

    // Test 2: Try to access enhanced appointments endpoint (should get 401 without auth)
    console.log('\n🔍 Step 2: Test Enhanced Appointments Endpoint');
    try {
      await axios.get(`${BASE_URL}/api/enhanced-appointments/doctors`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Enhanced appointments endpoint exists (401 Unauthorized as expected)');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 3: Try to login and test appointment creation
    console.log('\n🔍 Step 3: Test with Authentication');
    
    // Try to login with test credentials
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'patient@test.com',
        password: 'password123'
      });

      if (loginResponse.data.success) {
        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        // Test appointment creation endpoint
        try {
          const appointmentData = {
            doctorWallet: '0x1234567890123456789012345678901234567890',
            appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            serviceType: 'inPerson',
            duration: 30,
            reason: 'API test appointment'
          };

          const appointmentResponse = await axios.post(
            `${BASE_URL}/api/enhanced-appointments/appointments`, 
            appointmentData,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          console.log('✅ Appointment creation endpoint works:', appointmentResponse.data.success);
          
          if (appointmentResponse.data.success) {
            console.log('📋 Created appointment ID:', appointmentResponse.data.data.appointment.id);
          }

        } catch (appointmentError) {
          console.log('⚠️ Appointment creation error:', appointmentError.response?.status, appointmentError.response?.data?.error);
        }

      } else {
        console.log('❌ Login failed:', loginResponse.data.error);
      }

    } catch (loginError) {
      console.log('⚠️ Login error (test user may not exist):', loginError.response?.data?.error);
    }

    // Test 4: Check available routes
    console.log('\n🔍 Step 4: Available Enhanced Appointment Routes');
    console.log('• GET /api/enhanced-appointments/doctors - Get doctors with pricing');
    console.log('• POST /api/enhanced-appointments/appointments - Create appointment');
    console.log('• POST /api/enhanced-appointments/appointments/:id/payment - Process payment');
    console.log('• GET /api/enhanced-appointments/patient/appointments - Get patient appointments');
    console.log('• GET /api/enhanced-appointments/doctor/appointments - Get doctor appointments');

    console.log('\n🎉 API Test Complete!');
    console.log('💡 If appointment creation failed, make sure:');
    console.log('  • Test users exist in database');
    console.log('  • Enhanced appointment tables are created');
    console.log('  • Doctor service pricing is set up');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with:');
      console.log('  • npm run dev');
      console.log('  • or node server/src/server.js');
    }
  }
}

// Run the test
testEnhancedAppointmentsAPI();