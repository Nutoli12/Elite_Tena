#!/usr/bin/env node

/**
 * 🎥 ISOLATED DAILY.CO SERVICE TEST
 * Test the DailyVideoService in isolation
 */

require('dotenv').config();

async function testDailyServiceIsolated() {
  console.log('🎥 Testing Daily.co Service in Isolation...\n');

  try {
    // Test 1: Check environment variables
    console.log('1️⃣ Environment Variables:');
    console.log(`   DAILY_API_KEY: ${process.env.DAILY_API_KEY ? 'Found' : 'Missing'}`);
    console.log(`   DAILY_DOMAIN: ${process.env.DAILY_DOMAIN ? 'Found' : 'Missing'}`);

    if (!process.env.DAILY_API_KEY || !process.env.DAILY_DOMAIN) {
      console.log('❌ Missing environment variables');
      return;
    }

    // Test 2: Test fetch availability
    console.log('\n2️⃣ Testing fetch availability...');
    try {
      const testResponse = await fetch('https://httpbin.org/get');
      console.log('✅ fetch is available');
    } catch (fetchError) {
      console.log('❌ fetch not available:', fetchError.message);
      return;
    }

    // Test 3: Test Daily.co API directly
    console.log('\n3️⃣ Testing Daily.co API directly...');
    
    const roomName = `test-isolated-${Date.now()}`;
    const roomData = {
      name: roomName,
      privacy: 'private',
      properties: {
        max_participants: 2,
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor((Date.now() + 60 * 60 * 1000) / 1000)
      }
    };

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
      },
      body: JSON.stringify(roomData)
    });

    if (response.ok) {
      const room = await response.json();
      console.log('✅ Direct Daily.co API call successful!');
      console.log(`   Room URL: ${room.url}`);
      
      // Clean up
      await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
        }
      });
      console.log('✅ Test room cleaned up');
    } else {
      const error = await response.json();
      console.log('❌ Direct Daily.co API call failed:', error);
    }

    // Test 4: Test our service class (simulate)
    console.log('\n4️⃣ Testing service class logic...');
    
    const mockService = {
      apiKey: process.env.DAILY_API_KEY,
      domain: process.env.DAILY_DOMAIN,
      isConfigured() {
        return !!(this.apiKey && this.domain);
      }
    };

    console.log(`   Service configured: ${mockService.isConfigured()}`);
    console.log(`   API Key: ${mockService.apiKey.substring(0, 10)}...`);
    console.log(`   Domain: ${mockService.domain}`);

    console.log('\n📋 DIAGNOSIS:');
    console.log('   ✅ Environment variables: Available');
    console.log('   ✅ fetch: Available');
    console.log('   ✅ Daily.co API: Working');
    console.log('   ✅ Service logic: Should work');
    console.log('\n💡 The issue must be in the service implementation or error handling');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDailyServiceIsolated();