/**
 * 💰 TEST CONSULTATION PAYMENT FLOW
 * Tests the P2P payment submission and doctor verification
 */

const API_URL = 'http://localhost:3005/api';

const TEST_PATIENT_WALLET = '0x1765645107820qldzw';
const TEST_DOCTOR_WALLET = '0x1764894943291khtk9h';

async function testPaymentFlow() {
  console.log('💰 Testing Consultation Payment Flow\n');
  console.log('=' .repeat(50));

  try {
    // Step 1: Create a chat consultation
    console.log('\n📋 Step 1: Create Chat Consultation');
    const createRes = await fetch(`${API_URL}/premium-consultations/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientWallet: TEST_PATIENT_WALLET,
        doctorWallet: TEST_DOCTOR_WALLET,
        consultationType: 'chat'
      })
    });
    const createResult = await createRes.json();
    console.log('   Status:', createRes.status);
    
    if (!createResult.success) {
      console.log('   ❌ Failed to create consultation');
      return;
    }
    
    const consultationId = createResult.data.consultationId;
    console.log('   ✅ Consultation ID:', consultationId);
    console.log('   Fee:', createResult.data.fee, createResult.data.currency);

    // Step 2: Submit P2P payment reference
    console.log('\n📋 Step 2: Submit P2P Payment Reference');
    const paymentRes = await fetch(`${API_URL}/premium-consultations/${consultationId}/submit-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientWallet: TEST_PATIENT_WALLET,
        paymentMethod: 'telebirr',
        paymentReference: 'TXN-TEST-' + Date.now()
      })
    });
    const paymentResult = await paymentRes.json();
    console.log('   Status:', paymentRes.status);
    console.log('   Result:', paymentResult.success ? '✅ Payment submitted' : '❌ ' + paymentResult.error);

    // Step 3: Doctor verifies payment
    console.log('\n📋 Step 3: Doctor Verifies Payment');
    const verifyRes = await fetch(`${API_URL}/premium-consultations/${consultationId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorWallet: TEST_DOCTOR_WALLET
      })
    });
    const verifyResult = await verifyRes.json();
    console.log('   Status:', verifyRes.status);
    console.log('   Result:', verifyResult.success ? '✅ Payment verified' : '❌ ' + verifyResult.error);
    if (verifyResult.success) {
      console.log('   Expires At:', verifyResult.data.expiresAt);
    }

    // Step 4: Get consultation details
    console.log('\n📋 Step 4: Get Consultation Details');
    const detailsRes = await fetch(`${API_URL}/premium-consultations/${consultationId}?userWallet=${TEST_PATIENT_WALLET}`);
    const detailsResult = await detailsRes.json();
    console.log('   Status:', detailsRes.status);
    console.log('   Consultation Status:', detailsResult.data?.status);
    console.log('   Payment Status:', detailsResult.data?.paymentStatus);
    console.log('   Is Accessible:', detailsResult.data?.isAccessible);

    // Step 5: Join consultation
    console.log('\n📋 Step 5: Join Consultation');
    const joinRes = await fetch(`${API_URL}/premium-consultations/${consultationId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userWallet: TEST_PATIENT_WALLET
      })
    });
    const joinResult = await joinRes.json();
    console.log('   Status:', joinRes.status);
    console.log('   Result:', joinResult.success ? '✅ Joined consultation' : '❌ ' + joinResult.error);
    if (joinResult.success) {
      console.log('   Chat Room ID:', joinResult.data.chatRoomId);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Payment flow test completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testPaymentFlow();
