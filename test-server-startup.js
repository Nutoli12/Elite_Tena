/**
 * Test Server Startup
 * Quick test to see if the server starts without import errors
 */

const axios = require('axios');

async function testServerStartup() {
  console.log('🚀 TESTING SERVER STARTUP');
  console.log('=' .repeat(40));

  try {
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test basic health check
    console.log('🔍 Testing basic API health...');
    const response = await axios.get('http://localhost:3001/api/appointments', {
      timeout: 5000
    });

    console.log('✅ Server is running and responding');
    console.log(`Status: ${response.status}`);
    console.log(`Response type: ${typeof response.data}`);
    
    if (response.data.success !== undefined) {
      console.log(`Success: ${response.data.success}`);
      console.log(`Data count: ${response.data.data?.length || 0}`);
    }

    // Test the specific doctor endpoint that was failing
    console.log('\n🔍 Testing doctor appointments endpoint...');
    const doctorResponse = await axios.get('http://localhost:3001/api/appointments', {
      params: {
        userRole: 'doctor',
        userId: '0x1765465194183a78fkp'
      },
      timeout: 5000
    });

    console.log('✅ Doctor appointments endpoint working');
    console.log(`Found: ${doctorResponse.data.data?.length || 0} appointments`);

    console.log('\n🎯 Server startup test PASSED!');

  } catch (error) {
    console.error('❌ Server startup test FAILED');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not running or not accessible');
      console.error('   Make sure to start the server with: npm run dev');
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.error('   Server is starting but not ready yet');
      console.error('   Wait a moment and try again');
    } else if (error.response) {
      console.error(`   HTTP Error: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.statusText}`);
      if (error.response.data?.error) {
        console.error(`   Error: ${error.response.data.error}`);
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Run the test
testServerStartup();