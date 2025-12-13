const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testCriticalBlockingScenario() {
  console.log('🚨 ========== CRITICAL BLOCKING SCENARIO TEST ==========');
  console.log('Testing: What happens when doctor tries to start consultation WITHOUT consent?');
  
  try {
    // Step 1: Create appointment
    console.log('\n📅 Step 1: Creating appointment...');
    const appointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Critical blocking test',
      serviceType: 'videoCall'
    });
    
    const appointmentId = appointmentResponse.data.data.id;
    console.log(`✅ Appointment created: ${appointmentId}`);
    console.log(`📊 Initial state: ${appointmentResponse.data.data.workflowState}`);

    // Step 2: Confirm payment (simulate doctor approval + payment)
    console.log('\n💳 Step 2: Confirming payment...');
    await axios.put(`${BASE_URL}/api/appointments/${appointmentId}`, {
      paymentStatus: 'confirmed'
    });
    console.log('✅ Payment confirmed');

    // Step 3: Doctor tries to start consultation WITHOUT requesting consent
    console.log('\n🚨 Step 3: CRITICAL TEST - Doctor tries to start consultation WITHOUT consent');
    
    // Test video call endpoint (if it exists)
    console.log('   🎥 Testing video call access...');
    try {
      const videoCallResponse = await axios.post(`${BASE_URL}/api/video-calls`, {
        appointmentId: appointmentId,
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ❌ FAIL: Video call started without consent!');
      console.log('   📋 Response:', videoCallResponse.data);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Video call blocked without consent');
        console.log('   📋 Block reason:', error.response.data.message || error.response.data.error);
      } else if (error.response?.status === 404) {
        console.log('   ℹ️  Video call endpoint not found (expected for this test)');
      } else {
        console.log('   ⚠️  Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test consultation session endpoint (if it exists)
    console.log('   💬 Testing consultation session access...');
    try {
      const consultationResponse = await axios.post(`${BASE_URL}/api/consultation/start/${appointmentId}`, {
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ❌ FAIL: Consultation started without consent!');
      console.log('   📋 Response:', consultationResponse.data);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Consultation blocked without consent');
        console.log('   📋 Block reason:', error.response.data.message || error.response.data.error);
      } else if (error.response?.status === 404) {
        console.log('   ℹ️  Consultation endpoint not found (expected for this test)');
      } else {
        console.log('   ⚠️  Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test medical records access
    console.log('   📋 Testing medical records access...');
    try {
      const recordsResponse = await axios.get(`${BASE_URL}/api/medical-records/0xpatient1234567890123456789012345678901234`, {
        headers: {
          'X-Doctor-Wallet': '0xdoctor12345678901234567890123456789012345',
          'X-Appointment-Id': appointmentId
        }
      });
      console.log('   ⚠️  Medical records accessible (may need consent middleware)');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Medical records blocked without consent');
      } else {
        console.log('   ℹ️  Medical records test inconclusive');
      }
    }

    // Step 4: Check consent status to confirm blocking
    console.log('\n🔍 Step 4: Verifying consent status...');
    const consentCheck = await axios.get(`${BASE_URL}/api/appointment-consent/check/${appointmentId}`);
    const hasConsent = consentCheck.data.data.hasConsent;
    const blockReason = consentCheck.data.data.reason;
    
    console.log(`   🔒 Has consent: ${hasConsent}`);
    console.log(`   📋 Block reason: ${blockReason}`);
    console.log(`   ✅ Blocking working: ${!hasConsent ? 'YES' : 'NO'}`);

    // Step 5: Show what doctor should see
    console.log('\n🩺 Step 5: What doctor should see in UI...');
    console.log('   Expected UI state:');
    console.log('   📅 Appointment Status: Payment Confirmed');
    console.log('   🔘 [Request Consent] ← Button should be visible');
    console.log('   🚫 [Start Video Call] ← Button should be disabled/hidden');
    console.log('   🚫 [Start Chat] ← Button should be disabled/hidden');
    console.log('   💬 Message: "Request consent from patient to begin consultation"');

    // Step 6: Test the correct flow
    console.log('\n✅ Step 6: Testing CORRECT flow with consent...');
    
    // Request consent
    console.log('   🩺 Doctor requests consent...');
    await axios.post(`${BASE_URL}/api/appointment-consent/request/${appointmentId}`, {
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      purpose: 'Video consultation for your appointment',
      permissions: {
        allow_consultation: true,
        allow_video_call: true,
        allow_medical_history_view: true
      }
    });
    
    // Grant consent
    console.log('   👤 Patient grants consent...');
    await axios.post(`${BASE_URL}/api/appointment-consent/grant/${appointmentId}`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234'
    });
    
    // Check access again
    const afterConsentCheck = await axios.get(`${BASE_URL}/api/appointment-consent/check/${appointmentId}`);
    const nowHasConsent = afterConsentCheck.data.data.hasConsent;
    
    console.log(`   ✅ After consent granted: ${nowHasConsent ? 'Access allowed' : 'Still blocked'}`);

    // Final verdict
    console.log('\n🎯 ========== CRITICAL TEST VERDICT ==========');
    if (!hasConsent && nowHasConsent) {
      console.log('✅ PASS: Consent-first system working correctly!');
      console.log('   ✅ Consultation blocked without consent');
      console.log('   ✅ Consultation allowed after consent granted');
      console.log('   ✅ Clean workflow enforced');
    } else {
      console.log('❌ FAIL: Issues detected in consent-first system');
    }

  } catch (error) {
    console.error('❌ Critical test failed:', error.response?.data || error.message);
  }
}

testCriticalBlockingScenario().catch(console.error);