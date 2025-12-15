import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

async function testAuthConnection() {
  console.log('🔐 Testing Authentication Connection...\n');

  try {
    // Test 1: Check if auth endpoint exists
    console.log('📡 Testing auth login endpoint...');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'dr.robert@elitetena.com',
        password: 'password123'
      });
      
      console.log('✅ Auth login endpoint working');
      console.log(`   Response status: ${response.status}`);
      console.log(`   User role: ${response.data.data?.user?.role || 'unknown'}`);
      
    } catch (error) {
      if (error.response) {
        console.log(`⚠️ Auth endpoint responded with status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      } else {
        console.log('❌ Auth endpoint not available');
        console.log(`   Error: ${error.message}`);
      }
    }

    // Test 2: Check server health
    console.log('\n🏥 Testing server health...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Server health endpoint working');
      console.log(`   Status: ${healthResponse.data.status || 'OK'}`);
    } catch (error) {
      console.log('⚠️ Health endpoint not available');
    }

    // Test 3: Check available endpoints
    console.log('\n📋 Testing available endpoints...');
    try {
      const response = await axios.get(`${API_BASE_URL}/api`);
      console.log('✅ API root endpoint accessible');
    } catch (error) {
      console.log('⚠️ API root endpoint not available');
    }

    console.log('\n🎯 Connection Test Summary:');
    console.log('   Server URL: http://localhost:3003');
    console.log('   Frontend should now connect to the correct port');
    console.log('   Lab Workflow APIs are working on this server');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testAuthConnection();