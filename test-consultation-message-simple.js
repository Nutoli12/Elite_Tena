const axios = require('axios');

async function testSimple() {
  try {
    console.log('🧪 Testing consultation message creation...');
    
    // First create a consultation
    const consultationData = {
      patientWallet: '0x1765457952240uwgqie',
      doctorWallet: '0x1764894943291khtk9h',
      consultationType: 'chat',
      duration: 30
    };
    
    const consultResponse = await axios.post('http://localhost:3005/api/premium-consultations/request', consultationData);
    console.log('✅ Consultation created:', consultResponse.status);
    
    const consultationId = consultResponse.data.data.consultationId;
    
    // Try to send a message
    const messageData = {
      senderWallet: '0x1765457952240uwgqie',
      content: 'Test message',
      type: 'text'
    };
    
    const messageResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/messages`, messageData);
    console.log('✅ Message sent:', messageResponse.status);
    console.log('📊 Message data:', messageResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 Full error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSimple();