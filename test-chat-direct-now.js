const axios = require('axios');

async function testChatEndpoint() {
  try {
    console.log('🧪 Testing direct chat endpoint...');
    
    const response = await axios.get('http://localhost:3005/api/chat/direct/0x1764894943291khtk9h/0x1765457952240uwgqie');
    
    console.log('✅ Success:', response.status);
    console.log('📊 Data:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 Full error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testChatEndpoint();