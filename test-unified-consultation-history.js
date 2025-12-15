/**
 * Test unified consultation history endpoint
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3006/api';

async function testUnifiedConsultationHistory() {
  try {
    console.log('🧪 Testing unified consultation history endpoint...');

    // Test with a sample wallet address
    const testWallet = '0x1234567890123456789012345678901234567890';
    
    const response = await axios.get(`${API_BASE}/premium-consultations/unified-history`, {
      params: {
        userWallet: testWallet,
        role: 'patient'
      }
    });

    console.log('✅ Unified consultation history response:');
    console.log('Status:', response.status);
    console.log('Data structure:', {
      success: response.data.success,
      count: response.data.count,
      breakdown: response.data.breakdown,
      sampleData: response.data.data?.slice(0, 2) // Show first 2 items
    });

    if (response.data.success) {
      console.log('✅ Endpoint is working correctly');
      
      // Check data structure
      if (response.data.data && response.data.data.length > 0) {
        const firstItem = response.data.data[0];
        console.log('📋 Sample consultation/call item structure:');
        console.log({
          id: firstItem.id,
          type: firstItem.type,
          subType: firstItem.subType,
          status: firstItem.status,
          otherParty: firstItem.otherParty,
          createdAt: firstItem.createdAt
        });
      } else {
        console.log('📝 No consultation history found (this is normal for new users)');
      }
    } else {
      console.log('❌ Endpoint returned success: false');
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Test regular consultations endpoint for comparison
async function testRegularConsultations() {
  try {
    console.log('\n🧪 Testing regular consultations endpoint for comparison...');

    const testWallet = '0x1234567890123456789012345678901234567890';
    
    const response = await axios.get(`${API_BASE}/premium-consultations`, {
      params: {
        userWallet: testWallet,
        role: 'patient'
      }
    });

    console.log('✅ Regular consultations response:');
    console.log('Status:', response.status);
    console.log('Count:', response.data.count);
    console.log('Sample data:', response.data.data?.slice(0, 1));

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

async function runTests() {
  await testUnifiedConsultationHistory();
  await testRegularConsultations();
  
  console.log('\n🎯 Test Summary:');
  console.log('- Unified consultation history endpoint should combine consultations and video calls');
  console.log('- Frontend will now show both chat consultations and video calls in one unified view');
  console.log('- Users can see their complete consultation history with doctors');
}

runTests();