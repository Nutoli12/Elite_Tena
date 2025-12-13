/**
 * Quick Appointment Check
 * Simple script to check appointment issues immediately
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function quickCheck() {
  console.log('🔍 QUICK APPOINTMENT CHECK');
  console.log('=' .repeat(40));

  try {
    // Check if server is running
    console.log('1. Checking server...');
    const healthResponse = await axios.get(`${BASE_URL}/appointments`);
    console.log(`✅ Server running - found ${healthResponse.data.data?.length || 0} total appointments`);

    // Test with a real wallet address (replace with actual)
    const testWallet = '0x742d35Cc6634C0532925a3b8D0C9964E5Bd4f071'; // Replace with your actual wallet

    console.log('\n2. Testing patient query...');
    const patientResponse = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'patient',
        userId: testWallet
      }
    });
    console.log(`✅ Patient query: ${patientResponse.data.data?.length || 0} appointments`);

    console.log('\n3. Testing doctor query...');
    const doctorResponse = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'doctor', 
        userId: testWallet
      }
    });
    console.log(`✅ Doctor query: ${doctorResponse.data.data?.length || 0} appointments`);

    // If no appointments found, try creating one
    if ((patientResponse.data.data?.length || 0) === 0) {
      console.log('\n4. No appointments found, creating test appointment...');
      try {
        const createResponse = await axios.post(`${BASE_URL}/appointments`, {
          patientWalletAddress: testWallet,
          doctorWalletAddress: '0x1234567890123456789012345678901234567890',
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Quick test appointment',
          duration: 30,
          fee: 0
        });

        if (createResponse.data.success) {
          console.log('✅ Test appointment created successfully');
          
          // Try to fetch it again
          const retestResponse = await axios.get(`${BASE_URL}/appointments`, {
            params: {
              userRole: 'patient',
              userId: testWallet
            }
          });
          console.log(`✅ After creation: ${retestResponse.data.data?.length || 0} appointments found`);
        }
      } catch (createError) {
        console.log('❌ Failed to create test appointment:', createError.response?.data?.message || createError.message);
      }
    }

    console.log('\n🎯 Quick check complete!');

  } catch (error) {
    console.error('❌ Quick check failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running. Please start it with: npm run dev');
    }
  }
}

// Run the check
quickCheck();