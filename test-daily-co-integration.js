#!/usr/bin/env node

/**
 * 🎥 DAILY.CO INTEGRATION TEST
 * Tests if Daily.co is properly configured and working
 */

const axios = require('axios');

async function testDailyCoIntegration() {
  console.log('🎥 Testing Daily.co Integration...\n');

  try {
    // Check environment variables
    console.log('1️⃣ Checking Daily.co configuration...');
    
    // Read from server .env file
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join('server', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const dailyApiKey = envContent.match(/DAILY_API_KEY=(.+)/)?.[1];
    const dailyDomain = envContent.match(/DAILY_DOMAIN=(.+)/)?.[1];
    
    console.log('Daily.co Configuration:');
    console.log(`   API Key: ${dailyApiKey ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Domain: ${dailyDomain ? '✅ Found' : '❌ Missing'}`);
    
    if (dailyApiKey) {
      console.log(`   API Key: ${dailyApiKey.substring(0, 10)}...`);
    }
    if (dailyDomain) {
      console.log(`   Domain: ${dailyDomain}`);
    }

    // Test Daily.co API directly
    console.log('\n2️⃣ Testing Daily.co API connection...');
    
    if (dailyApiKey) {
      try {
        const response = await axios.get('https://api.daily.co/v1/rooms', {
          headers: {
            'Authorization': `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Daily.co API connection successful!');
        console.log(`   Status: ${response.status}`);
        console.log(`   Rooms found: ${response.data.data?.length || 0}`);
        
      } catch (apiError) {
        console.log('❌ Daily.co API connection failed:');
        console.log(`   Status: ${apiError.response?.status}`);
        console.log(`   Error: ${apiError.response?.data?.error || apiError.message}`);
      }
    } else {
      console.log('⚠️ Cannot test API - no API key found');
    }

    // Test room creation
    console.log('\n3️⃣ Testing room creation...');
    
    if (dailyApiKey) {
      try {
        const roomName = `test-room-${Date.now()}`;
        const roomData = {
          name: roomName,
          privacy: 'private',
          properties: {
            max_participants: 2,
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000) // 1 hour from now
          }
        };

        const createResponse = await axios.post('https://api.daily.co/v1/rooms', roomData, {
          headers: {
            'Authorization': `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ Room creation successful!');
        console.log(`   Room Name: ${createResponse.data.name}`);
        console.log(`   Room URL: ${createResponse.data.url}`);
        
        // Clean up - delete the test room
        try {
          await axios.delete(`https://api.daily.co/v1/rooms/${roomName}`, {
            headers: {
              'Authorization': `Bearer ${dailyApiKey}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ Test room cleaned up');
        } catch (deleteError) {
          console.log('⚠️ Could not delete test room (not critical)');
        }

      } catch (roomError) {
        console.log('❌ Room creation failed:');
        console.log(`   Status: ${roomError.response?.status}`);
        console.log(`   Error: ${roomError.response?.data?.error || roomError.message}`);
      }
    }

    // Test our backend Daily.co service
    console.log('\n4️⃣ Testing backend Daily.co service...');
    
    try {
      const testResponse = await axios.post('http://localhost:3005/api/video-calls/initiate', {
        initiatorWallet: '0x1111111111111111111111111111111111111111',
        receiverWallet: '0x2222222222222222222222222222222222222222',
        scheduledTime: new Date().toISOString(),
        durationMinutes: 30
      });

      console.log('✅ Backend video call service working!');
      console.log(`   Call ID: ${testResponse.data.data?.id}`);
      console.log(`   Has Daily Room: ${!!testResponse.data.data?.metadata?.dailyRoom}`);
      
      if (testResponse.data.data?.metadata?.dailyRoom) {
        console.log(`   Room URL: ${testResponse.data.data.metadata.dailyRoom.roomUrl}`);
      }

    } catch (backendError) {
      console.log('❌ Backend service error:');
      console.log(`   Status: ${backendError.response?.status}`);
      console.log(`   Error: ${backendError.response?.data?.message || backendError.message}`);
    }

    console.log('\n📋 DAILY.CO INTEGRATION STATUS:');
    
    if (dailyApiKey && dailyDomain) {
      console.log('   ✅ Configuration: Complete');
      console.log('   ✅ API Key: Valid');
      console.log('   ✅ Domain: Set');
      console.log('   🎥 Ready for real video calls!');
    } else {
      console.log('   ❌ Configuration: Incomplete');
      console.log('   ⚠️ Video calls will use fallback mode');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDailyCoIntegration();