#!/usr/bin/env node

/**
 * 🎥 TEST DAILY.CO ROOM CREATION
 * Test room creation with detailed logging
 */

const axios = require('axios');
require('dotenv').config();

async function testDailyRoomCreation() {
  console.log('🎥 Testing Daily.co Room Creation...\n');

  const dailyApiKey = process.env.DAILY_API_KEY;
  const dailyDomain = process.env.DAILY_DOMAIN;

  console.log('Configuration:');
  console.log(`   API Key: ${dailyApiKey ? dailyApiKey.substring(0, 10) + '...' : 'Missing'}`);
  console.log(`   Domain: ${dailyDomain || 'Missing'}`);

  if (!dailyApiKey || !dailyDomain) {
    console.log('❌ Missing configuration');
    return;
  }

  try {
    // Test 1: Simple room creation (like our working test)
    console.log('\n1️⃣ Testing simple room creation...');
    
    const simpleRoomName = `test-simple-${Date.now()}`;
    const simpleRoomData = {
      name: simpleRoomName,
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

    console.log('Simple room config:', JSON.stringify(simpleRoomData, null, 2));

    const simpleResponse = await axios.post('https://api.daily.co/v1/rooms', simpleRoomData, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Simple room created successfully!');
    console.log(`   Room URL: ${simpleResponse.data.url}`);

    // Test 2: Complex room creation (like our service)
    console.log('\n2️⃣ Testing complex room creation (like our service)...');
    
    const consultationId = 'test-consultation-123';
    const durationMinutes = 30;
    const roomName = `consultation-${consultationId}-${Date.now()}`;
    const expiryTime = new Date(Date.now() + (durationMinutes + 60) * 60 * 1000);

    const complexRoomConfig = {
      name: roomName,
      privacy: 'private',
      properties: {
        max_participants: 2,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: false,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(expiryTime.getTime() / 1000),
        eject_at_room_exp: true,
        enable_knocking: true,
        autojoin: false
      }
    };

    console.log('Complex room config:', JSON.stringify(complexRoomConfig, null, 2));

    const complexResponse = await axios.post('https://api.daily.co/v1/rooms', complexRoomConfig, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Complex room created successfully!');
    console.log(`   Room URL: ${complexResponse.data.url}`);

    // Clean up both rooms
    await axios.delete(`https://api.daily.co/v1/rooms/${simpleRoomName}`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    await axios.delete(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Test rooms cleaned up');

    console.log('\n📋 RESULT: Both room creation methods work!');
    console.log('   The issue must be in our service implementation');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('\nAPI Error Details:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDailyRoomCreation();