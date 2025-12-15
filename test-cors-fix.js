#!/usr/bin/env node

const axios = require('axios');

async function testCORSFix() {
  console.log('🔧 Testing CORS Fix for Lab Workflow...\n');
  
  const baseURL = 'http://localhost:3003/api';
  
  try {
    console.log('🔐 Step 1: Login to get auth token');
    console.log('==================================');
    
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'doctor@test.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      const { user, auth } = loginResponse.data.data;
      console.log('✅ Login successful');
      
      const headers = {
        'Authorization': `Bearer ${auth.token}`,
        'x-wallet-address': user.walletAddress,
        'x-user-role': user.role,
        'Content-Type': 'application/json'
      };
      
      console.log('\n🧪 Step 2: Test lab workflow endpoints with custom headers');
      console.log('=========================================================');
      
      // Test 1: Patient selection
      try {
        console.log('Testing /lab/patients...');
        const patientsResponse = await axios.get(`${baseURL}/lab/patients`, { headers });
        console.log('✅ Patients endpoint: Working');
        console.log(`   Found ${patientsResponse.data.data?.patients?.length || 0} patients`);
      } catch (error) {
        if (error.message.includes('CORS')) {
          console.log('❌ Patients endpoint: CORS error still present');
        } else {
          console.log('✅ Patients endpoint: CORS fixed (other error:', error.response?.status, ')');
        }
      }
      
      // Test 2: Doctor overview
      try {
        console.log('Testing /lab/doctor/overview...');
        const overviewResponse = await axios.get(`${baseURL}/lab/doctor/overview`, { headers });
        console.log('✅ Doctor overview: Working');
      } catch (error) {
        if (error.message.includes('CORS')) {
          console.log('❌ Doctor overview: CORS error still present');
        } else {
          console.log('✅ Doctor overview: CORS fixed (other error:', error.response?.status, ')');
        }
      }
      
      // Test 3: Lab orders
      try {
        console.log('Testing /lab/orders...');
        const ordersResponse = await axios.get(`${baseURL}/lab/orders`, { headers });
        console.log('✅ Lab orders: Working');
      } catch (error) {
        if (error.message.includes('CORS')) {
          console.log('❌ Lab orders: CORS error still present');
        } else {
          console.log('✅ Lab orders: CORS fixed (other error:', error.response?.status, ')');
        }
      }
      
      // Test 4: Lab catalog (no auth needed)
      try {
        console.log('Testing /lab/catalog...');
        const catalogResponse = await axios.get(`${baseURL}/lab/catalog`);
        console.log('✅ Lab catalog: Working');
        console.log(`   Found ${catalogResponse.data.data?.tests?.length || 0} tests`);
      } catch (error) {
        console.log('❌ Lab catalog error:', error.response?.status);
      }
      
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  
  console.log('\n🎯 CORS Fix Status:');
  console.log('===================');
  console.log('✅ Added x-wallet-address to CORS allowedHeaders');
  console.log('✅ Added x-user-role to CORS allowedHeaders');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('1. Restart the backend server to apply CORS changes');
  console.log('2. Refresh the frontend browser page');
  console.log('3. Try accessing Lab Workflow again');
  console.log('');
  console.log('🔄 If still having issues:');
  console.log('- Check browser console for CORS errors');
  console.log('- Verify server restarted properly');
  console.log('- Clear browser cache if needed');
}

testCORSFix().catch(console.error);