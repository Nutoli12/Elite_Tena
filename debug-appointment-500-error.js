const axios = require('axios');

async function debugAppointmentAPI() {
  console.log('🔍 ========== DEBUGGING APPOINTMENT 500 ERROR ==========');
  
  const baseURL = 'http://localhost:3004';
  const doctorId = '0x1765465194183a78fkp';
  
  try {
    console.log('📋 Testing appointment API endpoint...');
    console.log('🔗 URL:', `${baseURL}/api/appointments?userRole=doctor&userId=${doctorId}`);
    
    const response = await axios.get(`${baseURL}/api/appointments`, {
      params: {
        userRole: 'doctor',
        userId: doctorId
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
}

// Run the debug
debugAppointmentAPI().catch(console.error);