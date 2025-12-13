const axios = require('axios');

async function testDirectEndpoint() {
  try {
    // Login first
    const loginResponse = await axios.post('http://localhost:3005/api/auth/login', {
      email: 'patient@test.com',
      password: 'password123'
    });

    const token = loginResponse.data.data.auth.token;
    const wallet = loginResponse.data.data.user.walletAddress;

    console.log('🔑 Token:', token);
    console.log('👤 Wallet:', wallet);

    // Test the pricing endpoint
    const pricingResponse = await axios.get('http://localhost:3005/api/enhanced-appointments/doctors/0x0987654321098765432109876543210987654321/pricing', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-wallet-address': wallet
      }
    });

    console.log('✅ Pricing response:', pricingResponse.data);

    // Test the appointment creation endpoint
    const appointmentData = {
      doctorWallet: '0x0987654321098765432109876543210987654321',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      serviceType: 'inPerson',
      duration: 30,
      reason: 'Test appointment'
    };

    console.log('\n📅 Creating appointment with data:', appointmentData);

    const appointmentResponse = await axios.post('http://localhost:3005/api/enhanced-appointments/appointments', appointmentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-wallet-address': wallet
      }
    });

    console.log('✅ Appointment response:', appointmentResponse.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDirectEndpoint();