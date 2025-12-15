#!/usr/bin/env node

/**
 * 🎥 DIRECT VIDEO CALL TEST
 * Test video call creation directly with our API
 */

const axios = require('axios');

async function testVideoCallDirect() {
  console.log('🎥 Testing Video Call Creation Directly...\n');

  try {
    console.log('1️⃣ Creating video call...');
    
    const response = await axios.post('http://localhost:3005/api/video-calls/initiate', {
      initiatorWallet: '0x1765645107928ugnsg',
      receiverWallet: '0x1765645107820qldzw',
      scheduledTime: new Date().toISOString(),
      durationMinutes: 30
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      const callData = response.data.data;
      console.log('\n✅ Video call created successfully!');
      console.log(`   Call ID: ${callData.id}`);
      console.log(`   Status: ${callData.status}`);
      console.log(`   Room ID: ${callData.roomId}`);
      
      if (callData.metadata?.dailyRoom) {
        console.log('\n🎥 Daily.co Room Details:');
        console.log(`   Room Name: ${callData.metadata.dailyRoom.roomName}`);
        console.log(`   Room URL: ${callData.metadata.dailyRoom.roomUrl}`);
        console.log(`   Expires At: ${callData.metadata.dailyRoom.expiresAt}`);
        
        if (callData.dailyTokens) {
          console.log('\n🎫 Daily.co Tokens:');
          console.log(`   Doctor Token: ${callData.dailyTokens.initiatorToken ? 'Generated' : 'Missing'}`);
          console.log(`   Patient Token: ${callData.dailyTokens.receiverToken ? 'Generated' : 'Missing'}`);
        }
        
        console.log('\n🎯 SUCCESS: Daily.co integration is working!');
      } else {
        console.log('\n❌ No Daily.co room created');
        console.log('   Metadata:', JSON.stringify(callData.metadata, null, 2));
      }

      // Test getting Daily.co token
      console.log('\n2️⃣ Testing Daily.co token generation...');
      
      try {
        const tokenResponse = await axios.get(`http://localhost:3005/api/video-calls/${callData.id}/daily-token`, {
          params: { userWallet: '0x1765645107928ugnsg' }
        });

        if (tokenResponse.data.success) {
          console.log('✅ Daily.co token generated successfully!');
          console.log(`   Token: ${tokenResponse.data.data.token.substring(0, 20)}...`);
          console.log(`   Join URL: ${tokenResponse.data.data.joinUrl.substring(0, 50)}...`);
        }
      } catch (tokenError) {
        console.log('❌ Token generation failed:', tokenError.response?.data?.message);
      }

      // Clean up
      console.log('\n3️⃣ Cleaning up...');
      await axios.post(`http://localhost:3005/api/video-calls/${callData.id}/end`, {
        userWallet: '0x1765645107928ugnsg',
        reason: 'test_cleanup'
      });
      console.log('✅ Test call cleaned up');

    } else {
      console.log('❌ Video call creation failed:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testVideoCallDirect();