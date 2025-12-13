/**
 * Direct Chapa API Test
 * Tests if our Chapa secret key works with the actual Chapa API
 */

const axios = require('axios');
require('dotenv').config({ path: 'server/.env' });

async function testChapaApiDirect() {
  console.log('🧪 DIRECT CHAPA API TEST');
  console.log('========================\n');

  const secretKey = process.env.CHAPA_SECRET_KEY;
  console.log('🔑 Secret Key:', secretKey ? `${secretKey.substring(0, 15)}...` : 'NOT SET');
  console.log('🔑 Key Length:', secretKey ? secretKey.length : 0);
  console.log('🔑 Key Type:', secretKey ? (secretKey.startsWith('CHASECK_TEST') ? 'TEST KEY' : 'UNKNOWN') : 'NONE');

  if (!secretKey) {
    console.log('❌ No Chapa secret key found in environment');
    return;
  }

  // Test payment initialization
  const testPaymentData = {
    amount: 100,
    currency: 'ETB',
    email: 'test@gmail.com',
    first_name: 'Test',
    last_name: 'User',
    phone_number: '+251911234567',
    tx_ref: `TEST-${Date.now()}`,
    callback_url: 'http://localhost:3005/api/payments/chapa/webhook',
    return_url: 'http://localhost:5173/payment-success',
    customization: {
      title: 'Elite Tena Test',
      description: 'Test payment'
    }
  };

  console.log('\n📤 Testing Chapa API with payload:');
  console.log(JSON.stringify(testPaymentData, null, 2));

  try {
    const response = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      testPaymentData,
      {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ CHAPA API SUCCESS!');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.checkout_url) {
      console.log('\n🎉 CHECKOUT URL RECEIVED:');
      console.log(response.data.data.checkout_url);
      console.log('\n✅ Your Chapa integration is working correctly!');
      console.log('The issue is likely in how the payment service handles the response.');
    }

  } catch (error) {
    console.log('\n❌ CHAPA API ERROR:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Error Message:', error.message);

    if (error.response?.status === 401) {
      console.log('\n🔍 DIAGNOSIS: Invalid API credentials');
      console.log('Solutions:');
      console.log('1. Check if your secret key is correct');
      console.log('2. Verify the key is from the right environment (test/live)');
      console.log('3. Make sure the key is not expired');
    } else if (error.response?.status === 400) {
      console.log('\n🔍 DIAGNOSIS: Invalid request data');
      console.log('Solutions:');
      console.log('1. Check required fields are provided');
      console.log('2. Verify email and phone number formats');
      console.log('3. Ensure amount is a positive number');
    }
  }
}

testChapaApiDirect();