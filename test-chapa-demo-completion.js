/**
 * Test Chapa Demo Payment Completion
 * Simulates the full payment flow with demo keys
 */

const axios = require('axios');

async function testChapaDemo() {
  console.log('🧪 Testing Chapa Demo Payment Completion...\n');

  const baseURL = 'http://localhost:3005';
  
  // Test data
  const testData = {
    appointmentId: 'test-appointment-123',
    patientWallet: '0x1234567890123456789012345678901234567890',
    amount: 400,
    returnUrl: 'http://localhost:5173/appointments/test/success'
  };

  try {
    // Step 1: Initialize payment
    console.log('📋 Step 1: Initialize Chapa Payment');
    const initResponse = await axios.post(`${baseURL}/api/chapa-payment/initialize`, testData);
    
    if (initResponse.data.success) {
      console.log('✅ Payment initialized successfully');
      console.log('   Transaction ID:', initResponse.data.data.txRef);
      console.log('   Demo Mode:', initResponse.data.data.demo);
      
      const txRef = initResponse.data.data.txRef;
      
      // Step 2: Wait for demo processing (simulates user payment)
      console.log('\n⏳ Step 2: Simulating Payment Processing...');
      console.log('   (In real scenario, user would pay in Chapa window)');
      
      // Wait 6 seconds (demo payment takes 5 seconds + buffer)
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Step 3: Verify payment
      console.log('\n✅ Step 3: Verify Payment Completion');
      const verifyResponse = await axios.get(`${baseURL}/api/chapa-payment/verify/${txRef}`);
      
      if (verifyResponse.data.success) {
        console.log('🎉 Payment verification successful!');
        console.log('   Status:', verifyResponse.data.data.status);
        console.log('   Demo Mode:', verifyResponse.data.data.demo);
        console.log('   Payment ID:', verifyResponse.data.data.payment.id);
        
        if (verifyResponse.data.data.status === 'completed') {
          console.log('\n🎯 DEMO PAYMENT FLOW: COMPLETE');
          console.log('✅ Payment initialized');
          console.log('✅ Payment processed (demo)');
          console.log('✅ Payment verified');
          console.log('✅ Appointment confirmed');
          
          console.log('\n💡 For REAL payments, you need:');
          console.log('   1. Real Chapa business account');
          console.log('   2. Live API keys (CHASECK_LIVE-...)');
          console.log('   3. Ethiopian business verification');
          console.log('   4. Bank account for settlements');
        } else {
          console.log('⚠️ Payment not completed yet, status:', verifyResponse.data.data.status);
        }
      } else {
        console.log('❌ Payment verification failed:', verifyResponse.data.error);
      }
      
    } else {
      console.log('❌ Payment initialization failed:', initResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your server is running:');
      console.log('   cd server && npm start');
    }
  }
}

// Run the test
testChapaDemo();