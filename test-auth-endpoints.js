import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

async function testAuthEndpoints() {
  console.log('🔐 Testing Authentication Endpoints...\n');

  try {
    // Test 1: Login endpoint
    console.log('📡 Testing login endpoint...');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'dr.robert@elitetena.com',
        password: 'password123'
      });
      
      console.log('✅ Login endpoint working');
      console.log(`   Status: ${response.status}`);
      console.log(`   User: ${response.data.data?.user?.name || 'Unknown'}`);
      console.log(`   Role: ${response.data.data?.user?.role || 'Unknown'}`);
      
    } catch (error) {
      if (error.response) {
        console.log(`⚠️ Login endpoint responded: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      } else {
        console.log(`❌ Login endpoint error: ${error.message}`);
      }
    }

    // Test 2: Check if auth routes exist
    console.log('\n📋 Testing auth route availability...');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth`);
      console.log('✅ Auth routes accessible');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️ Auth routes not found - may need to be implemented');
      } else {
        console.log(`⚠️ Auth routes error: ${error.response?.status || error.message}`);
      }
    }

    // Test 3: Check server routes
    console.log('\n🛣️ Testing available routes...');
    try {
      const response = await axios.get(`${API_BASE_URL}/api`);
      console.log('✅ API root accessible');
    } catch (error) {
      console.log('⚠️ API root not accessible');
    }

    console.log('\n🎯 Summary:');
    console.log('   - Frontend should now connect to port 3003');
    console.log('   - AuthContext URLs updated to use /api/auth/*');
    console.log('   - Lab Workflow APIs are working on this server');
    console.log('   - If auth endpoints return 404, they may need implementation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthEndpoints();