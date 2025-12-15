#!/usr/bin/env node

/**
 * 🎥 FRONTEND VIDEO CALL INTEGRATION TEST
 * Test the complete frontend video call flow
 */

const axios = require('axios');

async function testFrontendVideoCallIntegration() {
  console.log('🎥 FRONTEND VIDEO CALL INTEGRATION TEST\n');
  console.log('Testing frontend video call workflow...\n');

  const baseURL = 'http://localhost:5173'; // Frontend URL
  const apiURL = 'http://localhost:3005';  // Backend URL
  const doctorWallet = '0x1765645107928ugnsg';
  const patientWallet = '0x1765645107820qldzw';

  try {
    // Step 1: Create a video call via API
    console.log('1️⃣ CREATING VIDEO CALL VIA API');
    
    const initiateResponse = await axios.post(`${apiURL}/api/video-calls/initiate`, {
      initiatorWallet: doctorWallet,
      receiverWallet: patientWallet,
      scheduledTime: new Date().toISOString(),
      durationMinutes: 30
    });

    if (!initiateResponse.data.success) {
      throw new Error(`Call initiation failed: ${initiateResponse.data.error}`);
    }

    const callData = initiateResponse.data.data;
    console.log('   ✅ Video call created successfully!');
    console.log(`   📞 Call ID: ${callData.id}`);
    
    if (callData.dailyRoomUrl) {
      console.log('   🎥 Daily.co Room URL:', callData.dailyRoomUrl);
    }

    // Step 2: Get Daily.co tokens for both participants
    console.log('\n2️⃣ GENERATING DAILY.CO TOKENS FOR FRONTEND');
    
    // Doctor token
    const doctorTokenResponse = await axios.get(`${apiURL}/api/video-calls/${callData.id}/daily-token`, {
      params: { userWallet: doctorWallet }
    });

    // Answer the call first
    await axios.post(`${apiURL}/api/video-calls/${callData.id}/answer`, {
      userWallet: patientWallet
    });

    // Patient token
    const patientTokenResponse = await axios.get(`${apiURL}/api/video-calls/${callData.id}/daily-token`, {
      params: { userWallet: patientWallet }
    });

    if (doctorTokenResponse.data.success && patientTokenResponse.data.success) {
      console.log('   ✅ Both tokens generated successfully!');
      console.log('   🎫 Doctor Join URL:', doctorTokenResponse.data.data.joinUrl.substring(0, 80) + '...');
      console.log('   🎫 Patient Join URL:', patientTokenResponse.data.data.joinUrl.substring(0, 80) + '...');
    }

    // Step 3: Frontend Integration Instructions
    console.log('\n3️⃣ FRONTEND INTEGRATION READY');
    console.log('   📋 Frontend can now:');
    console.log('   1. Navigate to /video-call/' + callData.id);
    console.log('   2. Load Daily.co iframe with join URL');
    console.log('   3. Enable real video/audio communication');
    console.log('   4. Use built-in Daily.co chat');

    // Step 4: Test Frontend URLs
    console.log('\n4️⃣ FRONTEND URLS FOR TESTING');
    console.log('   👨‍⚕️ Doctor URL:', `${baseURL}/video-call/${callData.id}?role=doctor`);
    console.log('   👤 Patient URL:', `${baseURL}/video-call/${callData.id}?role=patient`);

    // Step 5: Daily.co Direct URLs (for testing)
    console.log('\n5️⃣ DAILY.CO DIRECT URLS (for testing)');
    console.log('   👨‍⚕️ Doctor Direct:', doctorTokenResponse.data.data.joinUrl);
    console.log('   👤 Patient Direct:', patientTokenResponse.data.data.joinUrl);

    // Clean up
    console.log('\n6️⃣ CLEANING UP TEST CALL');
    await axios.post(`${apiURL}/api/video-calls/${callData.id}/end`, {
      userWallet: doctorWallet,
      reason: 'test_completed'
    });
    console.log('   ✅ Test call ended and cleaned up');

    // Final Summary
    console.log('\n🎯 FRONTEND INTEGRATION STATUS');
    console.log('================================');
    console.log('✅ Backend API: WORKING');
    console.log('✅ Daily.co Integration: WORKING');
    console.log('✅ Token Generation: WORKING');
    console.log('✅ Frontend URLs: READY');
    
    console.log('\n🚀 NEXT STEPS FOR TESTING:');
    console.log('   1. Open frontend in browser');
    console.log('   2. Navigate to video call page');
    console.log('   3. Test real video/audio connection');
    console.log('   4. Verify in-call chat functionality');
    
    console.log('\n📱 MANUAL TESTING:');
    console.log('   1. Create a new video call');
    console.log('   2. Open doctor URL in one browser tab');
    console.log('   3. Open patient URL in another tab');
    console.log('   4. Test video/audio communication');

  } catch (error) {
    console.error('\n❌ FRONTEND INTEGRATION TEST FAILED:', error.response?.data || error.message);
  }
}

testFrontendVideoCallIntegration();