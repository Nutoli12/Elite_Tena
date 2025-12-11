/**
 * Debug Specific Users - Deep dive into the problematic users
 */

import db from './server/src/models/index.js';

const debugSpecificUsers = async () => {
  try {
    console.log('🔍 Debugging specific problematic users...\n');

    const problematicEmails = [
      'nutirese@gmail.com',
      'drabinetengida@gmail.com', 
      'semiryusuf@gmail.com'
    ];

    for (const email of problematicEmails) {
      console.log(`\n📧 Analyzing: ${email}`);
      console.log('='.repeat(50));
      
      const user = await db.User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        console.log('❌ User not found in database');
        continue;
      }

      console.log(`✅ User found:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Wallet: ${user.walletAddress}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
      
      // Deep dive into profileData
      console.log(`\n🔍 ProfileData Analysis:`);
      console.log(`   Type: ${typeof user.profileData}`);
      console.log(`   Raw value:`, user.profileData);
      
      let profileData = user.profileData;
      let hasPassword = false;
      let password = null;
      
      // Try to parse if it's a string
      if (typeof profileData === 'string') {
        try {
          profileData = JSON.parse(profileData);
          console.log(`   ✅ Successfully parsed JSON string`);
        } catch (e) {
          console.log(`   ❌ Failed to parse JSON: ${e.message}`);
          profileData = {};
        }
      }
      
      if (profileData && typeof profileData === 'object') {
        hasPassword = !!profileData.password;
        password = profileData.password;
        
        console.log(`   Has password: ${hasPassword}`);
        if (hasPassword) {
          console.log(`   Password: "${password}"`);
          console.log(`   Password length: ${password.length}`);
          console.log(`   Password type: ${typeof password}`);
          console.log(`   Password chars: ${password.split('').map(c => c.charCodeAt(0)).join(', ')}`);
        }
        
        console.log(`   Other fields:`, Object.keys(profileData).filter(k => k !== 'password'));
      }
      
      // Test the exact login logic from authController
      console.log(`\n🧪 Testing Login Logic:`);
      
      if (hasPassword) {
        // Simulate the exact logic from authController.js
        let storedPassword = null;
        try {
          const testProfileData = typeof user.profileData === 'string' 
            ? JSON.parse(user.profileData) 
            : user.profileData;
          storedPassword = testProfileData?.password;
        } catch (e) {
          console.log(`   ❌ Error parsing profileData in login logic: ${e.message}`);
        }
        
        console.log(`   Stored password from login logic: "${storedPassword}"`);
        console.log(`   Direct password from parsed data: "${password}"`);
        console.log(`   Passwords match: ${storedPassword === password}`);
        
        // Test with the actual password
        const testPassword = password;
        console.log(`   Testing with password: "${testPassword}"`);
        console.log(`   Login would succeed: ${storedPassword === testPassword}`);
        
        // Check for hidden characters or encoding issues
        if (storedPassword !== testPassword) {
          console.log(`   ⚠️  Password mismatch detected!`);
          console.log(`   Stored bytes: [${storedPassword.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
          console.log(`   Test bytes: [${testPassword.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
        }
      } else {
        console.log(`   ❌ No password found - user cannot login with email/password`);
      }
    }

    // Now let's test actual API calls for these users
    console.log('\n\n🌐 Testing API Calls...');
    console.log('='.repeat(50));
    
    const axios = (await import('axios')).default;
    const baseURL = 'http://localhost:3004/api';
    
    const testCases = [
      { email: 'nutirese@gmail.com', password: '123456' },
      { email: 'drabinetengida@gmail.com', password: '' }, // We need to find the password
      { email: 'semiryusuf@gmail.com', password: '123456' }
    ];
    
    // First, let's get the actual passwords from the database
    for (const testCase of testCases) {
      const user = await db.User.findOne({
        where: { email: testCase.email.toLowerCase() }
      });
      
      if (user) {
        let profileData = user.profileData;
        if (typeof profileData === 'string') {
          try {
            profileData = JSON.parse(profileData);
          } catch (e) {
            profileData = {};
          }
        }
        
        if (profileData?.password) {
          testCase.password = profileData.password;
        }
      }
    }
    
    for (const testCase of testCases) {
      if (!testCase.password) {
        console.log(`\n❌ Skipping ${testCase.email} - no password found`);
        continue;
      }
      
      console.log(`\n🧪 Testing API login: ${testCase.email}`);
      
      try {
        const response = await axios.post(`${baseURL}/auth/login`, {
          email: testCase.email,
          password: testCase.password
        });
        
        if (response.data.success) {
          console.log(`   ✅ API Login successful`);
          console.log(`   User: ${response.data.data.user.email}`);
          console.log(`   Role: ${response.data.data.user.role}`);
        } else {
          console.log(`   ❌ API Login failed: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`   ❌ API Error: ${error.response?.data?.message || error.message}`);
        if (error.response?.data) {
          console.log(`   Response:`, error.response.data);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging users:', error);
  } finally {
    await db.sequelize.close();
  }
};

debugSpecificUsers();