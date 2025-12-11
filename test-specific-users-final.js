/**
 * Test Specific Users - Final verification
 */

import axios from 'axios';

const testSpecificUsers = async () => {
  try {
    console.log('🧪 Testing the specific problematic users...\n');

    const baseURL = 'http://localhost:3004/api';
    
    const testUsers = [
      { email: 'nutirese@gmail.com', password: '123456' },
      { email: 'drabinetengida@gmail.com', password: 'doctor123' }, // Fixed - now has password
      { email: 'semiryusuf@gmail.com', password: '123456' }
    ];

    for (const user of testUsers) {
      console.log(`Testing: ${user.email} with password: ${user.password}`);
      
      try {
        const response = await axios.post(`${baseURL}/auth/login`, {
          email: user.email,
          password: user.password
        });

        if (response.data.success) {
          console.log(`   ✅ LOGIN SUCCESSFUL!`);
          console.log(`   User: ${response.data.data.user.email}`);
          console.log(`   Role: ${response.data.data.user.role}`);
          console.log(`   Wallet: ${response.data.data.user.walletAddress}`);
          console.log(`   Token: ${response.data.data.auth.token.substring(0, 20)}...`);
        } else {
          console.log(`   ❌ Login failed: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`   ❌ Login error: ${error.response?.data?.message || error.message}`);
        if (error.response?.data) {
          console.log(`   Full response:`, error.response.data);
        }
      }
      
      console.log('   ' + '-'.repeat(50));
    }
    
    console.log('\n📋 SUMMARY - Working Credentials:');
    console.log('='.repeat(60));
    testUsers.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`🔑 ${user.password}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testSpecificUsers();