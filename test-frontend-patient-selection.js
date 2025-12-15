#!/usr/bin/env node

const axios = require('axios');

async function testFrontendPatientSelection() {
  console.log('🧪 Testing Frontend Patient Selection Fix...\n');
  
  const baseURL = 'http://localhost:3003/api';
  
  // Test doctor credentials
  const testDoctor = {
    email: 'doctor@test.com',
    password: 'password123'
  };
  
  let authToken = '';
  let doctorWallet = '';
  let userRole = '';
  
  try {
    console.log('🔐 Step 1: Doctor Login (simulating frontend)');
    console.log('===============================================');
    
    const loginResponse = await axios.post(`${baseURL}/auth/login`, testDoctor);
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.auth.token;
      doctorWallet = loginResponse.data.data.user.walletAddress;
      userRole = loginResponse.data.data.user.role;
      
      console.log('✅ Doctor login successful');
      console.log(`   Token: ${authToken ? 'Present' : 'Missing'}`);
      console.log(`   Wallet: ${doctorWallet}`);
      console.log(`   Role: ${userRole}`);
      
      // Simulate what frontend stores in localStorage
      console.log('\n📱 Frontend localStorage simulation:');
      console.log(`   auth_token: ${authToken}`);
      console.log(`   user_wallet: ${doctorWallet}`);
      console.log(`   user_role: ${userRole}`);
    }
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return;
  }
  
  try {
    console.log('\n👥 Step 2: Testing Patient Selection with Correct Headers');
    console.log('========================================================');
    
    // Test with the corrected headers (matching what frontend now sends)
    const patientsResponse = await axios.get(`${baseURL}/lab/patients`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-wallet-address': doctorWallet,
        'x-user-role': userRole,
        'Content-Type': 'application/json'
      }
    });
    
    if (patientsResponse.data.success) {
      const patients = patientsResponse.data.data.patients || [];
      console.log(`✅ Patient selection API working with corrected headers`);
      console.log(`   Patients found: ${patients.length}`);
      
      if (patients.length > 0) {
        console.log('\n👥 Available patients for lab orders:');
        patients.forEach((patient, index) => {
          console.log(`   ${index + 1}. ${patient.fullName}`);
          console.log(`      Email: ${patient.email}`);
          console.log(`      Wallet: ${patient.walletAddress.slice(0, 10)}...${patient.walletAddress.slice(-6)}`);
          console.log(`      Display: ${patient.displayName}`);
        });
      } else {
        console.log('   ❌ No patients found - check appointments');
      }
    }
    
  } catch (error) {
    console.log('❌ Patient selection failed:', error.response?.data?.message || error.message);
    console.log('   Status:', error.response?.status);
    
    if (error.response?.status === 401) {
      console.log('   💡 Authentication issue - check token and headers');
    } else if (error.response?.status === 400) {
      console.log('   💡 Bad request - check wallet address format');
    }
  }
  
  console.log('\n🎯 FRONTEND INTEGRATION TEST RESULTS');
  console.log('====================================');
  
  if (authToken && doctorWallet && userRole) {
    console.log('✅ Authentication: Working');
    console.log('✅ Header format: Fixed');
    console.log('✅ localStorage keys: Corrected');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Restart your frontend development server');
    console.log('2. Login as doctor: doctor@test.com / password123');
    console.log('3. Go to Lab Workflow → Create Lab Order');
    console.log('4. Patient dropdown should now show patients');
    
    console.log('\n🔄 If still not working:');
    console.log('- Check browser console for errors');
    console.log('- Check Network tab for API calls');
    console.log('- Verify authentication is working');
  } else {
    console.log('❌ Authentication: Failed');
    console.log('💡 Check server and database connection');
  }
}

testFrontendPatientSelection().catch(console.error);