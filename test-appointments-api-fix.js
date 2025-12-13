/**
 * Test Appointments API Fix
 * Quick test to see if the 500 errors are resolved
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAppointmentsAPI() {
  console.log('🧪 TESTING APPOINTMENTS API FIX');
  console.log('=' .repeat(50));

  try {
    // Test the exact same call that was failing
    const doctorWallet = '0x1765465194183a78fkp';
    
    console.log('🔍 Testing doctor appointments API...');
    console.log(`Doctor wallet: ${doctorWallet}`);

    const response = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'doctor',
        userId: doctorWallet
      }
    });

    console.log('✅ API call successful!');
    console.log(`Found ${response.data.data?.length || 0} appointments`);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('📋 Sample appointment:');
      const sample = response.data.data[0];
      console.log(`   ID: ${sample.id}`);
      console.log(`   Patient: ${sample.patientWalletAddress}`);
      console.log(`   Doctor: ${sample.doctorWalletAddress}`);
      console.log(`   Date: ${sample.appointmentDate}`);
      console.log(`   Status: ${sample.status}`);
    }

    // Test other endpoints that were failing
    console.log('\n🔍 Testing other endpoints...');
    
    // Test doctor stats
    try {
      const statsResponse = await axios.get(`${BASE_URL}/appointments/doctor/${doctorWallet}/stats`);
      console.log('✅ Doctor stats API working');
    } catch (error) {
      console.log('❌ Doctor stats API still failing:', error.response?.status);
    }

    // Test pending approvals
    try {
      const approvalsResponse = await axios.get(`${BASE_URL}/appointments/pending-approval`, {
        params: { doctorWallet }
      });
      console.log('✅ Pending approvals API working');
    } catch (error) {
      console.log('❌ Pending approvals API still failing:', error.response?.status);
    }

    // Test doctor queue
    try {
      const queueResponse = await axios.get(`${BASE_URL}/appointments/doctor/${doctorWallet}/queue`);
      console.log('✅ Doctor queue API working');
    } catch (error) {
      console.log('❌ Doctor queue API still failing:', error.response?.status);
    }

    console.log('\n🎯 Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

// Run the test
testAppointmentsAPI();