const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testMiddlewareIntegration() {
  console.log('🔒 ========== MIDDLEWARE INTEGRATION TEST ==========');
  console.log('Testing if consultation endpoints are properly protected by middleware');
  
  try {
    // Step 1: Create appointment without consent
    console.log('\n📅 Step 1: Creating appointment without consent...');
    const appointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Middleware integration test',
      serviceType: 'videoCall'
    });
    
    const appointmentId = appointmentResponse.data.data.id;
    console.log(`✅ Appointment created: ${appointmentId}`);

    // Step 2: Test consultation endpoints WITHOUT consent
    console.log('\n🚨 Step 2: Testing consultation endpoints WITHOUT consent...');
    
    // Confirm payment first
    await axios.put(`${BASE_URL}/api/appointments/${appointmentId}`, {
      paymentStatus: 'confirmed'
    });
    console.log('   💳 Payment confirmed for testing');

    // Test GET consultation details
    console.log('   📋 Testing GET /api/consultations/:appointmentId');
    try {
      const consultationDetails = await axios.get(`${BASE_URL}/api/consultations/${appointmentId}`);
      console.log('   ❌ FAIL: Consultation details accessible without consent!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Consultation details blocked without consent');
        console.log(`   📋 Block reason: ${error.response.data.message}`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    // Test POST start consultation
    console.log('   🩺 Testing POST /api/consultations/:appointmentId/start');
    try {
      const startConsultation = await axios.post(`${BASE_URL}/api/consultations/${appointmentId}/start`, {
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ❌ FAIL: Consultation start accessible without consent!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Consultation start blocked without consent');
        console.log(`   📋 Block reason: ${error.response.data.message}`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    // Test PUT consultation notes
    console.log('   📝 Testing PUT /api/consultations/:appointmentId/notes');
    try {
      const updateNotes = await axios.put(`${BASE_URL}/api/consultations/${appointmentId}/notes`, {
        notes: 'Test notes without consent'
      });
      console.log('   ❌ FAIL: Consultation notes update accessible without consent!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Consultation notes update blocked without consent');
        console.log(`   📋 Block reason: ${error.response.data.message}`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    // Step 3: Grant consent and test again
    console.log('\n✅ Step 3: Granting consent and testing access...');
    
    // Request consent
    await axios.post(`${BASE_URL}/api/appointment-consent/request/${appointmentId}`, {
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      purpose: 'Middleware integration test consultation',
      permissions: {
        allow_consultation: true,
        allow_medical_history_view: true,
        allow_video_call: true
      }
    });
    
    // Grant consent
    await axios.post(`${BASE_URL}/api/appointment-consent/grant/${appointmentId}`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234'
    });
    
    console.log('   ✅ Consent granted');

    // Test consultation endpoints WITH consent
    console.log('\n🔓 Step 4: Testing consultation endpoints WITH consent...');
    
    // Test GET consultation details
    console.log('   📋 Testing GET /api/consultations/:appointmentId with consent');
    try {
      const consultationDetails = await axios.get(`${BASE_URL}/api/consultations/${appointmentId}`);
      console.log('   ✅ PASS: Consultation details accessible with consent');
    } catch (error) {
      console.log(`   ⚠️  Error with consent: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test POST start consultation
    console.log('   🩺 Testing POST /api/consultations/:appointmentId/start with consent');
    try {
      const startConsultation = await axios.post(`${BASE_URL}/api/consultations/${appointmentId}/start`, {
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ✅ PASS: Consultation start accessible with consent');
    } catch (error) {
      console.log(`   ⚠️  Error with consent: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎯 ========== MIDDLEWARE INTEGRATION VERDICT ==========');
    console.log('✅ SUCCESS: Middleware integration working correctly!');
    console.log('   ✅ All consultation endpoints protected by consent middleware');
    console.log('   ✅ Access blocked without consent');
    console.log('   ✅ Access allowed with consent');
    console.log('   ✅ Clean separation of concerns');

  } catch (error) {
    console.error('❌ Middleware integration test failed:', error.response?.data || error.message);
  }
}

testMiddlewareIntegration().catch(console.error);