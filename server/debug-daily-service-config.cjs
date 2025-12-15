#!/usr/bin/env node

/**
 * 🔍 DEBUG DAILY.CO SERVICE CONFIGURATION
 * Check why DailyVideoService.isConfigured() returns false
 */

const fs = require('fs');
const path = require('path');

async function debugDailyServiceConfig() {
  console.log('🔍 Debugging Daily.co Service Configuration...\n');

  try {
    // 1. Check .env file
    console.log('1️⃣ Checking .env file...');
    const envPath = path.join('.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const dailyApiKey = envContent.match(/DAILY_API_KEY=(.+)/)?.[1];
    const dailyDomain = envContent.match(/DAILY_DOMAIN=(.+)/)?.[1];
    
    console.log(`   DAILY_API_KEY in .env: ${dailyApiKey ? 'Found' : 'Missing'}`);
    console.log(`   DAILY_DOMAIN in .env: ${dailyDomain ? 'Found' : 'Missing'}`);
    
    if (dailyApiKey) {
      console.log(`   API Key: ${dailyApiKey.substring(0, 10)}...`);
    }
    if (dailyDomain) {
      console.log(`   Domain: ${dailyDomain}`);
    }

    // 2. Check process.env (what the service sees)
    console.log('\n2️⃣ Checking process.env...');
    console.log(`   process.env.DAILY_API_KEY: ${process.env.DAILY_API_KEY ? 'Found' : 'Missing'}`);
    console.log(`   process.env.DAILY_DOMAIN: ${process.env.DAILY_DOMAIN ? 'Found' : 'Missing'}`);
    
    if (process.env.DAILY_API_KEY) {
      console.log(`   API Key: ${process.env.DAILY_API_KEY.substring(0, 10)}...`);
    }
    if (process.env.DAILY_DOMAIN) {
      console.log(`   Domain: ${process.env.DAILY_DOMAIN}`);
    }

    // 3. Load dotenv and check again
    console.log('\n3️⃣ Loading dotenv and checking again...');
    require('dotenv').config();
    
    console.log(`   After dotenv - DAILY_API_KEY: ${process.env.DAILY_API_KEY ? 'Found' : 'Missing'}`);
    console.log(`   After dotenv - DAILY_DOMAIN: ${process.env.DAILY_DOMAIN ? 'Found' : 'Missing'}`);

    // 4. Test the isConfigured logic directly
    console.log('\n4️⃣ Testing isConfigured logic...');
    const apiKey = process.env.DAILY_API_KEY;
    const domain = process.env.DAILY_DOMAIN;
    const isConfigured = !!(apiKey && domain);
    
    console.log(`   API Key exists: ${!!apiKey}`);
    console.log(`   Domain exists: ${!!domain}`);
    console.log(`   isConfigured result: ${isConfigured}`);

    // 5. Test video call initiation to see the actual error
    console.log('\n5️⃣ Testing video call initiation...');
    
    const axios = require('axios');
    try {
      const response = await axios.post('http://localhost:3005/api/video-calls/initiate', {
        initiatorWallet: '0x1765645107928ugnsg',
        receiverWallet: '0x1765645107820qldzw',
        scheduledTime: new Date().toISOString(),
        durationMinutes: 30
      });

      console.log('✅ Video call initiated');
      console.log(`   Call ID: ${response.data.data.id}`);
      console.log(`   Daily Room created: ${!!response.data.data.metadata?.dailyRoom}`);
      
      if (response.data.data.metadata?.dailyRoom) {
        console.log(`   Room URL: ${response.data.data.metadata.dailyRoom.roomUrl}`);
      } else {
        console.log('   No Daily.co room - service not configured or failed');
      }

      // Clean up
      await axios.post(`http://localhost:3005/api/video-calls/${response.data.data.id}/end`, {
        userWallet: '0x1765645107928ugnsg',
        reason: 'debug_cleanup'
      });

    } catch (error) {
      console.log('❌ Video call failed:', error.response?.data?.message || error.message);
    }

    console.log('\n📋 DIAGNOSIS:');
    if (dailyApiKey && dailyDomain && process.env.DAILY_API_KEY && process.env.DAILY_DOMAIN) {
      console.log('   ✅ Configuration: Complete');
      console.log('   🔍 Issue: Likely in DailyVideoService implementation');
    } else if (dailyApiKey && dailyDomain && (!process.env.DAILY_API_KEY || !process.env.DAILY_DOMAIN)) {
      console.log('   ⚠️ Issue: Environment variables not loaded in server process');
      console.log('   💡 Solution: Check dotenv loading in server startup');
    } else {
      console.log('   ❌ Issue: Missing configuration in .env file');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugDailyServiceConfig();