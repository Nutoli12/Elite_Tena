const axios = require('axios');

async function testWalletSanitization() {
  console.log('🔍 ========== TESTING WALLET SANITIZATION ==========');
  
  const baseURL = 'http://localhost:3004';
  
  // Test cases with :1 suffix
  const testCases = [
    {
      name: 'Doctor with :1 suffix (query params)',
      url: `${baseURL}/api/appointments`,
      params: {
        userRole: 'doctor',
        userId: '0x1765465194183a78fkp:1'
      }
    },
    {
      name: 'Patient with :1 suffix (query params)',
      url: `${baseURL}/api/appointments`,
      params: {
        userRole: 'patient',
        userId: '0x1765212874227cyqjkd:1'
      }
    },
    {
      name: 'Patient with :1 suffix (path params)',
      url: `${baseURL}/api/appointments/patient/0x1765212874227cyqjkd:1`,
      params: {}
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📋 Testing: ${testCase.name}`);
      console.log('🔗 URL:', testCase.url);
      console.log('📊 Params:', testCase.params);
      
      const response = await axios.get(testCase.url, {
        params: testCase.params,
        timeout: 10000
      });
      
      console.log('✅ SUCCESS:', {
        status: response.status,
        count: response.data.count,
        userRole: response.data.userRole,
        userId: response.data.userId
      });
      
    } catch (error) {
      console.error('❌ ERROR:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
  }
}

// Run the test
testWalletSanitization().catch(console.error);