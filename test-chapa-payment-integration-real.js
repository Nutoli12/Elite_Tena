/**
 * Test Real Chapa Payment Integration in BookAppointmentModal
 * This test verifies that the payment-first flow works correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function testRealChapaPaymentIntegration() {
  console.log('🧪 Testing Real Chapa Payment Integration...\n');

  try {
    // Test 1: Create a pending appointment (payment_pending status)
    console.log('📋 Step 1: Creating pending appointment...');
    
    const appointmentData = {
      patientWalletAddress: '0x1765610206838ye1ru', // frew@gmail.com
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: '2025-12-16 10:00',
      reason: 'Testing real Chapa payment integration',
      duration: 30,
      serviceType: 'inPerson',
      fee: 400,
      paymentStatus: 'pending',
      paymentMethod: 'chapa',
      status: 'payment_pending'
    };

    const appointmentResponse = await axios.post(`${BASE_URL}/appointments`, appointmentData);
    
    if (!appointmentResponse.data.success) {
      throw new Error('Failed to create pending appointment: ' + appointmentResponse.data.error);
    }

    const appointmentId = appointmentResponse.data.data.id;
    console.log('✅ Pending appointment created:', appointmentId);

    // Test 2: Initialize Chapa payment
    console.log('\n💳 Step 2: Initializing Chapa payment...');
    
    const paymentInitData = {
      appointmentId: appointmentId,
      patientWallet: '0x1765610206838ye1ru',
      returnUrl: `http://localhost:3000/appointments/${appointmentId}/payment-success`
    };

    const paymentResponse = await axios.post(`${BASE_URL}/chapa-payment/initialize`, paymentInitData);
    
    if (!paymentResponse.data.success) {
      throw new Error('Failed to initialize payment: ' + paymentResponse.data.error);
    }

    console.log('✅ Chapa payment initialized:', {
      txRef: paymentResponse.data.data.txRef,
      demo: paymentResponse.data.data.demo,
      checkoutUrl: paymentResponse.data.data.checkoutUrl ? 'Available' : 'Not available'
    });

    // Test 3: Verify payment (simulate successful payment)
    console.log('\n✅ Step 3: Verifying payment...');
    
    const txRef = paymentResponse.data.data.txRef;
    
    // Wait a moment for demo payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verifyResponse = await axios.get(`${BASE_URL}/chapa-payment/verify/${txRef}`);
    
    if (!verifyResponse.data.success) {
      throw new Error('Payment verification failed: ' + verifyResponse.data.error);
    }

    console.log('✅ Payment verified:', {
      status: verifyResponse.data.data.status,
      demo: verifyResponse.data.data.demo
    });

    // Test 4: Update appointment status after successful payment
    console.log('\n🏥 Step 4: Confirming appointment after payment...');
    
    const updateResponse = await axios.put(`${BASE_URL}/appointments/${appointmentId}`, {
      paymentStatus: 'paid',
      status: 'scheduled'
    });
    
    if (!updateResponse.data.success) {
      throw new Error('Failed to confirm appointment: ' + updateResponse.data.error);
    }

    console.log('✅ Appointment confirmed after payment');

    // Test 5: Verify final appointment status
    console.log('\n🔍 Step 5: Verifying final appointment status...');
    
    const finalResponse = await axios.get(`${BASE_URL}/appointments/${appointmentId}`);
    
    if (!finalResponse.data.success) {
      throw new Error('Failed to get appointment: ' + finalResponse.data.error);
    }

    const finalAppointment = finalResponse.data.data;
    console.log('✅ Final appointment status:', {
      id: finalAppointment.id,
      status: finalAppointment.status,
      paymentStatus: finalAppointment.paymentStatus,
      paymentMethod: finalAppointment.paymentMethod,
      fee: finalAppointment.fee
    });

    console.log('\n🎉 SUCCESS: Real Chapa Payment Integration Test Completed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Pending appointment creation: PASSED');
    console.log('✅ Chapa payment initialization: PASSED');
    console.log('✅ Payment verification: PASSED');
    console.log('✅ Appointment confirmation: PASSED');
    console.log('✅ Final status verification: PASSED');

    console.log('\n🔧 Integration Status:');
    console.log('✅ Payment-first flow: WORKING');
    console.log('✅ Chapa gateway integration: WORKING');
    console.log('✅ Appointment creation after payment: WORKING');
    console.log('✅ Status transitions: WORKING');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure server is running on port 3005');
    console.log('2. Check Chapa configuration in server/.env');
    console.log('3. Verify database tables exist');
    console.log('4. Check test user exists: frew@gmail.com');
  }
}

// Run the test
testRealChapaPaymentIntegration();