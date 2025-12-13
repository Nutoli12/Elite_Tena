/**
 * Test script for consent-first consultation workflow
 * This script tests the complete consent workflow implementation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test data
const testData = {
  doctorWallet: '0x1234567890123456789012345678901234567890',
  patientWallet: '0x0987654321098765432109876543210987654321',
  appointmentId: null // Will be set after creating appointment
};

async function testConsentWorkflow() {
  console.log('🧪 Testing Consent-First Consultation Workflow');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create a test appointment
    console.log('\n📅 Step 1: Creating test appointment...');
    const appointmentResponse = await axios.post(`${BASE_URL}/appointments`, {
      patientWalletAddress: testData.patientWallet,
      doctorWalletAddress: testData.doctorWallet,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      reason: 'Test consultation for consent workflow',
      fee: 50,
      serviceType: 'videoCall',
      requiresApproval: true
    });

    if (appointmentResponse.data.success) {
      testData.appointmentId = appointmentResponse.data.data.id;
      console.log('✅ Appointment created:', testData.appointmentId);
      console.log('   Workflow State:', appointmentResponse.data.data.workflowState);
    } else {
      throw new Error('Failed to create appointment');
    }

    // Step 2: Check initial consent status
    console.log('\n🔍 Step 2: Checking initial consent status...');
    const consentStatusResponse = await axios.get(`${BASE_URL}/appointments/${testData.appointmentId}/consent-status`);
    
    if (consentStatusResponse.data.success) {
      console.log('✅ Consent status retrieved:');
      console.log('   Workflow State:', consentStatusResponse.data.data.workflowState);
      console.log('   Requires Consent:', consentStatusResponse.data.data.requiresConsent);
      console.log('   Has Consent:', consentStatusResponse.data.data.hasConsent);
    }

    // Step 3: Doctor requests consent
    console.log('\n👨‍⚕️ Step 3: Doctor requesting consent...');
    const requestConsentResponse = await axios.post(`${BASE_URL}/appointments/${testData.appointmentId}/request-consent`, {
      doctorWallet: testData.doctorWallet,
      permissions: {
        canVideoCall: true,
        canChat: true,
        canViewHistory: true,
        canWritePrescriptions: false,
        canOrderTests: false
      },
      purpose: 'Video consultation access for test appointment'
    });

    if (requestConsentResponse.data.success) {
      console.log('✅ Consent request sent successfully');
      console.log('   Consent ID:', requestConsentResponse.data.data.consent.id);
      console.log('   Appointment Workflow State:', requestConsentResponse.data.data.appointment.workflowState);
    }

    // Step 4: Patient grants consent
    console.log('\n👤 Step 4: Patient granting consent...');
    const grantConsentResponse = await axios.post(`${BASE_URL}/appointments/${testData.appointmentId}/grant-consent`, {
      patientWallet: testData.patientWallet,
      consentId: requestConsentResponse.data.data.consent.id,
      permissions: {
        canVideoCall: true,
        canChat: true,
        canViewHistory: true,
        canWritePrescriptions: false,
        canOrderTests: false
      }
    });

    if (grantConsentResponse.data.success) {
      console.log('✅ Consent granted successfully');
      console.log('   Appointment Workflow State:', grantConsentResponse.data.data.appointment.workflowState);
    }

    // Step 5: Check final consent status
    console.log('\n🔍 Step 5: Checking final consent status...');
    const finalConsentStatusResponse = await axios.get(`${BASE_URL}/appointments/${testData.appointmentId}/consent-status`);
    
    if (finalConsentStatusResponse.data.success) {
      console.log('✅ Final consent status:');
      console.log('   Workflow State:', finalConsentStatusResponse.data.data.workflowState);
      console.log('   Has Consent:', finalConsentStatusResponse.data.data.hasConsent);
      if (finalConsentStatusResponse.data.data.consent) {
        console.log('   Consent Status:', finalConsentStatusResponse.data.data.consent.status);
        console.log('   Permissions:', finalConsentStatusResponse.data.data.consent.permissions);
      }
    }

    // Step 6: Start consultation
    console.log('\n🏥 Step 6: Starting consultation...');
    const startConsultationResponse = await axios.post(`${BASE_URL}/appointments/${testData.appointmentId}/start-consultation`, {
      doctorWallet: testData.doctorWallet
    });

    if (startConsultationResponse.data.success) {
      console.log('✅ Consultation started successfully');
      console.log('   Workflow State:', startConsultationResponse.data.data.workflowState);
      console.log('   Available Permissions:', startConsultationResponse.data.data.permissions);
    }

    console.log('\n🎉 Consent-First Consultation Workflow Test PASSED!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    if (error.response?.data) {
      console.error('   Error Details:', error.response.data);
    }
    console.log('=' .repeat(60));
  }
}

// Test consent middleware functionality
async function testConsentMiddleware() {
  console.log('\n🔒 Testing Consent Middleware...');
  
  try {
    // Try to access video call without consent
    console.log('\n📹 Testing video call access without consent...');
    
    // This should fail with consent required error
    const videoCallResponse = await axios.post(`${BASE_URL}/video-calls/initiate`, {
      initiatorWallet: testData.doctorWallet,
      receiverWallet: testData.patientWallet,
      appointmentId: testData.appointmentId
    });

    console.log('Video call response:', videoCallResponse.data);

  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Consent middleware working - video call blocked without consent');
      console.log('   Error:', error.response.data.message);
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

// Run the tests
async function runAllTests() {
  await testConsentWorkflow();
  await testConsentMiddleware();
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/appointments`);
    console.log('✅ Server is running, starting tests...\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    console.log('   Run: npm run dev (in server directory)');
    return false;
  }
}

// Main execution
checkServer().then(serverRunning => {
  if (serverRunning) {
    runAllTests();
  }
});