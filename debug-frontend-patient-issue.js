#!/usr/bin/env node

const axios = require('axios');

async function debugFrontendPatientIssue() {
  console.log('🔍 DEBUGGING FRONTEND PATIENT SELECTION ISSUE...\n');
  
  const baseURL = 'http://localhost:3003/api';
  
  try {
    console.log('🔐 Step 1: Login and get exact headers frontend should use');
    console.log('======================================================');
    
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'doctor@test.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      const { user, auth } = loginResponse.data.data;
      
      console.log('✅ Login successful');
      console.log('📋 Frontend should store these in localStorage:');
      console.log(`   auth_token: "${auth.token}"`);
      console.log(`   user_wallet: "${user.walletAddress}"`);
      console.log(`   user_role: "${user.role}"`);
      console.log(`   user_email: "${user.email}"`);
      
      console.log('\n🔧 Frontend should send these headers:');
      const headers = {
        'Authorization': `Bearer ${auth.token}`,
        'x-wallet-address': user.walletAddress,
        'x-user-role': user.role,
        'Content-Type': 'application/json'
      };
      
      Object.entries(headers).forEach(([key, value]) => {
        console.log(`   ${key}: "${value}"`);
      });
      
      console.log('\n👥 Step 2: Test patient selection with exact headers');
      console.log('===================================================');
      
      const patientsResponse = await axios.get(`${baseURL}/lab/patients`, { headers });
      
      if (patientsResponse.data.success) {
        const patients = patientsResponse.data.data.patients || [];
        console.log(`✅ API Response: ${patients.length} patients found`);
        
        if (patients.length > 0) {
          console.log('\n👥 Patients that should appear in frontend:');
          patients.forEach((patient, index) => {
            console.log(`   ${index + 1}. ${patient.fullName}`);
            console.log(`      Email: ${patient.email}`);
            console.log(`      Wallet: ${patient.walletAddress}`);
            console.log(`      Display: ${patient.displayName}`);
          });
        } else {
          console.log('❌ No patients returned - this is the issue!');
          console.log('📝 Response message:', patientsResponse.data.data.message);
        }
        
        console.log('\n📊 Full API Response:');
        console.log(JSON.stringify(patientsResponse.data, null, 2));
        
      } else {
        console.log('❌ API call failed');
        console.log('Response:', patientsResponse.data);
      }
      
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 AUTHENTICATION ISSUE:');
      console.log('   - Check if auth token is being sent correctly');
      console.log('   - Verify token format and expiration');
    } else if (error.response?.status === 400) {
      console.log('\n💡 BAD REQUEST:');
      console.log('   - Check wallet address format');
      console.log('   - Verify required headers are present');
    }
  }
  
  console.log('\n🎯 FRONTEND DEBUGGING CHECKLIST:');
  console.log('================================');
  console.log('1. Open browser DevTools → Network tab');
  console.log('2. Login as doctor and go to Create Lab Order');
  console.log('3. Look for API call to /lab/patients');
  console.log('4. Check request headers match the ones above');
  console.log('5. Check response body for error messages');
  console.log('');
  console.log('🔧 COMMON FRONTEND ISSUES:');
  console.log('- localStorage not being read correctly');
  console.log('- Headers not being sent with API calls');
  console.log('- Authentication token expired or invalid');
  console.log('- Component not re-rendering after data load');
}

debugFrontendPatientIssue().catch(console.error);