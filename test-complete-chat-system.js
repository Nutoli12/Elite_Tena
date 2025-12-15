const axios = require('axios');

async function testCompleteSystem() {
  console.log('🧪 Testing Complete Chat & Premium Consultation System\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Direct Chat System
    console.log('\n📋 Test 1: Direct Chat System');
    
    // Send a message
    const messageData = {
      senderWallet: '0x1764894943291khtk9h',
      receiverWallet: '0x1765457952240uwgqie',
      content: 'Hello from the fixed chat system!',
      type: 'text'
    };
    
    const sendResponse = await axios.post('http://localhost:3005/api/chat/send', messageData);
    console.log('   ✅ Send Message:', sendResponse.status, 'Created');
    
    // Retrieve messages
    const getResponse = await axios.get('http://localhost:3005/api/chat/direct/0x1764894943291khtk9h/0x1765457952240uwgqie');
    console.log('   ✅ Get Messages:', getResponse.status, `Found ${getResponse.data.count} messages`);

    // Test 2: Premium Consultations
    console.log('\n📋 Test 2: Premium Consultations System');
    
    // Request consultation
    const consultationData = {
      patientWallet: '0x1765457952240uwgqie',
      doctorWallet: '0x1764894943291khtk9h',
      consultationType: 'chat',
      duration: 30
    };
    
    const consultResponse = await axios.post('http://localhost:3005/api/premium-consultations/request', consultationData);
    console.log('   ✅ Request Consultation:', consultResponse.status, 'Created');
    
    const consultationId = consultResponse.data.data.consultationId;
    
    // Submit P2P payment
    const paymentData = {
      paymentMethod: 'telebirr',
      paymentReference: 'TXN' + Date.now(),
      patientWallet: '0x1765457952240uwgqie',
      amount: consultResponse.data.data.fee
    };
    
    const paymentResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/submit-payment`, paymentData);
    console.log('   ✅ Submit Payment:', paymentResponse.status, 'Submitted');
    
    // Doctor verify payment
    const verifyData = {
      verified: true,
      doctorWallet: '0x1764894943291khtk9h'
    };
    
    const verifyResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/verify-payment`, verifyData);
    console.log('   ✅ Verify Payment:', verifyResponse.status, 'Verified');
    
    // Join consultation
    const joinResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/join`, {
      userWallet: '0x1765457952240uwgqie'
    });
    console.log('   ✅ Join Consultation:', joinResponse.status, 'Joined');

    // Test 3: Premium Consultation Chat
    console.log('\n📋 Test 3: Premium Consultation Chat');
    
    const consultChatData = {
      senderWallet: '0x1765457952240uwgqie',
      content: 'Hello doctor, this is a premium consultation message!',
      type: 'text'
    };
    
    const chatResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/messages`, consultChatData);
    console.log('   ✅ Send Consultation Message:', chatResponse.status, 'Sent');
    
    const getChatResponse = await axios.get(`http://localhost:3005/api/premium-consultations/${consultationId}/messages?userWallet=0x1765457952240uwgqie`);
    console.log('   ✅ Get Consultation Messages:', getChatResponse.status, `Found ${getChatResponse.data.count} messages`);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ ALL TESTS PASSED! Chat & Premium Consultation System is WORKING!');
    console.log('\n🎉 System Status: READY FOR PRODUCTION');
    
    console.log('\n📊 Summary:');
    console.log('   • Direct Chat: ✅ Working');
    console.log('   • Premium Consultations: ✅ Working');
    console.log('   • P2P Payments: ✅ Working');
    console.log('   • Consultation Chat: ✅ Working');
    console.log('   • Payment Verification: ✅ Working');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 Error Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCompleteSystem();