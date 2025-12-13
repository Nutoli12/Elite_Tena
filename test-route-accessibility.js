const axios = require('axios');

async function testRouteAccessibility() {
  console.log('🧪 Testing Enhanced Appointments Route Accessibility');
  console.log('='.repeat(50));

  try {
    // Test 1: Check if the route exists (should get 401 without auth)
    console.log('\n📍 Test 1: Check route existence (expect 401)');
    try {
      await axios.get('http://localhost:3005/api/enhanced-appointments/doctors');
    } catch (error) {
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      if (error.response?.status === 401) {
        console.log('✅ Route exists (401 = needs auth)');
      } else if (error.response?.status === 404) {
        console.log('❌ Route not found (404)');
      }
    }

    // Test 2: Login and get proper auth
    console.log('\n📍 Test 2: Login and test with auth');
    const loginResponse = await axios.post('http://localhost:3005/api/auth/login', {
      email: 'patient@test.com',
      password: 'password123'
    });

    const token = loginResponse.data.data.auth.token;
    const wallet = loginResponse.data.data.user.walletAddress;
    
    console.log('🔑 Token:', token);
    console.log('👤 Wallet:', wallet);

    // Test 3: Try the doctors endpoint with auth
    console.log('\n📍 Test 3: Test doctors endpoint with auth');
    try {
      const doctorsResponse = await axios.get('http://localhost:3005/api/enhanced-appointments/doctors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-wallet-address': wallet
        }
      });
      console.log('✅ Doctors endpoint works:', doctorsResponse.data);
    } catch (error) {
      console.log('❌ Doctors endpoint error:', error.response?.data);
    }

    // Test 4: Try the appointments endpoint with auth
    console.log('\n📍 Test 4: Test appointments creation endpoint');
    const appointmentData = {
      doctorWallet: '0x0987654321098765432109876543210987654321',
      appointmentDate: '2025-12-16 09:00',
      serviceType: 'inPerson',
      duration: 30,
      reason: 'Test appointment'
    };

    try {
      const appointmentResponse = await axios.post('http://localhost:3005/api/enhanced-appointments/appointments', appointmentData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-wallet-address': wallet
        }
      });
      console.log('✅ Appointment creation works:', appointmentResponse.data);
    } catch (error) {
      console.log('❌ Appointment creation error:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRouteAccessibility();