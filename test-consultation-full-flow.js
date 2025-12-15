const axios = require('axios');

async function testFullFlow() {
  try {
    console.log('🧪 Testing full consultation flow...');
    
    // Step 1: Create consultation
    const consultationData = {
      patientWallet: '0x1765457952240uwgqie',
      doctorWallet: '0x1764894943291khtk9h',
      consultationType: 'chat',
      duration: 30
    };
    
    const consultResponse = await axios.post('http://localhost:3005/api/premium-consultations/request', consultationData);
    console.log('✅ Step 1 - Consultation created:', consultResponse.status);
    
    const consultationId = consultResponse.data.data.consultationId;
    
    // Step 2: Submit payment
    const paymentData = {
      paymentMethod: 'telebirr',
      paymentReference: 'TXN' + Date.now(),
      patientWallet: '0x1765457952240uwgqie'
    };
    
    const paymentResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/submit-payment`, paymentData);
    console.log('✅ Step 2 - Payment submitted:', paymentResponse.status);
    
    // Step 3: Doctor verify payment
    const verifyData = {
      verified: true,
      doctorWallet: '0x1764894943291khtk9h'
    };
    
    const verifyResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/verify-payment`, verifyData);
    console.log('✅ Step 3 - Payment verified:', verifyResponse.status);
    
    // Step 4: Join consultation
    const joinResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/join`, {
      userWallet: '0x1765457952240uwgqie'
    });
    console.log('✅ Step 4 - Consultation joined:', joinResponse.status);
    
    // Step 5: Send message
    const messageData = {
      senderWallet: '0x1765457952240uwgqie',
      content: 'Hello doctor, this is a test message!',
      messageType: 'text'
    };
    
    const messageResponse = await axios.post(`http://localhost:3005/api/premium-consultations/${consultationId}/messages`, messageData);
    console.log('✅ Step 5 - Message sent:', messageResponse.status);
    console.log('📊 Message:', messageResponse.data);
    
    // Step 6: Get messages
    const getResponse = await axios.get(`http://localhost:3005/api/premium-consultations/${consultationId}/messages?userWallet=0x1765457952240uwgqie`);
    console.log('✅ Step 6 - Messages retrieved:', getResponse.status);
    console.log('📊 Message count:', getResponse.data.count);
    
    console.log('\n🎉 FULL CONSULTATION FLOW COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ Error at step:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 Full error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFullFlow();