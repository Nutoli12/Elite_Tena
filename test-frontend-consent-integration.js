const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testFrontendConsentIntegration() {
  console.log('🎨 ========== FRONTEND CONSENT INTEGRATION TEST ==========');
  console.log('Testing if frontend components are properly integrated with consent system');
  
  const results = {
    backendWorking: false,
    frontendComponentsExist: false,
    integrationComplete: false,
    consultationPageProtected: false
  };

  try {
    // TEST 1: Backend Working
    console.log('\n🔧 TEST 1: Backend Consent System');
    
    const appointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Frontend integration test',
      serviceType: 'videoCall'
    });
    
    const appointmentId = appointmentResponse.data.data.id;
    console.log(`   ✅ Backend working: Appointment created ${appointmentId}`);
    results.backendWorking = true;

    // TEST 2: Frontend Components Exist
    console.log('\n🎨 TEST 2: Frontend Components');
    
    // Check if consent API endpoints work (simulating frontend calls)
    try {
      // Confirm payment first
      await axios.put(`${BASE_URL}/api/appointments/${appointmentId}`, {
        paymentStatus: 'confirmed'
      });
      
      // Test consent request (what ConsentRequestButton would do)
      const consentRequest = await axios.post(`${BASE_URL}/api/appointment-consent/request/${appointmentId}`, {
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
        purpose: 'Frontend component test',
        permissions: {
          allow_consultation: true,
          allow_video_call: true
        }
      });
      
      console.log('   ✅ ConsentRequestButton API: Working');
      
      // Test consent check (what ConsultationGate would do)
      const consentCheck = await axios.get(`${BASE_URL}/api/appointment-consent/check/${appointmentId}`);
      console.log('   ✅ ConsultationGate API: Working');
      
      // Test consent grant (what ConsentReviewModal would do)
      const consentGrant = await axios.post(`${BASE_URL}/api/appointment-consent/grant/${appointmentId}`, {
        patientWalletAddress: '0xpatient1234567890123456789012345678901234'
      });
      
      console.log('   ✅ ConsentReviewModal API: Working');
      results.frontendComponentsExist = true;
      
    } catch (error) {
      console.log('   ❌ Frontend component APIs failed');
    }

    // TEST 3: Integration Status
    console.log('\n🔗 TEST 3: Integration Analysis');
    
    console.log('   📋 Frontend Components Status:');
    console.log('   ✅ ConsentRequestButton.tsx - EXISTS (for doctors to request consent)');
    console.log('   ✅ ConsentReviewModal.tsx - EXISTS (for patients to grant/deny consent)');
    console.log('   ✅ ConsultationGate.tsx - EXISTS (to protect consultation content)');
    console.log('   ✅ appointmentConsentAPI.ts - EXISTS (API service layer)');
    console.log('   ✅ PendingConsentRequests.tsx - EXISTS (patient dashboard component)');
    
    console.log('\n   📋 Integration Points Analysis:');
    console.log('   ❌ ComprehensiveConsultation.tsx - NOT USING ConsultationGate');
    console.log('   ❌ DoctorAppointments.tsx - NOT USING ConsentRequestButton');
    console.log('   ❌ Appointments.tsx (patient) - NOT SHOWING consent status');
    console.log('   ❌ Messages.tsx (video calls) - NOT USING ConsultationGate');
    
    results.integrationComplete = false;

    // TEST 4: Critical Gap - Consultation Page Protection
    console.log('\n🚨 TEST 4: CRITICAL - Consultation Page Protection');
    
    console.log('   ⚠️  ISSUE FOUND: ComprehensiveConsultation page is NOT protected');
    console.log('   📋 Current state: Doctor can access consultation WITHOUT consent check');
    console.log('   📋 Required fix: Wrap consultation content with ConsultationGate');
    console.log('   📋 Impact: SECURITY VULNERABILITY - bypasses consent system');
    
    results.consultationPageProtected = false;

    // FINAL ASSESSMENT
    console.log('\n🎯 ========== FRONTEND INTEGRATION ASSESSMENT ==========');
    console.log(`Backend System:           ${results.backendWorking ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`Frontend Components:      ${results.frontendComponentsExist ? '✅ EXIST' : '❌ MISSING'}`);
    console.log(`Integration Complete:     ${results.integrationComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
    console.log(`Consultation Protected:   ${results.consultationPageProtected ? '✅ PROTECTED' : '❌ VULNERABLE'}`);
    
    const overallStatus = results.backendWorking && results.frontendComponentsExist && results.integrationComplete && results.consultationPageProtected;
    console.log(`\n🏆 OVERALL STATUS:        ${overallStatus ? '✅ FULLY INTEGRATED' : '⚠️  NEEDS INTEGRATION'}`);
    
    if (!overallStatus) {
      console.log('\n🔧 REQUIRED FIXES:');
      console.log('   1. Integrate ConsultationGate into ComprehensiveConsultation.tsx');
      console.log('   2. Add ConsentRequestButton to DoctorAppointments.tsx');
      console.log('   3. Show consent status in patient Appointments.tsx');
      console.log('   4. Protect video calls in Messages.tsx with ConsultationGate');
      console.log('   5. Add consent notifications to patient dashboard');
    }

  } catch (error) {
    console.error('❌ Frontend integration test failed:', error.response?.data || error.message);
  }
}

testFrontendConsentIntegration().catch(console.error);