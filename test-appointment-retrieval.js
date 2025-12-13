/**
 * Test Appointment Retrieval
 * This script tests if appointments can be created and retrieved correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test data - replace with actual wallet addresses
const testData = {
  doctorWallet: '0x1234567890123456789012345678901234567890',
  patientWallet: '0x0987654321098765432109876543210987654321'
};

async function testAppointmentRetrieval() {
  console.log('🧪 TESTING APPOINTMENT RETRIEVAL');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check if server is running
    console.log('🔍 Step 1: Checking server status...');
    try {
      await axios.get(`${BASE_URL}/appointments`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first.');
      return;
    }

    // Step 2: Try to get all appointments (no filters)
    console.log('\n📋 Step 2: Getting all appointments...');
    const allAppointmentsResponse = await axios.get(`${BASE_URL}/appointments`);
    console.log(`✅ Total appointments found: ${allAppointmentsResponse.data.data?.length || 0}`);
    
    if (allAppointmentsResponse.data.data?.length > 0) {
      console.log('📋 Sample appointments:');
      allAppointmentsResponse.data.data.slice(0, 3).forEach((apt, index) => {
        console.log(`   ${index + 1}. ID: ${apt.id}`);
        console.log(`      Patient: ${apt.patientWalletAddress || apt.patientWallet}`);
        console.log(`      Doctor: ${apt.doctorWalletAddress || apt.doctorWallet}`);
        console.log(`      Date: ${apt.appointmentDate}`);
        console.log(`      Status: ${apt.status}`);
      });
    }

    // Step 3: Test patient-specific query
    console.log('\n👤 Step 3: Testing patient-specific query...');
    const patientAppointmentsResponse = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'patient',
        userId: testData.patientWallet
      }
    });
    console.log(`✅ Patient appointments found: ${patientAppointmentsResponse.data.data?.length || 0}`);

    // Step 4: Test doctor-specific query
    console.log('\n👨‍⚕️ Step 4: Testing doctor-specific query...');
    const doctorAppointmentsResponse = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'doctor',
        userId: testData.doctorWallet
      }
    });
    console.log(`✅ Doctor appointments found: ${doctorAppointmentsResponse.data.data?.length || 0}`);

    // Step 5: Try creating a test appointment
    console.log('\n📝 Step 5: Creating test appointment...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/appointments`, {
        patientWalletAddress: testData.patientWallet,
        doctorWalletAddress: testData.doctorWallet,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        reason: 'Test appointment for debugging',
        duration: 30,
        fee: 0
      });

      if (createResponse.data.success) {
        console.log('✅ Test appointment created successfully');
        console.log(`   ID: ${createResponse.data.data.id}`);
        
        // Try to retrieve it immediately
        console.log('\n🔍 Step 6: Retrieving newly created appointment...');
        const newAppointmentResponse = await axios.get(`${BASE_URL}/appointments`, {
          params: {
            userRole: 'patient',
            userId: testData.patientWallet
          }
        });
        
        const foundNewAppointment = newAppointmentResponse.data.data?.find(
          apt => apt.id === createResponse.data.data.id
        );
        
        if (foundNewAppointment) {
          console.log('✅ Newly created appointment found in query results');
        } else {
          console.log('❌ Newly created appointment NOT found in query results');
          console.log('   This indicates a query/filtering issue');
        }
      }
    } catch (createError) {
      console.log('❌ Failed to create test appointment:', createError.response?.data?.message || createError.message);
    }

    console.log('\n🎯 TEST COMPLETE');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   Error details:', error.response.data);
    }
  }
}

// Check if we have the required modules
try {
  require('axios');
  testAppointmentRetrieval();
} catch (error) {
  console.log('❌ Missing required modules. Please run: npm install axios');
}