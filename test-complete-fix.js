const axios = require('axios');

async function testCompleteFix() {
  console.log('🔍 ========== TESTING COMPLETE FIX FOR 500 ERRORS ==========');
  
  const baseURL = 'http://localhost:3004';
  
  // Test the exact URLs that were failing in the original error
  const failingUrls = [
    {
      name: 'Doctor appointments (original error)',
      url: `${baseURL}/api/appointments`,
      params: {
        userRole: 'doctor',
        userId: '0x1765465194183a78fkp:1'
      }
    },
    {
      name: 'Patient appointments (original error)',
      url: `${baseURL}/api/appointments`,
      params: {
        userRole: 'patient',
        userId: '0x1765212874227cyqjkd:1'
      }
    },
    {
      name: 'Patient specific endpoint (original error)',
      url: `${baseURL}/api/appointments/patient/0x1765212874227cyqjkd:1`,
      params: {}
    },
    {
      name: 'Doctor dashboard appointments',
      url: `${baseURL}/api/appointments/dashboard/doctor/0x1765465194183a78fkp:1`,
      params: {}
    },
    {
      name: 'Patient dashboard appointments',
      url: `${baseURL}/api/appointments/dashboard/patient/0x1765212874227cyqjkd:1`,
      params: {}
    }
  ];
  
  let successCount = 0;
  let totalTests = failingUrls.length;
  
  for (const test of failingUrls) {
    try {
      console.log(`\n📋 Testing: ${test.name}`);
      console.log('🔗 URL:', test.url);
      
      const response = await axios.get(test.url, {
        params: test.params,
        timeout: 10000
      });
      
      console.log('✅ SUCCESS:', {
        status: response.status,
        count: response.data.count || response.data.data?.length || 'N/A',
        hasData: !!response.data.data
      });
      
      successCount++;
      
    } catch (error) {
      console.error('❌ FAILED:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }
  }
  
  console.log(`\n🎯 SUMMARY: ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests) {
    console.log('🎉 ALL TESTS PASSED! The 500 errors have been fixed.');
  } else {
    console.log('⚠️ Some tests still failing. Need further investigation.');
  }
}

// Run the test
testCompleteFix().catch(console.error);