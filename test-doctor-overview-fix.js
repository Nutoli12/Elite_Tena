#!/usr/bin/env node

/**
 * Test Doctor Lab Overview Fix
 * Tests if the 500 error in /api/lab/doctor/overview is fixed
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3003';

async function testDoctorOverviewFix() {
  console.log('🧪 Testing Doctor Lab Overview Fix...\n');

  try {
    // Test doctor overview endpoint
    console.log('1. Testing doctor overview endpoint...');
    
    const response = await axios.get(`${API_BASE}/api/lab/doctor/overview`, {
      headers: {
        'x-user-role': 'doctor',
        'x-wallet-address': '0x742d35Cc6634C0532925a3b8D4C9db96590c0000' // Test doctor wallet
      }
    });

    if (response.status === 200) {
      console.log('✅ Doctor overview endpoint working!');
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Doctor overview endpoint error:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      console.log(`   Error: ${error.response.data?.error || 'No error details'}`);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }

  console.log('\n2. Testing patient selection endpoint...');
  
  try {
    const patientsResponse = await axios.get(`${API_BASE}/api/lab/patients`, {
      headers: {
        'x-user-role': 'doctor',
        'x-wallet-address': '0x742d35Cc6634C0532925a3b8D4C9db96590c0000'
      }
    });

    if (patientsResponse.status === 200) {
      console.log('✅ Patient selection endpoint working!');
      console.log(`📋 Found ${patientsResponse.data.data.patients.length} patients`);
      
      if (patientsResponse.data.data.patients.length > 0) {
        console.log('👥 Sample patient:', patientsResponse.data.data.patients[0]);
      } else {
        console.log('ℹ️  No patients found - this is expected if no appointments exist');
      }
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Patient selection endpoint error:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }

  console.log('\n3. Testing lab workflow main page...');
  
  try {
    const workflowResponse = await axios.get(`${API_BASE}/api/lab/catalog`, {
      headers: {
        'x-user-role': 'doctor',
        'x-wallet-address': '0x742d35Cc6634C0532925a3b8D4C9db96590c0000'
      }
    });

    if (workflowResponse.status === 200) {
      console.log('✅ Lab catalog endpoint working!');
      console.log(`🧪 Found ${workflowResponse.data.data.tests.length} lab tests available`);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Lab catalog endpoint error:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }

  console.log('\n🏁 Test completed!');
  console.log('\n📝 Summary:');
  console.log('- Fixed User model field references (name → firstName/lastName)');
  console.log('- Patient selection only shows appointment-based patients');
  console.log('- Removed demo data fallback as requested');
  console.log('- All endpoints should now work without 500 errors');
}

// Run the test
testDoctorOverviewFix().catch(console.error);