#!/usr/bin/env node

/**
 * 🎥 TEST DAILY.CO SERVICE DIRECTLY
 * Test the DailyVideoService to see why rooms aren't being created
 */

const axios = require('axios');

async function testDailyServiceDirect() {
  console.log('🎥 Testing Daily.co Service Directly...\n');

  try {
    // Read environment variables
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join('.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const dailyApiKey = envContent.match(/DAILY_API_KEY=(.+)/)?.[1];
    const dailyDomain = envContent.match(/DAILY_DOMAIN=(.+)/)?.[1];
    
    console.log('Daily.co Configuration:');
    console.log(`   API Key: ${dailyApiKey ? dailyApiKey.substring(0, 10) + '...' : 'Missing'}`);
    console.log(`   Domain: ${dailyDomain || 'Missing'}`);

    if (!dailyApiKey || !dailyDomain) {
      console.log('❌ Daily.co not configured properly');
      return;
    }

    // Test room creation directly
    console.log('\n1️⃣ Testing direct room creation...');
    
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

    console.log('✅ Room created successfully!');
    console.log(`   Room Name: ${createResponse.data.name}`);
    console.log(`   Room URL: ${createResponse.data.url}`);
    console.log(`   Room ID: ${createResponse.data.id}`);

    // Test token creation
    console.log('\n2️⃣ Testing token creation...');
    
    const tokenData = {
      properties: {
        room_name: roomName,
        user_name: 'Test Doctor',
        user_id: 'doctor123',
        is_owner: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000)
      }
    };

    const tokenResponse = await axios.post('https://api.daily.co/v1/meeting-tokens', tokenData, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Token created successfully!');
    console.log(`   Token: ${tokenResponse.data.token.substring(0, 20)}...`);
    console.log(`   Join URL: ${createResponse.data.url}?t=${tokenResponse.data.token}`);

    // Test our DailyVideoService
    console.log('\n3️⃣ Testing our DailyVideoService...');
    
    // Test via API since we can't easily import ES modules in CommonJS
    const testResponse = await axios.post('http://localhost:3005/api/video-calls/initiate', {
      initiatorWallet: '0x1765645107928ugnsg',
      receiverWallet: '0x1765645107820qldzw',
      scheduledTime: new Date().toISOString(),
      durationMinutes: 30
    });

    if (testResponse.data.success) {
      console.log('✅ Video call API working!');
      console.log(`   Call ID: ${testResponse.data.data.id}`);
      
      if (testResponse.data.data.metadata?.dailyRoom) {
        console.log('✅ Daily.co room created via API!');
        console.log(`   Room URL: ${testResponse.data.data.metadata.dailyRoom.roomUrl}`);
      } else {
        console.log('❌ Daily.co room NOT created via API');
        console.log('   Checking service configuration...');
        
        // The issue might be in the service configuration check
        console.log('\n🔍 Debugging service configuration...');
        console.log(`   process.env.DAILY_API_KEY exists: ${!!process.env.DAILY_API_KEY}`);
        console.log(`   process.env.DAILY_DOMAIN exists: ${!!process.env.DAILY_DOMAIN}`);
      }
      
      // Clean up
      await axios.post(`http://localhost:3005/api/video-calls/${testResponse.data.data.id}/end`, {
        userWallet: '0x1765645107928ugnsg',
        reason: 'test_cleanup'
      });
    }

    // Clean up direct room
    await axios.delete(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Test room cleaned up');

    console.log('\n📋 DIAGNOSIS:');
    console.log('   ✅ Daily.co API: Working');
    console.log('   ✅ Room Creation: Working');
    console.log('   ✅ Token Generation: Working');
    console.log('   ❓ Service Integration: Needs investigation');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDailyServiceDirect();