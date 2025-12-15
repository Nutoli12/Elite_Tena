#!/usr/bin/env node

const axios = require('axios');

async function debugDoctorOverview500() {
  console.log('🔍 Debugging Doctor Overview 500 Error...\n');
  
  try {
    console.log('🔐 Step 1: Login as doctor');
    const loginResponse = await axios.post('http://localhost:3003/api/auth/login', {
      email: 'doctor@test.com',
      password: 'password123'
    });
    
    const { user, auth } = loginResponse.data.data;
    console.log('✅ Login successful');
    console.log(`   Doctor: ${user.walletAddress}`);
    
    console.log('\n🏥 Step 2: Test doctor overview endpoint');
    const response = await axios.get('http://localhost:3003/api/lab/doctor/overview', {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'x-wallet-address': user.walletAddress,
        'x-user-role': user.role
      }
    });
    
    console.log('✅ Doctor overview working');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Doctor overview 500 error details:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message);
    console.log('   Error:', error.response?.data?.error);
    
    if (error.response?.data?.error) {
      console.log('\n🔧 Likely causes:');
      if (error.response.data.error.includes('LabWorkflowOrder')) {
        console.log('   - LabWorkflowOrder model not found or not associated');
      }
      if (error.response.data.error.includes('User')) {
        console.log('   - User model association issue');
      }
      if (error.response.data.error.includes('Sequelize')) {
        console.log('   - Database query syntax error');
      }
    }
  }
}

debugDoctorOverview500().catch(console.error);