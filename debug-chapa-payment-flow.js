/**
 * Debug Chapa Payment Flow
 * Step through the payment initialization to see where demo mode is triggered
 */

const axios = require('axios');

async function debugChapaPaymentFlow() {
  console.log('🔍 DEBUGGING CHAPA PAYMENT FLOW');
  console.log('===============================\n');

  const baseURL = 'http://localhost:3005';

  // Test data
  const testData = {
    appointmentId: '69f3d5e9-0f58-431b-b83d-0a79de7e8c9a',
    patientWallet: '0x1765610206838ye1ru',
    returnUrl: 'http://localhost:5173/appointments/69f3d5e9-0f58-431b-b83d-0a79de7e8c9a/payment-success'
  };

  console.log('📤 Step 1: Call Chapa Payment Endpoint');
  console.log('Data:', JSON.stringify(testData, null, 2));

  try {
    const response = await axios.post(`${baseURL}/api/chapa-payment/initialize`, testData);

    console.log('\n✅ Response received:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Demo flag:', response.data.data?.demo);
    console.log('Checkout URL:', response.data.data?.checkoutUrl);
    console.log('Provider:', response.data.data?.provider);

    if (response.data.data?.demo) {
      console.log('\n🔍 DEMO MODE DETECTED - Analyzing...');
      
      // Check the payment record that was created
      console.log('\n📋 Step 2: Check Payment Record');
      const paymentId = response.data.data.payment?.id;
      
      if (paymentId) {
        try {
          const paymentResponse = await axios.get(`${baseURL}/api/payments/${paymentId}`);
          
          if (paymentResponse.data.success) {
            const payment = paymentResponse.data.data;
            console.log('Payment Status:', payment.status);
            console.log('Provider Data:', JSON.stringify(payment.providerData, null, 2));
            
            if (payment.providerData?.demo) {
              console.log('\n🎯 FOUND THE ISSUE:');
              console.log('The payment record has demo: true in providerData');
              console.log('This means the payment service returned demo data');
              
              if (payment.providerData.message) {
                console.log('Demo reason:', payment.providerData.message);
              }
            }
          }
        } catch (paymentError) {
          console.log('Could not fetch payment record:', paymentError.message);
        }
      }

      // Check server logs for Chapa API errors
      console.log('\n💡 NEXT STEPS:');
      console.log('1. Check server console logs for Chapa API errors');
      console.log('2. The payment service is falling back to demo mode');
      console.log('3. This usually happens when Chapa API call fails');
      console.log('4. Common causes:');
      console.log('   - Invalid email format in patient data');
      console.log('   - Invalid phone number format');
      console.log('   - Missing required fields');
      console.log('   - Network issues');
    } else {
      console.log('\n✅ Real Chapa payment initialized successfully!');
    }

  } catch (error) {
    console.log('\n❌ Endpoint Error:');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

debugChapaPaymentFlow();