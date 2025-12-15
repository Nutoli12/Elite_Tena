const axios = require('axios');

async function testSendMessage() {
  try {
    console.log('📤 Testing send message endpoint...');
    
    const messageData = {
      senderWallet: '0x1764894943291khtk9h',
      receiverWallet: '0x1765457952240uwgqie',
      content: 'Test message from chat system fix',
      type: 'text'
    };
    
    const response = await axios.post('http://localhost:3005/api/chat/send', messageData);
    
    console.log('✅ Send Success:', response.status);
    console.log('📊 Response:', response.data);
    
    // Now test retrieving the message
    console.log('\n📥 Testing retrieve messages...');
    const getResponse = await axios.get('http://localhost:3005/api/chat/direct/0x1764894943291khtk9h/0x1765457952240uwgqie');
    
    console.log('✅ Get Success:', getResponse.status);
    console.log('📊 Messages:', getResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 Full error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSendMessage();