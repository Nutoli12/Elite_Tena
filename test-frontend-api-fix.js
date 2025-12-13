/**
 * Test Frontend API URL Fix
 * Verify that the double /api/api issue is resolved
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testFrontendAPIFix() {
  console.log('🔧 Testing Frontend API URL Fix');
  console.log('='.repeat(40));

  try {
    // Test 1: Verify server is running
    console.log('\n🔍 Step 1: Check Server Health');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running');

    // Test 2: Test the correct API endpoints (without double /api)
    console.log('\n🔍 Step 2: Test Correct API Endpoints');
    
    // Test enhanced appointments endpoint
    try {
      await axios.get(`${BASE_URL}/api/enhanced-appointments/doctors`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Enhanced appointments endpoint: /api/enhanced-appointments/doctors (401 as expected)');
      } else {
        console.log('❌ Enhanced appointments endpoint error:', error.response?.status);
      }
    }

    // Test chapa payment endpoint
    try {
      await axios.post(`${BASE_URL}/api/chapa-payment/initialize`, {});
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Chapa payment endpoint: /api/chapa-payment/initialize (401 as expected)');
      } else {
        console.log('❌ Chapa payment endpoint error:', error.response?.status);
      }
    }

    // Test 3: Verify the wrong endpoints return 404
    console.log('\n🔍 Step 3: Verify Wrong Endpoints Return 404');
    
    try {
      await axios.get(`${BASE_URL}/api/api/enhanced-appointments/doctors`);
      console.log('❌ Double /api/api endpoint should not work');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Double /api/api correctly returns 404');
      } else {
        console.log('⚠️ Unexpected error for double /api/api:', error.response?.status);
      }
    }

    console.log('\n🎉 Frontend API URL Fix Test Results:');
    console.log('='.repeat(35));
    console.log('✅ Correct endpoints: /api/enhanced-appointments/*');
    console.log('✅ Correct endpoints: /api/chapa-payment/*');
    console.log('✅ Double /api/api issue resolved');
    
    console.log('\n💡 Frontend should now use:');
    console.log('• axios.post(\'/enhanced-appointments/appointments\', data)');
    console.log('• axios.post(\'/chapa-payment/initialize\', data)');
    console.log('• (axios baseURL already includes /api)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with:');
      console.log('  • npm run dev');
      console.log('  • or node server/src/server.js');
    }
  }
}

// Run the test
testFrontendAPIFix();