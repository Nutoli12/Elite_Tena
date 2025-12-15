#!/usr/bin/env node

/**
 * 🔧 DAILY.CO ENVIRONMENT VARIABLES TEST
 * Check if Daily.co environment variables are properly loaded
 */

// Load environment variables from server/.env
require('dotenv').config({ path: './server/.env' });

console.log('🔧 DAILY.CO ENVIRONMENT VARIABLES TEST\n');

console.log('Environment Variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DAILY_API_KEY:', process.env.DAILY_API_KEY ? 
  process.env.DAILY_API_KEY.substring(0, 20) + '...' : 'Missing');
console.log('   DAILY_DOMAIN:', process.env.DAILY_DOMAIN || 'Missing');

console.log('\nDaily.co Configuration Status:');
const hasApiKey = !!process.env.DAILY_API_KEY;
const hasDomain = !!process.env.DAILY_DOMAIN;
const isConfigured = hasApiKey && hasDomain;

console.log('   ✅ API Key:', hasApiKey ? 'Present' : '❌ Missing');
console.log('   ✅ Domain:', hasDomain ? 'Present' : '❌ Missing');
console.log('   🎯 Overall:', isConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED');

if (isConfigured) {
  console.log('\n🎥 Daily.co is properly configured!');
  console.log('   API Key:', process.env.DAILY_API_KEY.substring(0, 30) + '...');
  console.log('   Domain:', process.env.DAILY_DOMAIN);
} else {
  console.log('\n❌ Daily.co configuration missing!');
  console.log('   Please check server/.env file');
}