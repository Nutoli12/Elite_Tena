/**
 * Test MetaMask Authentication Endpoints
 * Run: node test-metamask-auth.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3003/api';
const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

console.log('🧪 Testing MetaMask Authentication Endpoints\n');
console.log('=' .repeat(60));

async function testEndpoints() {
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Get Nonce
  console.log('\n📝 Test 1: GET /api/auth/wallet/nonce/:address');
  try {
    const response = await axios.get(`${API_URL}/auth/wallet/nonce/${TEST_WALLET}`);
    if (response.data.success && response.data.data.message) {
      console.log('✅ PASS - Nonce endpoint working');
      console.log('   Message:', response.data.data.message.substring(0, 50) + '...');
      testsPassed++;
    } else {
      console.log('❌ FAIL - Invalid response format');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
    testsFailed++;
  }

  // Test 2: Auth Routes Info
  console.log('\n📝 Test 2: GET /api/auth (Info endpoint)');
  try {
    const response = await axios.get(`${API_URL}/auth`);
    if (response.data.success && response.data.endpoints) {
      console.log('✅ PASS - Auth info endpoint working');
      console.log('   Available endpoints:', response.data.endpoints.length);
      testsPassed++;
    } else {
      console.log('❌ FAIL - Invalid response format');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
    testsFailed++;
  }

  // Test 3: Login Endpoint Exists (should fail without credentials)
  console.log('\n📝 Test 3: POST /api/auth/login (Endpoint exists)');
  try {
    await axios.post(`${API_URL}/auth/login`, {});
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ PASS - Login endpoint exists (400 Bad Request expected)');
      testsPassed++;
    } else if (error.response && error.response.status === 404) {
      console.log('❌ FAIL - Login endpoint not found (404)');
      testsFailed++;
    } else {
      console.log('✅ PASS - Login endpoint exists');
      testsPassed++;
    }
  }

  // Test 4: Register Endpoint Exists
  console.log('\n📝 Test 4: POST /api/auth/register (Endpoint exists)');
  try {
    await axios.post(`${API_URL}/auth/register`, {});
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ PASS - Register endpoint exists (400 Bad Request expected)');
      testsPassed++;
    } else if (error.response && error.response.status === 404) {
      console.log('❌ FAIL - Register endpoint not found (404)');
      testsFailed++;
    } else {
      console.log('✅ PASS - Register endpoint exists');
      testsPassed++;
    }
  }

  // Test 5: Wallet Connect Endpoint Exists
  console.log('\n📝 Test 5: POST /api/auth/wallet/connect (Endpoint exists)');
  try {
    await axios.post(`${API_URL}/auth/wallet/connect`, {});
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ PASS - Wallet connect endpoint exists (400 Bad Request expected)');
      testsPassed++;
    } else if (error.response && error.response.status === 404) {
      console.log('❌ FAIL - Wallet connect endpoint not found (404)');
      testsFailed++;
    } else {
      console.log('✅ PASS - Wallet connect endpoint exists');
      testsPassed++;
    }
  }

  // Test 6: Health Check
  console.log('\n📝 Test 6: GET /api/health');
  try {
    const response = await axios.get(`${API_URL}/health`);
    if (response.data.status === 'OK') {
      console.log('✅ PASS - Backend is healthy');
      console.log('   Database:', response.data.database);
      console.log('   Environment:', response.data.environment);
      testsPassed++;
    } else {
      console.log('❌ FAIL - Backend unhealthy');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('='.repeat(60));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! MetaMask authentication is ready.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start frontend: cd elite-tena-frontend && npm run dev');
    console.log('   2. Open browser: http://localhost:5173');
    console.log('   3. Click "Connect Wallet" and test MetaMask login');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    console.log('   1. Backend is running: cd server && npm start');
    console.log('   2. Database is connected');
    console.log('   3. Port 3003 is not blocked');
  }
}

// Run tests
testEndpoints().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  console.log('\n⚠️  Make sure the backend is running:');
  console.log('   cd server && npm start');
  process.exit(1);
});
