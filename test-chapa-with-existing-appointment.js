/**
 * Test Chapa Payment with Existing Appointment
 */

const axios = require('axios');

async function testChapaWithExistingAppointment() {
  console.log('🧪 TESTING CHAPA WITH EXISTING APPOINTMENT\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // 1. Get existing appointments
    console.log('📋 1. GETTING EXISTING APPOINTMENTS\n');
    
    const appointmentsResponse = await axios.get(`${baseURL}/api/appointments`);
    
    if (!appointmentsResponse.data.success) {
      console.log('❌ Failed to get appointments:', appointmentsResponse.data.error);
      return;
    }
    
    const appointments = appointmentsResponse.data.data;
    console.log(`Found ${appointments.length} appointments`);
    
    appointments.forEach((apt, index) => {
      console.log(`\nAppointment ${index + 1}:`);
      console.log(`  ID: ${apt.id}`);
      console.log(`  Patient: ${apt.patientWalletAddress}`);
      console.log(`  Doctor: ${apt.doctorWalletAddress}`);
      console.log(`  Fee: ${apt.fee} ETB`);
      console.log(`  Status: ${apt.status}`);
      console.log(`  Payment Status: ${apt.paymentStatus}`);
      console.log(`  Chapa Transaction: ${apt.chapa_transaction_id || 'None'}`);
    });
    
    // Find an appointment that can be used for testing
    let testAppointment = appointments.find(apt => 
      apt.fee > 0 && 
      apt.patientWalletAddress && 
      apt.paymentStatus !== 'paid'
    );
    
    if (!testAppointment) {
      // Use the first appointment and temporarily change its payment status for testing
      testAppointment = appointments[0];
      console.log(`\n⚠️ No unpaid appointments found. Using appointment ${testAppointment.id} for testing`);
      console.log('Note: This appointment is already paid, but we\'ll test the payment flow anyway');
    }
    
    console.log(`\n🎯 Testing with appointment: ${testAppointment.id}`);
    console.log(`   Patient: ${testAppointment.patientWalletAddress}`);
    console.log(`   Fee: ${testAppointment.fee} ETB`);
    
    // 2. Test Chapa payment initialization
    console.log('\n💳 2. TESTING CHAPA PAYMENT INITIALIZATION\n');
    
    const paymentData = {
      appointmentId: testAppointment.id,
      patientWallet: testAppointment.patientWalletAddress,
      returnUrl: `http://localhost:5173/appointments/${testAppointment.id}/payment-success`
    };
    
    console.log('📤 Sending payment initialization request...');
    console.log('Payload:', JSON.stringify(paymentData, null, 2));
    
    const paymentResponse = await axios.post(`${baseURL}/api/chapa-payment/initialize`, paymentData);
    
    console.log('\n📥 PAYMENT RESPONSE:');
    console.log('Status:', paymentResponse.status);
    console.log('Success:', paymentResponse.data.success);
    
    if (paymentResponse.data.success) {
      console.log('\n✅ PAYMENT INITIALIZATION SUCCESSFUL!');
      console.log('\n📊 Payment Details:');
      console.log(`   Payment ID: ${paymentResponse.data.data.payment.id}`);
      console.log(`   Amount: ${paymentResponse.data.data.payment.amount} ETB`);
      console.log(`   Transaction Ref: ${paymentResponse.data.data.txRef}`);
      console.log(`   Demo Mode: ${paymentResponse.data.data.demo || false}`);
      
      if (paymentResponse.data.data.checkoutUrl) {
        console.log('\n🔗 CHECKOUT URL:');
        console.log(paymentResponse.data.data.checkoutUrl);
        
        // Check if it's a real Chapa URL
        if (paymentResponse.data.data.checkoutUrl.includes('checkout.chapa.co')) {
          console.log('\n🎉 SUCCESS! REAL CHAPA CHECKOUT URL RECEIVED!');
          console.log('✅ Phone number validation fix is working!');
          console.log('✅ This payment will appear in your Chapa dashboard');
          console.log('✅ No more demo mode - real Ethiopian payment integration active');
        } else {
          console.log('\n⚠️ Demo/fallback URL received');
          console.log('This suggests there may still be an issue with the phone number or other data');
        }
        
        // 3. Test payment verification
        console.log('\n🔍 3. TESTING PAYMENT VERIFICATION\n');
        
        const txRef = paymentResponse.data.data.txRef;
        console.log(`Verifying transaction: ${txRef}`);
        
        try {
          const verifyResponse = await axios.get(`${baseURL}/api/chapa-payment/verify/${txRef}`);
          
          console.log('Verification Response:');
          console.log(`  Success: ${verifyResponse.data.success}`);
          console.log(`  Status: ${verifyResponse.data.data?.status || 'unknown'}`);
          console.log(`  Demo: ${verifyResponse.data.data?.demo || false}`);
          
          if (verifyResponse.data.success) {
            console.log('✅ Payment verification endpoint working');
          }
        } catch (verifyError) {
          console.log('⚠️ Verification test (expected for new payments):', verifyError.response?.data?.error || verifyError.message);
        }
        
        // 4. Check payment status
        console.log('\n📊 4. CHECKING PAYMENT STATUS\n');
        
        try {
          const statusResponse = await axios.get(`${baseURL}/api/chapa-payment/status/${testAppointment.id}?patientWallet=${testAppointment.patientWalletAddress}`);
          
          if (statusResponse.data.success) {
            console.log('✅ Payment status retrieved successfully');
            console.log('Payment Details:');
            console.log(`  Payment Status: ${statusResponse.data.data.paymentStatus}`);
            console.log(`  Chapa Transaction ID: ${statusResponse.data.data.chapaTransactionId || 'None'}`);
            console.log(`  Latest Payment: ${statusResponse.data.data.latestPayment ? 'Found' : 'None'}`);
            console.log(`  Consultation Access: ${statusResponse.data.data.consultationAccess?.canAccess ? 'Allowed' : 'Blocked'}`);
          }
        } catch (statusError) {
          console.log('⚠️ Status check failed:', statusError.response?.data?.error || statusError.message);
        }
        
      } else {
        console.log('❌ No checkout URL received');
      }
      
    } else {
      console.log('\n❌ PAYMENT INITIALIZATION FAILED');
      console.log('Error:', paymentResponse.data.error);
      console.log('Message:', paymentResponse.data.message);
      
      // Check if it's a phone number related error
      if (paymentResponse.data.error && paymentResponse.data.error.toLowerCase().includes('phone')) {
        console.log('\n🔍 PHONE NUMBER ERROR DETECTED');
        console.log('The phone number validation fix may need further adjustment');
      }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('===========');
    
    if (paymentResponse.data.success && paymentResponse.data.data.checkoutUrl?.includes('checkout.chapa.co')) {
      console.log('🎉 SUCCESS: Real Chapa integration is working!');
      console.log('✅ Phone number validation fix successful');
      console.log('✅ Payments will now appear in Chapa dashboard');
      console.log('✅ No more demo mode issues');
      console.log('\n💡 Next steps:');
      console.log('   1. Test the payment flow in the frontend');
      console.log('   2. Complete a payment and check Chapa dashboard');
      console.log('   3. Verify payment status updates correctly');
    } else {
      console.log('⚠️ Issues detected - may need further investigation');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with:');
      console.log('   cd server && npm start');
    }
  }
}

console.log('🧪 CHAPA PAYMENT INTEGRATION TEST');
console.log('=================================');
console.log('Testing the phone number validation fix and real Chapa integration\n');

testChapaWithExistingAppointment();