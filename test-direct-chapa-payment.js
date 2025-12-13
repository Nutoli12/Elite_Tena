/**
 * Test Direct Chapa Payment Flow
 * Verifies the simplified payment experience - no method selection, direct to Chapa
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function testDirectChapaPayment() {
  console.log('💳 Testing Direct Chapa Payment Flow...\n');

  try {
    // Step 1: Create a pending appointment
    console.log('📋 Step 1: Creating appointment for payment...');
    
    const appointmentData = {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Direct Chapa payment test',
      serviceType: 'inPerson',
      fee: 400
    };

    const appointmentResponse = await axios.post(`${BASE_URL}/appointments`, appointmentData);
    
    if (!appointmentResponse.data.success) {
      throw new Error('Failed to create appointment: ' + appointmentResponse.data.error);
    }

    const appointment = appointmentResponse.data.data;
    console.log(`✅ Appointment created: ${appointment.id}`);
    console.log(`   Status: ${appointment.status}`);
    console.log(`   Payment Status: ${appointment.paymentStatus}`);
    console.log(`   Fee: ${appointment.fee} ETB`);

    // Step 2: Initialize direct Chapa payment
    console.log('\n💳 Step 2: Initializing direct Chapa payment...');
    
    const paymentData = {
      appointmentId: appointment.id,
      patientWallet: appointmentData.patientWalletAddress,
      returnUrl: `http://localhost:3000/appointments/${appointment.id}/payment-success`
    };

    const paymentResponse = await axios.post(`${BASE_URL}/chapa-payment/initialize`, paymentData);
    
    if (!paymentResponse.data.success) {
      throw new Error('Failed to initialize payment: ' + paymentResponse.data.error);
    }

    const payment = paymentResponse.data.data;
    console.log('✅ Chapa payment initialized:');
    console.log(`   Transaction ID: ${payment.txRef}`);
    console.log(`   Checkout URL: ${payment.checkoutUrl}`);
    console.log(`   Demo Mode: ${payment.demo ? 'Yes' : 'No'}`);
    console.log(`   Provider: ${payment.provider}`);

    // Step 3: Verify payment flow characteristics
    console.log('\n🔍 Step 3: Verifying direct payment flow...');
    
    // Check that we get a direct checkout URL (no method selection)
    if (payment.checkoutUrl) {
      console.log('✅ CORRECT: Direct checkout URL provided');
      console.log('   → No payment method selection required');
      console.log('   → User goes straight to Chapa gateway');
    } else {
      console.log('❌ ERROR: No checkout URL provided');
    }

    // Check transaction reference format
    if (payment.txRef && payment.txRef.startsWith('ELITE-CHAPA-')) {
      console.log('✅ CORRECT: Transaction reference format valid');
    } else {
      console.log('❌ ERROR: Invalid transaction reference format');
    }

    // Step 4: Simulate payment verification (for demo mode)
    if (payment.demo) {
      console.log('\n⏳ Step 4: Simulating demo payment verification...');
      
      // Wait a moment for demo processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const verifyResponse = await axios.get(`${BASE_URL}/chapa-payment/verify/${payment.txRef}`);
      
      if (verifyResponse.data.success) {
        const verification = verifyResponse.data.data;
        console.log('✅ Payment verification response:');
        console.log(`   Status: ${verification.status}`);
        console.log(`   Demo: ${verification.demo ? 'Yes' : 'No'}`);
        
        if (verification.status === 'completed') {
          console.log('✅ CORRECT: Demo payment completed successfully');
        }
      }
    }

    // Step 5: Check appointment status after payment
    console.log('\n📋 Step 5: Checking appointment status after payment...');
    
    const updatedAppointment = await axios.get(`${BASE_URL}/appointments/${appointment.id}`);
    
    if (updatedAppointment.data.success) {
      const apt = updatedAppointment.data.data;
      console.log('📊 Updated appointment status:');
      console.log(`   Status: ${apt.status}`);
      console.log(`   Payment Status: ${apt.paymentStatus}`);
      
      if (payment.demo && apt.paymentStatus === 'paid') {
        console.log('✅ CORRECT: Appointment confirmed after demo payment');
      }
    }

    // Summary
    console.log('\n🎯 Direct Chapa Payment Flow Summary:');
    console.log('✅ Benefits of Direct Flow:');
    console.log('   • No payment method selection screens');
    console.log('   • Direct redirect to Chapa gateway');
    console.log('   • Simplified user experience');
    console.log('   • Faster payment process');
    console.log('   • All Ethiopian payment methods available in Chapa');
    
    console.log('\n🚀 User Experience:');
    console.log('   1. Click "Pay Now with Chapa"');
    console.log('   2. Redirect to Chapa payment page');
    console.log('   3. Select payment method in Chapa (Telebirr, CBE, Cards, etc.)');
    console.log('   4. Complete payment');
    console.log('   5. Return to appointment confirmation');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure server is running on port 3005');
    console.log('2. Check Chapa integration configuration');
    console.log('3. Verify database connection');
  }
}

// Run the test
testDirectChapaPayment();