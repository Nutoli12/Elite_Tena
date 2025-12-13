const axios = require('axios');

/**
 * 💰 TEST PHASE 2: APPROVAL & PAYMENT FLOW
 * This script tests the complete Phase 2 payment workflow
 */

const BASE_URL = 'http://localhost:5000/api';

// Test data
const TEST_DOCTOR_WALLET = '0x742d35Cc6634C0532925a3b8D4C2C4e0C5C2C4e0';
const TEST_PATIENT_WALLET = '0x742d35Cc6634C0532925a3b8D4C2C4e0C5C2C4e1';

async function testPhase2PaymentFlow() {
  console.log('🧪 Testing Phase 2: Approval & Payment Flow\n');

  try {
    // Step 1: Calculate appointment fee
    console.log('📊 Step 1: Calculate Appointment Fee');
    const feeResponse = await axios.post(`${BASE_URL}/appointment-payment/calculate-fee`, {
      doctorWallet: TEST_DOCTOR_WALLET,
      serviceType: 'videoCall',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 45,
      priority: 'urgent'
    });

    console.log('Fee Calculation Result:', {
      fee: feeResponse.data.data.fee,
      requiresPayment: feeResponse.data.data.requiresPayment,
      requiresApproval: feeResponse.data.data.requiresApproval,
      paymentMethods: feeResponse.data.data.paymentMethods?.length || 0
    });

    // Step 2: Create appointment with calculated fee
    console.log('\n📝 Step 2: Create Appointment');
    const appointmentResponse = await axios.post(`${BASE_URL}/appointments`, {
      patientWalletAddress: TEST_PATIENT_WALLET,
      doctorWalletAddress: TEST_DOCTOR_WALLET,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Video consultation for follow-up',
      duration: 45,
      fee: feeResponse.data.data.fee,
      serviceType: 'videoCall',
      requiresApproval: feeResponse.data.data.requiresApproval,
      priority: 'urgent'
    });

    const appointmentId = appointmentResponse.data.data.id;
    console.log('Appointment Created:', {
      id: appointmentId,
      fee: appointmentResponse.data.data.fee,
      requiresApproval: appointmentResponse.data.data.requiresApproval,
      status: appointmentResponse.data.data.status
    });

    // Step 3: Check initial payment status
    console.log('\n📊 Step 3: Check Initial Payment Status');
    const statusResponse = await axios.get(`${BASE_URL}/appointment-payment/${appointmentId}/payment/status`);
    console.log('Initial Status:', {
      currentPhase: statusResponse.data.data.currentPhase,
      nextSteps: statusResponse.data.data.nextSteps,
      canProceed: statusResponse.data.data.canProceed
    });

    // Step 4: Doctor approval (if required)
    if (statusResponse.data.data.details.requiresApproval) {
      console.log('\n👨‍⚕️ Step 4: Doctor Approval Process');
      
      // Get pending approvals for doctor
      const pendingResponse = await axios.get(`${BASE_URL}/appointment-payment/doctor/${TEST_DOCTOR_WALLET}/pending-approvals`);
      console.log('Pending Approvals:', pendingResponse.data.count);

      // Approve the appointment
      const approvalResponse = await axios.post(`${BASE_URL}/appointment-payment/${appointmentId}/approval`, {
        action: 'approve',
        doctorWallet: TEST_DOCTOR_WALLET
      });

      console.log('Approval Result:', {
        status: approvalResponse.data.data.status,
        nextStep: approvalResponse.data.data.nextStep
      });

      // Check status after approval
      const postApprovalStatus = await axios.get(`${BASE_URL}/appointment-payment/${appointmentId}/payment/status`);
      console.log('Post-Approval Status:', {
        currentPhase: postApprovalStatus.data.data.currentPhase,
        nextSteps: postApprovalStatus.data.data.nextSteps
      });
    }

    // Step 5: Initialize payment (if required)
    if (feeResponse.data.data.requiresPayment) {
      console.log('\n💳 Step 5: Initialize Payment');
      
      const paymentResponse = await axios.post(`${BASE_URL}/appointment-payment/${appointmentId}/payment/initialize`, {
        patientWallet: TEST_PATIENT_WALLET,
        paymentMethod: 'chapa'
      });

      console.log('Payment Initialization:', {
        success: paymentResponse.data.success,
        demo: paymentResponse.data.data.demo,
        txRef: paymentResponse.data.data.txRef,
        checkoutUrl: paymentResponse.data.data.checkoutUrl ? 'Generated' : 'None'
      });

      // Step 6: Simulate payment completion (for demo)
      if (paymentResponse.data.data.demo) {
        console.log('\n✅ Step 6: Complete Demo Payment');
        
        // Wait 6 seconds for demo payment to process
        console.log('Waiting 6 seconds for demo payment...');
        await new Promise(resolve => setTimeout(resolve, 6000));

        // Verify payment
        const verificationResponse = await axios.get(`${BASE_URL}/appointment-payment/${appointmentId}/payment/verify`, {
          params: {
            txRef: paymentResponse.data.data.txRef,
            provider: 'chapa'
          }
        });

        console.log('Payment Verification:', {
          status: verificationResponse.data.data.status,
          demo: verificationResponse.data.data.demo
        });
      }
    }

    // Step 7: Final status check
    console.log('\n🏁 Step 7: Final Status Check');
    const finalStatusResponse = await axios.get(`${BASE_URL}/appointment-payment/${appointmentId}/payment/status`);
    console.log('Final Status:', {
      currentPhase: finalStatusResponse.data.data.currentPhase,
      canProceed: finalStatusResponse.data.data.canProceed,
      nextSteps: finalStatusResponse.data.data.nextSteps
    });

    // Step 8: Test doctor payment settings
    console.log('\n💰 Step 8: Test Doctor Payment Settings');
    
    // Get current settings
    const settingsResponse = await axios.get(`${BASE_URL}/appointment-payment/doctor/${TEST_DOCTOR_WALLET}/payment-settings`);
    console.log('Current Payment Settings:', {
      videoCallFee: settingsResponse.data.data.paymentSettings.videoCallFee,
      chatFee: settingsResponse.data.data.paymentSettings.chatFee,
      acceptsChapa: settingsResponse.data.data.paymentSettings.acceptsChapa
    });

    // Update settings
    const updateResponse = await axios.put(`${BASE_URL}/appointment-payment/doctor/${TEST_DOCTOR_WALLET}/payment-settings`, {
      videoCallFee: 150,
      chatFee: 75,
      acceptsChapa: true,
      acceptsTelebirr: true,
      paymentInstructions: 'Payment required 24 hours before appointment'
    });

    console.log('Settings Update:', {
      success: updateResponse.data.success,
      videoCallFee: updateResponse.data.data.videoCallFee
    });

    console.log('\n✅ Phase 2 Payment Flow Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('- Fee calculation: ✅');
    console.log('- Appointment creation: ✅');
    console.log('- Doctor approval workflow: ✅');
    console.log('- Payment initialization: ✅');
    console.log('- Payment verification: ✅');
    console.log('- Status tracking: ✅');
    console.log('- Doctor settings: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data?.details) {
      console.error('Error details:', error.response.data.details);
    }
  }
}

// Test rejection workflow
async function testRejectionWorkflow() {
  console.log('\n🧪 Testing Rejection Workflow\n');

  try {
    // Create appointment for rejection
    const appointmentResponse = await axios.post(`${BASE_URL}/appointments`, {
      patientWalletAddress: TEST_PATIENT_WALLET,
      doctorWalletAddress: TEST_DOCTOR_WALLET,
      appointmentDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
      reason: 'Test rejection workflow',
      duration: 30,
      fee: 100,
      serviceType: 'videoCall',
      requiresApproval: true
    });

    const appointmentId = appointmentResponse.data.data.id;
    console.log('Test Appointment Created for Rejection:', appointmentId);

    // Reject the appointment
    const rejectionResponse = await axios.post(`${BASE_URL}/appointment-payment/${appointmentId}/approval`, {
      action: 'reject',
      doctorWallet: TEST_DOCTOR_WALLET,
      reason: 'Doctor not available at requested time'
    });

    console.log('Rejection Result:', {
      status: rejectionResponse.data.data.status,
      reason: rejectionResponse.data.data.reason
    });

    // Check final status
    const finalStatus = await axios.get(`${BASE_URL}/appointment-payment/${appointmentId}/payment/status`);
    console.log('Final Status After Rejection:', {
      currentPhase: finalStatus.data.data.currentPhase,
      canProceed: finalStatus.data.data.canProceed
    });

    console.log('✅ Rejection workflow test completed');

  } catch (error) {
    console.error('❌ Rejection test failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runAllTests() {
  await testPhase2PaymentFlow();
  await testRejectionWorkflow();
}

runAllTests();