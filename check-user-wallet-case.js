/**
 * Check if the User wallet address case is causing the issue
 */

import db from './server/src/models/index.js';
const { User } = db;

async function checkUserWalletCase() {
  console.log('🔍 ========== CHECKING USER WALLET CASE ==========');
  
  try {
    const targetWallet = '0x1764380165137m5p9l8';
    
    console.log('\n📝 Looking for user with wallet:', targetWallet);
    
    // Try exact match
    const exactUser = await User.findOne({
      where: { walletAddress: targetWallet },
      attributes: ['walletAddress', 'email', 'profileData', 'role']
    });
    
    console.log('🔍 Exact match result:', exactUser ? 'FOUND' : 'NOT FOUND');
    
    if (exactUser) {
      console.log('✅ User found:', {
        wallet: exactUser.walletAddress,
        email: exactUser.email,
        profileData: exactUser.profileData,
        role: exactUser.role
      });
    } else {
      // Try case-insensitive search
      console.log('\n📝 Trying case-insensitive search...');
      
      const { Op } = await import('sequelize');
      const caseInsensitiveUser = await User.findOne({
        where: { 
          walletAddress: {
            [Op.iLike]: targetWallet
          }
        },
        attributes: ['walletAddress', 'email', 'profileData', 'role']
      });
      
      console.log('🔍 Case-insensitive result:', caseInsensitiveUser ? 'FOUND' : 'NOT FOUND');
      
      if (caseInsensitiveUser) {
        console.log('✅ User found with different case:', {
          storedWallet: caseInsensitiveUser.walletAddress,
          targetWallet: targetWallet,
          email: caseInsensitiveUser.email,
          profileData: caseInsensitiveUser.profileData
        });
      } else {
        // Search for similar wallets
        console.log('\n📝 Searching for similar wallets...');
        
        const similarUsers = await User.findAll({
          where: {
            walletAddress: {
              [Op.like]: '%1764380165137%'
            }
          },
          attributes: ['walletAddress', 'email', 'profileData', 'role'],
          limit: 5
        });
        
        console.log(`🔍 Found ${similarUsers.length} similar wallets:`);
        similarUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.walletAddress} (${user.email})`);
        });
      }
    }
    
    // Also check all users with names in profileData
    console.log('\n📝 Checking all users with names...');
    
    const usersWithNames = await User.findAll({
      where: {
        profileData: {
          name: {
            [Op.ne]: null
          }
        }
      },
      attributes: ['walletAddress', 'email', 'profileData', 'role'],
      limit: 10
    });
    
    console.log(`📋 Found ${usersWithNames.length} users with names:`);
    usersWithNames.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.walletAddress} - ${user.profileData?.name} (${user.email})`);
    });
    
    console.log('\n🎉 ========== WALLET CASE CHECK COMPLETE ==========');
    
  } catch (error) {
    console.error('❌ Error checking wallet case:', error);
  } finally {
    await db.sequelize.close();
  }
}

checkUserWalletCase();