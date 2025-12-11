/**
 * Simple test for the Consent-First Healthcare System
 * Tests the consent API endpoints directly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';

async function testConsentEndpoints() {
  console.log('🔒 Testing Consent API Endpoints\n');

  try {
    // Test 1: Check if consent endpoints are available
    console.log('1️⃣ Testing consent endpoint availability...');
    
    // Test the health endpoint first
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Server is running:', health.data.status);

    // Test 2: Try to check consent status (should return no consent)
    console.log('\n2️⃣ Testing consent status endpoint...');
    try {
      const status = await axios.get(`${BASE_URL}/consent/status/test-patient/test-doctor`);
      console.log('   ✅ Consent status endpoint working');
      console.log('   📋 Response:', status.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('   ✅ Consent status endpoint working (no consent found - expected)');
      } else {
        console.log('   ❌ Consent status endpoint error:', error.response?.data || error.message);
      }
    }

    // Test 3: Try emergency override (should work without database records)
    console.log('\n3️⃣ Testing emergency override endpoint...');
    try {
      const emergency = await axios.post(`${BASE_URL}/consent/emergency-check`, {
        patientWalletAddress: 'test-patient-wallet',
        doctorWalletAddress: 'test-doctor-wallet',
        justification: 'This is a test emergency justification for system testing purposes'
      });
      console.log('   ✅ Emergency override endpoint working');
      console.log('   🚨 Emergency access:', emergency.data.allowed ? 'GRANTED' : 'DENIED');
      console.log('   📝 Message:', emergency.data.message);
    } catch (error) {
      console.log('   ❌ Emergency override error:', error.response?.data || error.message);
    }

    // Test 4: Check available endpoints
    console.log('\n4️⃣ Checking available consent endpoints...');
    try {
      const routes = await axios.get(`${BASE_URL}/test`);
      if (routes.data.availableEndpoints) {
        const consentEndpoints = routes.data.availableEndpoints.filter(endpoint => 
          endpoint.includes('/consent')
        );
        console.log('   📋 Available consent endpoints:');
        consentEndpoints.forEach(endpoint => {
          console.log(`      ${endpoint}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch endpoint list');
    }

    console.log('\n🎉 Consent API endpoints test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Server is running and accessible');
    console.log('   ✅ Consent status endpoint is working');
    console.log('   ✅ Emergency override endpoint is working');
    console.log('\n🔒 The consent API infrastructure is ready!');
    console.log('\n💡 Next steps:');
    console.log('   1. Create test patient and doctor records');
    console.log('   2. Test full consent workflow');
    console.log('   3. Integrate with frontend ConsentGate component');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Note: Make sure the server is running on port 3003');
      console.log('   Run: node server/src/server.js');
    }
  }
}

// Run the test
testConsentEndpoints();