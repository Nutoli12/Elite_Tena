const axios = require('axios');

async function testDoctorStats() {
  try {
    console.log('🧪 Testing doctor stats endpoint...');
    
    const response = await axios.get('http://localhost:3004/api/appointments/doctor/0x1765465194183a78fkp/stats', {
      timeout: 10000
    });

    console.log('✅ Doctor stats successful!');
    console.log(`Status: ${response.status}`);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Doctor stats failed');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${error.response.statusText}`);
      console.error('Data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

testDoctorStats();