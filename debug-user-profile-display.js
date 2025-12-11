/**
 * Debug User Profile Display - Check what data is being returned vs displayed
 */

import db from './server/src/models/index.js';

const debugUserProfileDisplay = async () => {
  try {
    console.log('🔍 Debugging user profile display issue...\n');

    const testEmails = [
      'nutirese@gmail.com',
      'drabinetengida@gmail.com', 
      'semiryusuf@gmail.com',
      'semir@gmail.com'
    ];

    for (const email of testEmails) {
      console.log(`\n📧 Analyzing: ${email}`);
      console.log('='.repeat(50));
      
      const user = await db.User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        console.log('❌ User not found');
        continue;
      }

      console.log('🗄️  Database Data:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Wallet: ${user.walletAddress}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Name field: ${user.name || 'NULL'}`);
      
      // Check profileData structure
      let profileData = user.profileData;
      if (typeof profileData === 'string') {
        try {
          profileData = JSON.parse(profileData);
        } catch (e) {
          profileData = {};
        }
      }
      
      console.log('\n📋 ProfileData Contents:');
      console.log(`   Type: ${typeof user.profileData}`);
      console.log(`   Full ProfileData:`, JSON.stringify(profileData, null, 2));
      
      // Check what should be displayed as fullName
      const possibleNames = {
        'profileData.fullName': profileData?.fullName,
        'profileData.name': profileData?.name,
        'user.name': user.name,
        'firstName + lastName': profileData?.firstName && profileData?.lastName 
          ? `${profileData.firstName} ${profileData.lastName}` 
          : null
      };
      
      console.log('\n👤 Name Resolution Options:');
      Object.entries(possibleNames).forEach(([source, value]) => {
        console.log(`   ${source}: "${value || 'NULL'}"`);
      });
      
      // What the frontend should display
      const displayName = profileData?.fullName || 
                         profileData?.name || 
                         user.name || 
                         (profileData?.firstName && profileData?.lastName 
                           ? `${profileData.firstName} ${profileData.lastName}` 
                           : 'User');
      
      console.log(`\n✅ Should Display: "${displayName}"`);
    }

    // Test API response format
    console.log('\n\n🌐 Testing API Response Format...');
    console.log('='.repeat(50));
    
    const axios = (await import('axios')).default;
    const baseURL = 'http://localhost:3004/api';
    
    const testUser = { email: 'nutirese@gmail.com', password: '123456' };
    
    try {
      const response = await axios.post(`${baseURL}/auth/login`, testUser);
      
      if (response.data.success) {
        console.log('📤 API Login Response:');
        console.log(JSON.stringify(response.data.data.user, null, 2));
        
        const user = response.data.data.user;
        console.log('\n🔍 Frontend Should Show:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Wallet: ${user.walletAddress}`);
        
        // Check what fullName the frontend gets
        const profileData = typeof user.profileData === 'string' 
          ? JSON.parse(user.profileData) 
          : user.profileData;
          
        const frontendName = profileData?.fullName || 
                           profileData?.name || 
                           user.name || 
                           'User';
                           
        console.log(`   Display Name: "${frontendName}"`);
        
        if (frontendName === 'User') {
          console.log('\n❌ PROBLEM IDENTIFIED:');
          console.log('   The user has no proper name fields set!');
          console.log('   ProfileData:', JSON.stringify(profileData, null, 2));
        }
      }
    } catch (error) {
      console.log('❌ API Error:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error debugging profile display:', error);
  } finally {
    await db.sequelize.close();
  }
};

debugUserProfileDisplay();