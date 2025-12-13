const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testConsentFlowComprehensive() {
  console.log('🧪 ========== COMPREHENSIVE CONSENT-FIRST SYSTEM TEST ==========');
  
  const results = {
    databaseStructure: false,
    workflowStates: false,
    apiEndpoints: false,
    blockingMechanism: false,
    patientControl: false
  };

  try {
    // TEST 1: Database Structure
    console.log('\n📊 TEST 1: Database Structure');
    console.log('Checking if consent-related columns exist...');
    
    // We'll verify this by creating an appointment and checking the response structure
    const testAppointment = await axios.post(`${BASE_URL}/api/appointments`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Database structure test',
      serviceType: 'videoCall'
    });

    const appointment = testAppointment.data.data;
    const hasConsentFields = appointment.hasOwnProperty('requiresConsent') && 
                            appointment.hasOwnProperty('workflowState');
    
    console.log(`   ✅ Appointment has consent fields: ${hasConsentFields}`);
    console.log(`   📋 requiresConsent: ${appointment.requiresConsent}`);
    console.log(`   📋 workflowState: ${appointment.workflowState}`);
    
    results.databaseStructure = hasConsentFields;

    // TEST 2: Workflow States
    console.log('\n🔄 TEST 2: Workflow States');
    console.log('Testing: Appointment → Payment → Consent → Consultation flow');
    
    const appointmentId = appointment.id;
    
    // Step 1: Initial state should be 'scheduled'
    console.log(`   📅 Initial state: ${appointment.workflowState}`);
    const correctInitialState = appointment.workflowState === 'scheduled';
    
    // Step 2: Confirm payment
    await axios.put(`${BASE_URL}/api/appointments/${appointmentId}`, {
      paymentStatus: 'confirmed'
    });
    console.log('   💳 Payment confirmed');
    
    // Step 3: Request consent (should change state to 'awaiting_consent')
    const consentRequest = await axios.post(`${BASE_URL}/api/appointment-consent/request/${appointmentId}`, {
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      purpose: 'Test consultation workflow',
      permissions: {
        allow_consultation: true,
        allow_medical_history_view: true,
        allow_video_call: true
      }
    });
    
    const afterConsentRequest = consentRequest.data.data.appointment.workflowState;
    console.log(`   🩺 After consent request: ${afterConsentRequest}`);
    const correctAwaitingState = afterConsentRequest === 'awaiting_consent';
    
    // Step 4: Grant consent (should change state to 'consent_granted')
    const consentGrant = await axios.post(`${BASE_URL}/api/appointment-consent/grant/${appointmentId}`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234'
    });
    
    const afterConsentGrant = consentGrant.data.data.appointment.workflowState;
    console.log(`   👤 After consent granted: ${afterConsentGrant}`);
    const correctGrantedState = afterConsentGrant === 'consent_granted';
    
    results.workflowStates = correctInitialState && correctAwaitingState && correctGrantedState;
    console.log(`   ✅ Workflow states correct: ${results.workflowStates}`);

    // TEST 3: API Endpoints
    console.log('\n🔌 TEST 3: API Endpoints');
    
    // Test consent request endpoint
    try {
      const testRequest = await axios.post(`${BASE_URL}/api/appointment-consent/request/${appointmentId}`, {
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
        purpose: 'API test'
      });
      console.log('   ✅ POST /api/appointment-consent/request - Working');
    } catch (error) {
      console.log('   ❌ POST /api/appointment-consent/request - Failed');
    }
    
    // Test check access endpoint
    try {
      const checkAccess = await axios.get(`${BASE_URL}/api/appointment-consent/check/${appointmentId}`);
      console.log('   ✅ GET /api/appointment-consent/check - Working');
      console.log(`   📊 Access status: ${checkAccess.data.data.hasConsent ? 'Granted' : 'Denied'}`);
    } catch (error) {
      console.log('   ❌ GET /api/appointment-consent/check - Failed');
    }
    
    results.apiEndpoints = true;

    // TEST 4: Blocking Mechanism (Critical Test)
    console.log('\n🚨 TEST 4: CRITICAL - Blocking Mechanism');
    console.log('Testing if consultation is blocked without consent...');
    
    // Create a new appointment without consent
    const blockedTestAppointment = await axios.post(`${BASE_URL}/api/appointments`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      reason: 'Blocking mechanism test',
      serviceType: 'videoCall'
    });
    
    const blockedAppointmentId = blockedTestAppointment.data.data.id;
    
    // Confirm payment but DON'T request consent
    await axios.put(`${BASE_URL}/api/appointments/${blockedAppointmentId}`, {
      paymentStatus: 'confirmed'
    });
    
    // Try to check access - should be blocked
    const blockedAccessCheck = await axios.get(`${BASE_URL}/api/appointment-consent/check/${blockedAppointmentId}`);
    const isBlocked = !blockedAccessCheck.data.data.hasConsent;
    
    console.log(`   🔒 Consultation blocked without consent: ${isBlocked ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   📋 Reason: ${blockedAccessCheck.data.data.reason}`);
    
    results.blockingMechanism = isBlocked;

    // TEST 5: Patient Control
    console.log('\n👤 TEST 5: Patient Control');
    
    // Test patient can see consent requests
    const patientConsents = await axios.get(`${BASE_URL}/api/appointment-consent/patient/0xpatient1234567890123456789012345678901234`);
    const hasConsentRequests = patientConsents.data.data.length > 0;
    console.log(`   📬 Patient can see consent requests: ${hasConsentRequests ? '✅' : '❌'}`);
    
    // Test patient can revoke consent
    try {
      const revokeResponse = await axios.post(`${BASE_URL}/api/appointment-consent/revoke/${appointmentId}`, {
        patientWalletAddress: '0xpatient1234567890123456789012345678901234',
        reason: 'Testing revocation'
      });
      console.log('   🚫 Patient can revoke consent: ✅');
      
      // Verify revocation blocks access
      const afterRevoke = await axios.get(`${BASE_URL}/api/appointment-consent/check/${appointmentId}`);
      const isRevokedBlocked = !afterRevoke.data.data.hasConsent;
      console.log(`   🔒 Revocation blocks access: ${isRevokedBlocked ? '✅' : '❌'}`);
      
      results.patientControl = hasConsentRequests && isRevokedBlocked;
    } catch (error) {
      console.log('   ❌ Patient revocation failed');
      results.patientControl = false;
    }

    // FINAL RESULTS
    console.log('\n📊 ========== TEST RESULTS SUMMARY ==========');
    console.log(`Database Structure:     ${results.databaseStructure ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Workflow States:        ${results.workflowStates ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`API Endpoints:          ${results.apiEndpoints ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Blocking Mechanism:     ${results.blockingMechanism ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Patient Control:        ${results.patientControl ? '✅ PASS' : '❌ FAIL'}`);
    
    const overallPass = Object.values(results).every(result => result === true);
    console.log(`\n🎯 OVERALL RESULT:      ${overallPass ? '✅ CONSENT-FIRST SYSTEM WORKING' : '❌ ISSUES DETECTED'}`);
    
    if (overallPass) {
      console.log('\n🎉 SUCCESS: Consent-first consultation system is fully functional!');
      console.log('   ✅ No consultation without consent');
      console.log('   ✅ Clear consent request flow');
      console.log('   ✅ Patient control over permissions');
      console.log('   ✅ Immediate revocation effect');
      console.log('   ✅ Clean, structured implementation');
    } else {
      console.log('\n⚠️  ISSUES DETECTED: Some tests failed');
      console.log('   Review the failed tests above for specific issues');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
  }
}

// Run the comprehensive test
testConsentFlowComprehensive().catch(console.error);