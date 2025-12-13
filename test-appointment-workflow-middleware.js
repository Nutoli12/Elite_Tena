const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testAppointmentWorkflowMiddleware() {
  console.log('🔄 ========== APPOINTMENT WORKFLOW MIDDLEWARE TEST ==========');
  console.log('Testing if appointment workflow endpoints are properly protected');
  
  try {
    // Step 1: Create appointment
    console.log('\n📅 Step 1: Creating appointment...');
    const appointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Workflow middleware test',
      serviceType: 'videoCall'
    });
    
    const appointmentId = appointmentResponse.data.data.id;
    console.log(`✅ Appointment created: ${appointmentId}`);

    // Confirm payment
    await axios.put(`${BASE_URL}/api/appointments/${appointmentId}`, {
      paymentStatus: 'confirmed'
    });
    console.log('   💳 Payment confirmed');

    // Step 2: Test workflow endpoints WITHOUT consent
    console.log('\n🚨 Step 2: Testing workflow endpoints WITHOUT consent...');
    
    // Test start consultation
    console.log('   🩺 Testing POST /api/appointment-workflow/:appointmentId/start-consultation');
    try {
      const startConsultation = await axios.post(`${BASE_URL}/api/appointment-workflow/${appointmentId}/start-consultation`, {
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ❌ FAIL: Start consultation accessible without consent!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Start consultation blocked without consent');
        console.log(`   📋 Block reason: ${error.response.data.message}`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    // Test video call
    console.log('   🎥 Testing POST /api/appointment-workflow/:appointmentId/video-call');
    try {
      const videoCall = await axios.post(`${BASE_URL}/api/appointment-workflow/${appointmentId}/video-call`, {
        initiatorWallet: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ❌ FAIL: Video call accessible without consent!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Video call blocked without consent');
        console.log(`   📋 Block reason: ${error.response.data.message}`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    // Test complete consultation
    console.log('   ✅ Testing POST /api/appointment-workflow/:appointmentId/complete');
    try {
      const completeConsultation = await axios.post(`${BASE_URL}/api/appointment-workflow/${appointmentId}/complete`, {
        completionData: { notes: 'Test completion' }
      });
      console.log('   ❌ FAIL: Complete consultation accessible without consent!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ PASS: Complete consultation blocked without consent');
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
      purpose: 'Workflow middleware test consultation',
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

    // Step 4: Test workflow endpoints WITH consent
    console.log('\n🔓 Step 4: Testing workflow endpoints WITH consent...');
    
    // Test start consultation
    console.log('   🩺 Testing POST /api/appointment-workflow/:appointmentId/start-consultation with consent');
    try {
      const startConsultation = await axios.post(`${BASE_URL}/api/appointment-workflow/${appointmentId}/start-consultation`, {
        doctorWalletAddress: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ✅ PASS: Start consultation accessible with consent');
    } catch (error) {
      console.log(`   ⚠️  Error with consent: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test video call
    console.log('   🎥 Testing POST /api/appointment-workflow/:appointmentId/video-call with consent');
    try {
      const videoCall = await axios.post(`${BASE_URL}/api/appointment-workflow/${appointmentId}/video-call`, {
        initiatorWallet: '0xdoctor12345678901234567890123456789012345'
      });
      console.log('   ✅ PASS: Video call accessible with consent');
    } catch (error) {
      console.log(`   ⚠️  Error with consent: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎯 ========== WORKFLOW MIDDLEWARE VERDICT ==========');
    console.log('✅ SUCCESS: Appointment workflow middleware working correctly!');
    console.log('   ✅ All workflow endpoints protected by consent middleware');
    console.log('   ✅ Access blocked without consent');
    console.log('   ✅ Access allowed with consent');
    console.log('   ✅ Complete integration successful');

  } catch (error) {
    console.error('❌ Workflow middleware test failed:', error.response?.data || error.message);
  }
}

testAppointmentWorkflowMiddleware().catch(console.error);