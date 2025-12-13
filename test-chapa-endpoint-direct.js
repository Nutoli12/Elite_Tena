/**
 * Test Chapa Payment Endpoint Directly
 * Tests the actual /api/chapa-payment/initialize endpoint
 */

const axios = require('axios');

async function testChapaEndpointDirect() {
  console.log('🧪 TESTING CHAPA ENDPOINT DIRECTLY');
  console.log('==================================\n');

  const baseURL = 'http://localhost:3005';

  // Use a real appointment ID from the diagnostic
  const testData = {
    appointmentId: '69f3d5e9-0f58-431b-b83d-0a79de7e8c9a', // From diagnostic
    patientWallet: '0x1765610206838ye1ru', // From diagnostic
    returnUrl: 'http://localhost:5173/appointments/69f3d5e9-0f58-431b-b83d-0a79de7e8c9a/payment-success'
  };

  console.log('📤 Calling /api/chapa-payment/initialize with:');
  console.log(JSON.stringify(testData, null, 2));

  try {
    const response = await axios.post(`${baseURL}/api/chapa-payment/initialize`, testData);

    console.log('\n✅ ENDPOINT SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.checkoutUrl) {
      console.log('\n🎉 CHECKOUT URL RECEIVED:');
      console.log(response.data.data.checkoutUrl);
      console.log('\n✅ The endpoint is working correctly!');
    } else if (response.data.data && response.data.data.demo) {
      console.log('\n⚠️ DEMO MODE DETECTED');
      console.log('This means the endpoint is falling back to demo mode');
      console.log('Check the server logs for the actual Chapa API error');
    }

  } catch (error) {
    console.log('\n❌ ENDPOINT ERROR:');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    console.log('Message:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with:');
      console.log('   cd server && npm start');
    }
  }
}

testChapaEndpointDirect();