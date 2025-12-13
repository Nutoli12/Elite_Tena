/**
 * Debug Payment Service Call
 * Trace exactly where demo mode is being triggered
 */

const axios = require('axios');
require('dotenv').config({ path: 'server/.env' });

// Import the payment service directly
const paymentService = require('./server/services/payment.cjs');

async function debugPaymentServiceCall() {
  console.log('🔍 DEBUGGING PAYMENT SERVICE CALL');
  console.log('==================================\n');

  // Test the payment service directly with the same data that ChapaPaymentConsentBridge uses
  const testChapaData = {
    amount: 400,
    currency: 'ETB',
    email: 'frew@gmail.com',
    firstName: 'Patient',
    lastName: 'User',
    phoneNumber: '+25195676453737',
    txRef: `TEST-DIRECT-${Date.now()}`,
    callbackUrl: 'http://localhost:3005/api/payments/chapa/webhook',
    returnUrl: 'http://localhost:5173/payment-success',
    title: 'Elite Tena Healthcare',
    description: 'Test payment',
    customization: {},
    paymentMethods: ['telebirr', 'cbe_birr', 'awash_birr', 'visa', 'mastercard']
  };

  console.log('📤 Step 1: Test Payment Service Directly');
  console.log('Data:', JSON.stringify(testChapaData, null, 2));

  try {
    const result = await paymentService.initializePayment('chapa', testChapaData);

    console.log('\n✅ Payment Service Result:');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Data:', JSON.stringify(result.data, null, 2));
    console.log('Checkout URL:', result.checkoutUrl);

    if (result.success) {
      console.log('\n🎉 PAYMENT SERVICE IS WORKING!');
      console.log('The issue is NOT in the payment service itself.');
      console.log('The demo fallback must be happening in:');
      console.log('1. ChapaPaymentConsentBridge error handling');
      console.log('2. Controller error handling');
      console.log('3. Some middleware intercepting the call');
    } else {
      console.log('\n❌ PAYMENT SERVICE FAILED');
      console.log('This is why demo mode is being triggered');
      console.log('Error details:', result.error);
      
      if (result.error && result.error.includes('secret key')) {
        console.log('\n🔍 SECRET KEY ISSUE DETECTED');
        console.log('Current secret key:', process.env.CHAPA_SECRET_KEY ? `${process.env.CHAPA_SECRET_KEY.substring(0, 15)}...` : 'NOT SET');
      }
    }

  } catch (error) {
    console.log('\n❌ Payment Service Exception:');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }

  // Test 2: Check if the issue is in the data format
  console.log('\n📤 Step 2: Test with Minimal Data');
  const minimalData = {
    amount: 100,
    currency: 'ETB',
    email: 'test@gmail.com',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+251911234567',
    txRef: `MINIMAL-${Date.now()}`,
    callback_url: 'http://localhost:3005/webhook',
    return_url: 'http://localhost:5173/success'
  };

  try {
    const minimalResult = await paymentService.initializePayment('chapa', minimalData);
    console.log('Minimal test success:', minimalResult.success);
    console.log('Minimal test error:', minimalResult.error);
  } catch (error) {
    console.log('Minimal test exception:', error.message);
  }
}

debugPaymentServiceCall();