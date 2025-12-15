const axios = require('axios');

async function debugFrontendChatIssue() {
  try {
    console.log('🔍 Debugging Frontend Chat Issue\n');
    
    const user1 = '0x1764894943291khtk9h'; // Doctor (sender having issue)
    const user2 = '0x1765457952240uwgqie'; // Patient (receiver can see)
    
    // Test the exact same API call the frontend makes
    console.log('📡 Testing Frontend API Call Pattern');
    console.log(`   Endpoint: /api/chat/direct/${user1}/${user2}`);
    
    const response = await axios.get(`http://localhost:3005/api/chat/direct/${user1}/${user2}`);
    
    console.log('📊 API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Message Count: ${response.data.count}`);
    
    console.log('\n📝 Message Analysis:');
    response.data.data.forEach((msg, index) => {
      const isSentByUser1 = msg.senderWallet.toLowerCase() === user1.toLowerCase();
      console.log(`   ${index + 1}. ${isSentByUser1 ? '[SENT]' : '[RECEIVED]'} From: ${msg.senderWallet}`);
      console.log(`      Content: "${msg.content}"`);
      console.log(`      Created: ${msg.createdAt}`);
    });
    
    // Count messages by sender
    const sentByUser1 = response.data.data.filter(msg => 
      msg.senderWallet.toLowerCase() === user1.toLowerCase()
    ).length;
    
    const sentByUser2 = response.data.data.filter(msg => 
      msg.senderWallet.toLowerCase() === user2.toLowerCase()
    ).length;
    
    console.log('\n📈 Message Statistics:');
    console.log(`   Messages sent by User1 (${user1}): ${sentByUser1}`);
    console.log(`   Messages sent by User2 (${user2}): ${sentByUser2}`);
    console.log(`   Total messages: ${response.data.count}`);
    
    // Test reverse direction (what User2 would see)
    console.log('\n🔄 Testing Reverse Direction');
    console.log(`   Endpoint: /api/chat/direct/${user2}/${user1}`);
    
    const reverseResponse = await axios.get(`http://localhost:3005/api/chat/direct/${user2}/${user1}`);
    
    console.log(`   Status: ${reverseResponse.status}`);
    console.log(`   Message Count: ${reverseResponse.data.count}`);
    
    if (response.data.count === reverseResponse.data.count) {
      console.log('   ✅ Both directions return same message count');
    } else {
      console.log('   ❌ Different message counts in different directions!');
    }
    
    // Check if the issue is in the frontend logic
    console.log('\n🎨 Frontend Logic Simulation:');
    console.log('   Simulating how frontend would render messages...');
    
    response.data.data.forEach((msg, index) => {
      const isSent = msg.senderWallet.toLowerCase() === user1.toLowerCase();
      const alignment = isSent ? 'RIGHT (sent)' : 'LEFT (received)';
      const bgColor = isSent ? 'BLUE (medical-500)' : 'GRAY (gray-200)';
      
      console.log(`   ${index + 1}. ${alignment} | ${bgColor} | "${msg.content}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

debugFrontendChatIssue();