/**
 * Debug 500 Error - Current Status
 * Test the exact API call that's failing to see the specific error
 */

const axios = require('axios');

async function debug500Error() {
  console.log('🔍 DEBUGGING CURRENT 500 ERROR');
  console.log('=' .repeat(50));

  try {
    // Test the exact failing call from the browser
    const patientWallet = '0x1765212874227cyqjkd';
    
    console.log(`🧪 Testing patient appointments API for: ${patientWallet}`);
    
    const response = await axios.get('http://localhost:3004/api/appointments', {
      params: {
        userRole: 'patient',
        userId: patientWallet
      },
      timeout: 10000
    });

    console.log('✅ API call successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Found: ${response.data.data?.length || 0} appointments`);

  } catch (error) {
    console.error('❌ API call failed with 500 error');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      
      if (error.response.data) {
        console.error('Error Details:');
        console.error(JSON.stringify(error.response.data, null, 2));
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }

  // Also test a simple health check
  console.log('\n🔍 Testing basic server health...');
  try {
    const healthResponse = await axios.get('http://localhost:3004/api/appointments', {
      timeout: 5000
    });
    console.log('✅ Basic health check passed');
  } catch (error) {
    console.error('❌ Basic health check failed');
    if (error.response?.data) {
      console.error('Health check error:', error.response.data);
    }
  }
}

// Run the debug
debug500Error();