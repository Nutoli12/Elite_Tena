/**
 * Fix Missing Passwords - Add passwords for users who don't have them
 */

import db from './server/src/models/index.js';

const fixMissingPasswords = async () => {
  try {
    console.log('🔧 Fixing missing passwords...\n');

    // Find users without passwords
    const users = await db.User.findAll();
    const usersWithoutPasswords = [];
    
    for (const user of users) {
      let profileData = user.profileData;
      
      if (typeof profileData === 'string') {
        try {
          profileData = JSON.parse(profileData);
        } catch (e) {
          profileData = {};
        }
      }
      
      if (!profileData?.password && user.email && !user.email.includes('@wallet.local')) {
        usersWithoutPasswords.push({
          email: user.email,
          walletAddress: user.walletAddress,
          role: user.role,
          profileData: profileData || {}
        });
      }
    }
    
    console.log(`Found ${usersWithoutPasswords.length} users without passwords:`);
    usersWithoutPasswords.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
    
    if (usersWithoutPasswords.length === 0) {
      console.log('✅ All users have passwords!');
      return;
    }
    
    console.log('\n🔧 Adding default passwords...');
    
    // Add default passwords based on user type and email
    for (const userInfo of usersWithoutPasswords) {
      let defaultPassword = 'password123'; // Default fallback
      
      // Generate password based on email or role
      if (userInfo.email.includes('admin')) {
        defaultPassword = 'admin123';
      } else if (userInfo.email.includes('doctor') || userInfo.email.includes('dr')) {
        defaultPassword = 'doctor123';
      } else if (userInfo.email.includes('patient')) {
        defaultPassword = 'patient123';
      } else if (userInfo.email.includes('pharmacy')) {
        defaultPassword = 'pharmacy123';
      } else if (userInfo.email.includes('lab')) {
        defaultPassword = 'lab123';
      } else {
        // For specific users, use a pattern based on their name
        const emailPrefix = userInfo.email.split('@')[0];
        if (emailPrefix.includes('drabinetengida')) {
          defaultPassword = 'doctor123'; // This is a doctor
        } else {
          defaultPassword = '123456'; // Simple default
        }
      }
      
      console.log(`   Setting password for ${userInfo.email}: ${defaultPassword}`);
      
      // Update the user's profileData with the password
      const updatedProfileData = {
        ...userInfo.profileData,
        password: defaultPassword
      };
      
      await db.User.update(
        { profileData: updatedProfileData },
        { where: { email: userInfo.email } }
      );
    }
    
    console.log('\n✅ Passwords added successfully!');
    
    // Test the fixed users
    console.log('\n🧪 Testing fixed users...');
    
    const axios = (await import('axios')).default;
    const baseURL = 'http://localhost:3004/api';
    
    for (const userInfo of usersWithoutPasswords) {
      let testPassword = 'password123';
      
      if (userInfo.email.includes('admin')) {
        testPassword = 'admin123';
      } else if (userInfo.email.includes('doctor') || userInfo.email.includes('dr')) {
        testPassword = 'doctor123';
      } else if (userInfo.email.includes('drabinetengida')) {
        testPassword = 'doctor123';
      } else {
        testPassword = '123456';
      }
      
      try {
        const response = await axios.post(`${baseURL}/auth/login`, {
          email: userInfo.email,
          password: testPassword
        });
        
        if (response.data.success) {
          console.log(`   ✅ ${userInfo.email} - Login successful with password: ${testPassword}`);
        } else {
          console.log(`   ❌ ${userInfo.email} - Login failed: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`   ❌ ${userInfo.email} - API Error: ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log('\n📋 Updated User Credentials:');
    console.log('='.repeat(50));
    
    for (const userInfo of usersWithoutPasswords) {
      let password = 'password123';
      
      if (userInfo.email.includes('admin')) {
        password = 'admin123';
      } else if (userInfo.email.includes('doctor') || userInfo.email.includes('dr')) {
        password = 'doctor123';
      } else if (userInfo.email.includes('drabinetengida')) {
        password = 'doctor123';
      } else {
        password = '123456';
      }
      
      console.log(`📧 ${userInfo.email}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`👤 Role: ${userInfo.role}`);
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    await db.sequelize.close();
  }
};

fixMissingPasswords();