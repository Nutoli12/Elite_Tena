#!/usr/bin/env node

/**
 * 🔚 END EXISTING TEST CALL
 * End any existing test video calls via API
 */

const axios = require('axios');

async function endExistingTestCall() {
  console.log('🔚 Ending existing test video calls...\n');

  try {
    const baseURL = 'http://localhost:3005';
    const doctorWallet = '0x1765645107928ugnsg';
    
    // Get active calls for doctor
    const activeCallsResponse = await axios.get(`${baseURL}/api/video-calls/active/${doctorWallet}`);
    
    if (activeCallsResponse.data.success && activeCallsResponse.data.data.length > 0) {
      console.log(`Found ${activeCallsResponse.data.data.length} active calls`);
      
      // End each active call
      for (const call of activeCallsResponse.data.data) {
        console.log(`Ending call: ${call.id}`);
        
        try {
          await axios.post(`${baseURL}/api/video-calls/${call.id}/end`, {
            userWallet: doctorWallet,
            reason: 'cleanup'
          });
          console.log(`✅ Ended call: ${call.id}`);
        } catch (endError) {
          console.log(`❌ Failed to end call ${call.id}:`, endError.response?.data?.message);
        }
      }
    } else {
      console.log('No active calls found');
    }

    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.response?.data || error.message);
  }
}

endExistingTestCall();