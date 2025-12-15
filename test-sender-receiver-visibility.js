const axios = require('axios');

async function testSenderReceiverVisibility() {
  try {
    console.log('🧪 Testing Sender/Receiver Message Visibility Issue\n');
    
    const user1 = '0x1764894943291khtk9h'; // Doctor
    const user2 = '0x1765457952240uwgqie'; // Patient
    
    // Step 1: Send message from user1 to user2
    console.log('📤 Step 1: User1 sends message to User2');
    const message1Data = {
      senderWallet: user1,
      receiverWallet: user2,
      content: 'Hello from User1 to User2',
      type: 'text'
    };
    
    const send1Response = await axios.post('http://localhost:3005/api/chat/send', message1Data);
    console.log('   ✅ Message sent:', send1Response.status);
    
    // Step 2: Send message from user2 to user1
    console.log('\n📤 Step 2: User2 sends message to User1');
    const message2Data = {
      senderWallet: user2,
      receiverWallet: user1,
      content: 'Hello from User2 to User1',
      type: 'text'
    };
    
    const send2Response = await axios.post('http://localhost:3005/api/chat/send', message2Data);
    console.log('   ✅ Message sent:', send2Response.status);
    
    // Step 3: Check messages from User1's perspective
    console.log('\n📥 Step 3: Getting messages from User1 perspective');
    const user1Messages = await axios.get(`http://localhost:3005/api/chat/direct/${user1}/${user2}`);
    console.log('   📊 User1 sees:', user1Messages.data.count, 'messages');
    
    user1Messages.data.data.forEach((msg, index) => {
      console.log(`   ${index + 1}. From: ${msg.senderWallet} | Content: "${msg.content}"`);
    });
    
    // Step 4: Check messages from User2's perspective
    console.log('\n📥 Step 4: Getting messages from User2 perspective');
    const user2Messages = await axios.get(`http://localhost:3005/api/chat/direct/${user2}/${user1}`);
    console.log('   📊 User2 sees:', user2Messages.data.count, 'messages');
    
    user2Messages.data.data.forEach((msg, index) => {
      console.log(`   ${index + 1}. From: ${msg.senderWallet} | Content: "${msg.content}"`);
    });
    
    // Analysis
    console.log('\n🔍 Analysis:');
    console.log(`   User1 message count: ${user1Messages.data.count}`);
    console.log(`   User2 message count: ${user2Messages.data.count}`);
    
    if (user1Messages.data.count === user2Messages.data.count && user1Messages.data.count >= 2) {
      console.log('   ✅ BOTH users can see all messages - WORKING CORRECTLY');
    } else {
      console.log('   ❌ ISSUE DETECTED - Message visibility problem');
      
      // Check if User1 can see their own sent message
      const user1SentMessage = user1Messages.data.data.find(msg => msg.senderWallet === user1.toLowerCase());
      const user1ReceivedMessage = user1Messages.data.data.find(msg => msg.senderWallet === user2.toLowerCase());
      
      console.log(`   User1 can see own sent message: ${user1SentMessage ? 'YES' : 'NO'}`);
      console.log(`   User1 can see received message: ${user1ReceivedMessage ? 'YES' : 'NO'}`);
      
      // Check if User2 can see their own sent message
      const user2SentMessage = user2Messages.data.data.find(msg => msg.senderWallet === user2.toLowerCase());
      const user2ReceivedMessage = user2Messages.data.data.find(msg => msg.senderWallet === user1.toLowerCase());
      
      console.log(`   User2 can see own sent message: ${user2SentMessage ? 'YES' : 'NO'}`);
      console.log(`   User2 can see received message: ${user2ReceivedMessage ? 'YES' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 Full error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSenderReceiverVisibility();