/**
 * Test Login Issue - Simulate actual login requests
 */

import axios from 'axios';

const testLogin = async () => {
  try {
    console.log('🧪 Testing login with existing users...\n');

    const testUsers = [
      { email: 'semir@gmail.com', password: '123456' },
      { email: 'amir@gmail.com', password: 'amir12@' },
      { email: 'admin@gmail.com', password: 'admin123' },
      { email: 'patient@gmail.com', password: 'patient123' },
      { email: 'dr.alemayehu@gmail.com', password: 'doctor123' }
    ];

    const baseURL = 'http://localhost:3004/api';

    for (const user of testUsers) {
      console.log(`Testing login for: ${user.email}`);
      
      try {
        const response = await axios.post(`${baseURL}/auth/login`, {
          email: user.email,
          password: user.password
        });

        if (response.data.success) {
          console.log(`   ✅ Login successful`);
          console.log(`   User: ${response.data.data.user.email}`);
          console.log(`   Role: ${response.data.data.user.role}`);
        } else {
          console.log(`   ❌ Login failed: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`   ❌ Login error: ${error.response?.data?.message || error.message}`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Response:`, error.response?.data);
      }
      
      console.log('   ---');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testLogin();