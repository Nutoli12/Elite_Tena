#!/usr/bin/env node

/**
 * 🎥 SIMPLE DAILY.CO ROOM TEST
 * Test room creation with the exact same config our service uses
 */

require('dotenv').config();

async function testDailyRoomSimple() {
  console.log('🎥 Testing Daily.co Room Creation (Simple)...\n');

  const dailyApiKey = process.env.DAILY_API_KEY;
  const dailyDomain = process.env.DAILY_DOMAIN;

  if (!dailyApiKey || !dailyDomain) {
    console.log('❌ Missing Daily.co configuration');
    return;
  }

  try {
    // Use the EXACT same configuration as our service
    const consultationId = 'test-123';
    const durationMinutes = 30;
    const shortId = consultationId.split('-')[0];
    const timestamp = Date.now().toString().slice(-6);
    const roomName = `consult-${shortId}-${timestamp}`;
    const expiryTime = new Date(Date.now() + (durationMinutes + 60) * 60 * 1000);

    const roomConfig = {
      name: roomName,
      privacy: 'private',
      properties: {
        max_participants: 2,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: false,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(expiryTime.getTime() / 1000)
      }
    };

    console.log('Room Configuration:');
    console.log(JSON.stringify(roomConfig, null, 2));

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dailyApiKey}`
      },
      body: JSON.stringify(roomConfig)
    });

    console.log(`\nAPI Response Status: ${response.status}`);
    console.log(`API Response Status Text: ${response.statusText}`);

    const responseData = await response.json();
    console.log('\nAPI Response Data:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Room created successfully!');
      console.log(`Room URL: ${responseData.url}`);
      
      // Clean up
      await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${dailyApiKey}`
        }
      });
      console.log('✅ Test room cleaned up');
    } else {
      console.log('\n❌ Room creation failed!');
      console.log('Error details:', responseData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDailyRoomSimple();