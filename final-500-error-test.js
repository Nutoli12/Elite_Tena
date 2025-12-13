/**
 * Final 500 Error Test
 * Comprehensive test to verify all appointment endpoints are working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3004/api';

async function finalTest() {
  console.log('🧪 FINAL 500 ERROR TEST');
  console.log('=' .repeat(50));

  const testCases = [
    {
      name: 'Patient Appointments (Current Failing Case)',
      url: `${BASE_URL}/appointments`,
      params: {
        userRole: 'patient',
        userId: '0x1765212874227cyqjkd'
      }
    },
    {
      name: 'Doctor Appointments (Previous Failing Case)',
      url: `${BASE_URL}/appointments`,
      params: {
        userRole: 'doctor',
        userId: '0x1765465194183a78fkp'
      }
    },
    {
      name: 'All Appointments (No Filter)',
      url: `${BASE_URL}/appointments`,
      params: {}
    },
    {
      name: 'Doctor Stats',
      url: `${BASE_URL}/appointments/doctor/0x1765465194183a78fkp/stats`,
      params: {}
    },
    {
      name: 'Pending Approvals',
      url: `${BASE_URL}/appointments/pending-approval`,
      params: {
        doctorWallet: '0x1765465194183a78fkp'
      }
    },
    {
      name: 'Doctor Queue',
      url: `${BASE_URL}/appointments/doctor/0x1765465194183a78fkp/queue`,
      params: {}
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      
      const response = await axios.get(testCase.url, {
        params: testCase.params,
        timeout: 10000
      });

      console.log(`✅ PASSED - Status: ${response.status}`);
      if (response.data.success !== undefined) {
        console.log(`   Success: ${response.data.success}`);
        console.log(`   Data count: ${response.data.data?.length || 0}`);
      }
      
      passedTests++;
      
    } catch (error) {
      console.log(`❌ FAILED - ${testCase.name}`);
      
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.message || error.response.statusText}`);
        
        if (error.response.status === 500 && error.response.data?.error) {
          console.log(`   Details: ${error.response.data.error}`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   Server is not running');
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  console.log('\n🎯 TEST SUMMARY');
  console.log('=' .repeat(30));
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! 500 errors are fixed!');
  } else {
    console.log('⚠️  Some tests still failing. Server may need restart.');
  }
}

// Run the test
finalTest();