const axios = require('axios');

async function debugPatientAPI() {
  console.log('🔍 ========== DEBUGGING PATIENT 500 ERROR ==========');
  
  const baseURL = 'http://localhost:3004';
  const patientId = '0x1765212874227cyqjkd'; // Correct wallet without :1
  
  try {
    console.log('📋 Testing patient appointment API endpoint...');
    console.log('🔗 URL:', `${baseURL}/api/appointments?userRole=patient&userId=${patientId}`);
    
    const response = await axios.get(`${baseURL}/api/appointments`, {
      params: {
        userRole: 'patient',
        userId: patientId
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS: API call completed');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR: API call failed');
    console.error('📊 Status:', error.response?.status);
    console.error('📊 Status Text:', error.response?.statusText);
    console.error('📊 Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('📊 Full Error:', error.message);
    
    if (error.response?.data?.message) {
      console.error('🔍 Detailed Error Message:', error.response.data.message);
    }
  }
  
  // Also test the specific patient endpoint
  try {
    console.log('\n📋 Testing specific patient endpoint...');
    console.log('🔗 URL:', `${baseURL}/api/appointments/patient/${patientId}`);
    
    const response2 = await axios.get(`${baseURL}/api/appointments/patient/${patientId}`);
    
    console.log('✅ SUCCESS: Patient endpoint call completed');
    console.log('📊 Response status:', response2.status);
    console.log('📊 Response data:', JSON.stringify(response2.data, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR: Patient endpoint call failed');
    console.error('📊 Status:', error.response?.status);
    console.error('📊 Error Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

// Run the debug
debugPatientAPI().catch(console.error);