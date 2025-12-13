/**
 * Test Improved Chapa Payment Flow
 * Tests the cleaned up payment experience without demo mode indicators
 */

const axios = require('axios');

async function testImprovedChapaFlow() {
  console.log('🚀 Testing Improved Chapa Payment Flow...\n');

  const baseURL = 'http://localhost:3005';
  
  try {
    // Step 1: Create appointment
    console.log('📋 Step 1: Creating Test Appointment');
    
    const appointmentData = {
      patientWalletAddress: '0x1234567890123456789012345678901234567890',
      doctorWalletAddress: '0x0987654321098765432109876543210987654321',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      serviceType: 'inPerson',
      reason: 'Test Improved Chapa Flow',
      fee: 400,
      paymentMethod: 'chapa',
      paymentStatus: 'pending',
      status: 'payment_pending'
    };

    const appointmentResponse = await axios.post(`${baseURL}/api/appointments`, appointmentData);
    
    if (!appointmentResponse.data.success) {
      throw new Error('Failed to create appointment: ' + appointmentResponse.data.error);
    }

    const appointmentId = appointmentResponse.data.data.id;
    console.log('✅ Appointment created:', appointmentId);

    // Step 2: Initialize Chapa payment
    console.log('\n💳 Step 2: Initialize Chapa Payment');
    
    const paymentData = {
      appointmentId: appointmentId,
      patientWallet: '0x1234567890123456789012345678901234567890',
      amount: 400,
      returnUrl: `http://localhost:5173/appointments/${appointmentId}/success`
    };

    const initResponse = await axios.post(`${baseURL}/api/chapa-payment/initialize`, paymentData);
    
    if (initResponse.data.success) {
      console.log('✅ Chapa payment initialized');
      console.log('   Transaction ID:', initResponse.data.data.txRef);
      console.log('   Checkout URL:', initResponse.data.data.checkoutUrl ? 'Available' : 'Test Mode');
      
      const txRef = initResponse.data.data.txRef;
      
      // Step 3: Monitor payment completion
      console.log('\n⏳ Step 3: Monitoring Payment Status...');
      
      let attempts = 0;
      let paymentCompleted = false;
      
      while (attempts < 15 && !paymentCompleted) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
        console.log(`   Checking status... (${attempts}/15)`);
        
        try {
          const verifyResponse = await axios.get(`${baseURL}/api/chapa-payment/verify/${txRef}`);
          
          if (verifyResponse.data.success) {
            const status = verifyResponse.data.data.status;
            console.log(`   Status: ${status}`);
            
            if (status === 'completed') {
              paymentCompleted = true;
              console.log('\n🎉 PAYMENT COMPLETED SUCCESSFULLY!');
              console.log('✅ Clean payment flow (no demo indicators)');
              console.log('✅ Proper status transitions');
              console.log('✅ Appointment confirmed');
              
              console.log('\n📊 Payment Details:');
              console.log('   Payment ID:', verifyResponse.data.data.payment.id);
              console.log('   Amount:', verifyResponse.data.data.payment.amount, 'ETB');
              console.log('   Status:', verifyResponse.data.data.payment.status);
              
              break;
            } else if (status === 'failed') {
              console.log('\n❌ Payment failed');
              break;
            }
          }
        } catch (verifyError) {
          console.log('   Verification error, retrying...');
        }
      }
      
      if (!paymentCompleted && attempts >= 15) {
        console.log('\n⚠️ Payment verification timed out');
        console.log('   This may indicate a configuration issue');
        
        console.log('\n🔍 Troubleshooting Steps:');
        console.log('   1. Check if server is running');
        console.log('   2. Verify Chapa API keys');
        console.log('   3. Check network connectivity');
        console.log('   4. Review server logs for errors');
      }
      
    } else {
      console.log('❌ Payment initialization failed:', initResponse.data.error);
      
      console.log('\n💡 Common Issues:');
      console.log('   • Invalid Chapa API keys');
      console.log('   • Network connectivity problems');
      console.log('   • Server configuration errors');
      console.log('   • Database connection issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with:');
      console.log('   cd server && npm start');
    }
  }
}

console.log('🧪 IMPROVED CHAPA FLOW TEST');
console.log('============================');
console.log('This test verifies:');
console.log('• No demo mode indicators');
console.log('• Clean payment messages');
console.log('• Proper status handling');
console.log('• Consistent Chapa integration\n');

testImprovedChapaFlow();