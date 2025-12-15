/**
 * 💬🎥 TEST PREMIUM CONSULTATIONS SYSTEM
 * Tests the chat and video consultation API endpoints
 */

const API_URL = 'http://localhost:3005/api';

// Test data - using actual wallet addresses from database
const TEST_PATIENT_WALLET = '0x1765645107820qldzw'; // Test Patient
const TEST_DOCTOR_WALLET = '0x1764894943291khtk9h'; // Real doctor

async function testConsultationSystem() {
  console.log('🧪 Testing Premium Consultations System\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Request Chat Consultation
    console.log('\n📋 Test 1: Request Chat Consultation');
    const chatRequest = await fetch(`${API_URL}/premium-consultations/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientWallet: TEST_PATIENT_WALLET,
        doctorWallet: TEST_DOCTOR_WALLET,
        consultationType: 'chat'
      })
    });
    const chatResult = await chatRequest.json();
    console.log('   Status:', chatRequest.status);
    console.log('   Result:', JSON.stringify(chatResult, null, 2));

    if (!chatResult.success) {
      console.log('   ⚠️ Chat request failed (may need valid users in DB)');
    }

    // Test 2: Request Video Consultation
    console.log('\n📋 Test 2: Request Video Consultation');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const videoRequest = await fetch(`${API_URL}/premium-consultations/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientWallet: TEST_PATIENT_WALLET,
        doctorWallet: TEST_DOCTOR_WALLET,
        consultationType: 'video',
        scheduledTime: tomorrow.toISOString()
      })
    });
    const videoResult = await videoRequest.json();
    console.log('   Status:', videoRequest.status);
    console.log('   Result:', JSON.stringify(videoResult, null, 2));

    // Test 3: Get Consultations
    console.log('\n📋 Test 3: Get User Consultations');
    const getConsultations = await fetch(
      `${API_URL}/premium-consultations?userWallet=${TEST_PATIENT_WALLET}&role=patient`
    );
    const consultations = await getConsultations.json();
    console.log('   Status:', getConsultations.status);
    console.log('   Count:', consultations.count || 0);

    // Test 4: API Health Check
    console.log('\n📋 Test 4: API Health Check');
    const health = await fetch(`${API_URL}/health`);
    const healthResult = await health.json();
    console.log('   Status:', health.status);
    console.log('   API:', healthResult.message);

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Tests completed!\n');

    console.log('📝 Next Steps:');
    console.log('   1. Run migration: node run-premium-consultations-migration.js');
    console.log('   2. Restart server');
    console.log('   3. Test with real user wallets from your database');
    console.log('   4. Configure Daily.co for video calls (optional)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running on port 3005');
  }
}

testConsultationSystem();
