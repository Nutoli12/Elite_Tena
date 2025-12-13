/**
 * Test Chapa Payment Endpoint with Phone Number Fix
 * This tests the actual payment endpoint to verify the phone validation fix
 */

const axios = require('axios');

async function testChapaEndpointWithPhoneFix() {
  console.log('🧪 TESTING CHAPA ENDPOINT WITH PHONE NUMBER FIX\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // 1. First, let's check if we have any appointments to test with
    console.log('📋 1. CHECKING EXISTING APPOINTMENTS\n');
    
    const appointmentsResponse = await axios.get(`${baseURL}/api/appointments`);
    
    if (!appointmentsResponse.data.success) {
      console.log('❌ Failed to get appointments:', appointmentsResponse.data.error);
      return;
    }
    
    const appointments = appointmentsResponse.data.data;
    console.log(`Found ${appointments.length} appointments`);
    
    // Find an appointment that needs payment
    const unpaidAppointment = appointments.find(apt => 
      apt.fee > 0 && 
      apt.paymentStatus !== 'paid' && 
      apt.patientWalletAddress
    );
    
    if (!unpaidAppointment) {
      console.log('⚠️ No unpaid appointments found. Creating a test appointment...');
      
      // Create a test appointment with problematic phone number
      const testAppointment = {
        patientWalletAddress: '0x1765374535552776ch',
        doctorWalletAddress: '0xdoctor123',
        serviceType: 'inPerson',
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test consultation for phone fix',
        fee: 150
      };
      
      try {
        const createResponse = await axios.post(`${baseURL}/api/appointments`, testAppointment);
        if (createResponse.data.success) {
          console.log('✅ Test appointment created:', createResponse.data.data.id);
          unpaidAppointment = createResponse.data.data;
        } else {
          console.log('❌ Failed to create test appointment:', createResponse.data.error);
          return;
        }
      } catch (createError) {
        console.log('❌ Error creating test appointment:', createError.message);
        return;
      }
    }
    
    console.log(`\n🎯 Testing with appointment: ${unpaidAppointment.id}`);
    console.log(`   Patient: ${unpaidAppointment.patientWalletAddress}`);
    console.log(`   Fee: ${unpaidAppointment.fee} ETB`);
    console.log(`   Current Payment Status: ${unpaidAppointment.paymentStatus || 'none'}`);
    
    // 2. Test the Chapa payment initialization
    console.log('\n💳 2. TESTING CHAPA PAYMENT INITIALIZATION\n');
    
    const paymentData = {
      appointmentId: unpaidAppointment.id,
      patientWallet: unpaidAppointment.patientWalletAddress,
      returnUrl: `http://localhost:5173/appointments/${unpaidAppointment.id}/payment-success`
    };
    
    console.log('📤 Sending payment initialization request...');
    console.log('Payload:', JSON.stringify(paymentData, null, 2));
    
    const paymentResponse = await axios.post(`${baseURL}/api/chapa-payment/initialize`, paymentData);
    
    console.log('\n📥 PAYMENT RESPONSE:');
    console.log('Status:', paymentResponse.status);
    console.log('Success:', paymentResponse.data.success);
    
    if (paymentResponse.data.success) {
      console.log('✅ PAYMENT INITIALIZATION SUCCESSFUL!');
      console.log('\n📊 Payment Details:');
      console.log(`   Payment ID: ${paymentResponse.data.data.payment.id}`);
      console.log(`   Amount: ${paymentResponse.data.data.payment.amount} ETB`);
      console.log(`   Transaction Ref: ${paymentResponse.data.data.txRef}`);
      console.log(`   Demo Mode: ${paymentResponse.data.data.demo}`);
      
      if (paymentResponse.data.data.checkoutUrl) {
        console.log('\n🔗 CHECKOUT URL RECEIVED:');
        console.log(paymentResponse.data.data.checkoutUrl);
        
        // Check if it's a real Chapa URL (not demo)
        if (paymentResponse.data.data.checkoutUrl.includes('checkout.chapa.co')) {
          console.log('✅ REAL CHAPA CHECKOUT URL - Phone number validation fix is working!');
          console.log('✅ This payment will appear in your Chapa dashboard');
        } else {
          console.log('⚠️ Demo/fallback URL - phone number may still have issues');
        }
      } else {
        console.log('❌ No checkout URL received');
      }
      
      // 3. Test payment verification
      console.log('\n🔍 3. TESTING PAYMENT VERIFICATION\n');
      
      const txRef = paymentResponse.data.data.txRef;
      console.log(`Verifying transaction: ${txRef}`);
      
      try {
        const verifyResponse = await axios.get(`${baseURL}/api/chapa-payment/verify/${txRef}`);
        
        console.log('Verification Status:', verifyResponse.data.success);
        console.log('Payment Status:', verifyResponse.data.data?.status || 'unknown');
        
        if (verifyResponse.data.success) {
          console.log('✅ Payment verification endpoint working');
        }
      } catch (verifyError) {
        console.log('⚠️ Verification test failed (expected for new payments):', verifyError.response?.data?.error || verifyError.message);
      }
      
      // 4. Check payment status
      console.log('\n📊 4. CHECKING PAYMENT STATUS\n');
      
      try {
        const statusResponse = await axios.get(`${baseURL}/api/chapa-payment/status/${unpaidAppointment.id}?patientWallet=${unpaidAppointment.patientWalletAddress}`);
        
        if (statusResponse.data.success) {
          console.log('✅ Payment status retrieved successfully');
          console.log('Payment Status:', statusResponse.data.data.paymentStatus);
          console.log('Chapa Transaction ID:', statusResponse.data.data.chapaTransactionId);
          console.log('Latest Payment:', statusResponse.data.data.latestPayment ? 'Found' : 'None');
        }
      } catch (statusError) {
        console.log('⚠️ Status check failed:', statusError.response?.data?.error || statusError.message);
      }
      
    } else {
      console.log('❌ PAYMENT INITIALIZATION FAILED');
      console.log('Error:', paymentResponse.data.error);
      console.log('Message:', paymentResponse.data.message);
      
      // Check if it's a phone number related error
      if (paymentResponse.data.error && paymentResponse.data.error.toLowerCase().includes('phone')) {
        console.log('\n🔍 PHONE NUMBER ERROR DETECTED');
        console.log('This suggests the phone number validation fix may not be working properly');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with:');
      console.log('   cd server && npm start');
    }
  }
}

console.log('🧪 CHAPA ENDPOINT PHONE FIX TEST');
console.log('================================');
console.log('This will test if the Ethiopian phone number validation fix is working\n');

testChapaEndpointWithPhoneFix();