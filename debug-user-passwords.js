/**
 * Debug User Passwords - Check current user authentication data
 */

import db from './server/src/models/index.js';

const debugUserPasswords = async () => {
  try {
    console.log('🔍 Debugging user password storage...\n');

    // Get all users
    const users = await db.User.findAll({
      attributes: ['walletAddress', 'email', 'role', 'profileData', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Found ${users.length} users in database:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email}`);
      console.log(`   Wallet: ${user.walletAddress}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
      
      // Check profileData structure
      let profileData = user.profileData;
      if (typeof profileData === 'string') {
        try {
          profileData = JSON.parse(profileData);
        } catch (e) {
          console.log(`   ❌ ProfileData parsing error: ${e.message}`);
          profileData = {};
        }
      }
      
      console.log(`   ProfileData type: ${typeof user.profileData}`);
      console.log(`   Has password: ${!!profileData?.password}`);
      
      if (profileData?.password) {
        console.log(`   Password length: ${profileData.password.length}`);
        console.log(`   Password preview: ${profileData.password.substring(0, 3)}***`);
      }
      
      console.log(`   Full ProfileData:`, JSON.stringify(profileData, null, 2));
      console.log('   ---');
    });

    // Test login for each user with email/password
    console.log('\n🧪 Testing login for users with passwords...\n');
    
    for (const user of users) {
      let profileData = user.profileData;
      if (typeof profileData === 'string') {
        try {
          profileData = JSON.parse(profileData);
        } catch (e) {
          profileData = {};
        }
      }
      
      if (profileData?.password) {
        console.log(`Testing login for: ${user.email}`);
        
        // Simulate the login logic from authController
        const storedPassword = profileData.password;
        const testPassword = storedPassword; // Use the same password
        
        console.log(`   Stored password: "${storedPassword}"`);
        console.log(`   Test password: "${testPassword}"`);
        console.log(`   Passwords match: ${storedPassword === testPassword}`);
        console.log(`   Password comparison: "${storedPassword}" === "${testPassword}"`);
        console.log('   ---');
      }
    }

  } catch (error) {
    console.error('❌ Error debugging user passwords:', error);
  } finally {
    await db.sequelize.close();
  }
};

debugUserPasswords();