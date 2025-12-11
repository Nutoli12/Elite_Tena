/**
 * Fix Frontend User Display - Update all places where user names are displayed
 */

import fs from 'fs';
import path from 'path';

const fixFrontendUserDisplay = () => {
  try {
    console.log('🔧 Fixing frontend user name display issues...\n');

    const fixes = [
      {
        file: 'frontend/src/pages/Dashboard.tsx',
        old: `{t('welcome')}, {user?.fullName || 'User'}!`,
        new: `{t('welcome')}, {user?.fullName || user?.profileData?.name || (user?.profileData?.firstName && user?.profileData?.lastName ? \`\${user.profileData.firstName} \${user.profileData.lastName}\` : 'User')}!`
      },
      {
        file: 'frontend/src/pages/Payments.tsx',
        old: `lastName: user?.fullName?.split(' ')[1] || 'User',`,
        new: `lastName: user?.fullName?.split(' ')[1] || user?.profileData?.lastName || 'User',`
      },
      {
        file: 'frontend/src/pages/Messages.tsx',
        old: `otherUserName={selectedConversation.profileData?.fullName || selectedConversation.email || 'User'}`,
        new: `otherUserName={selectedConversation.profileData?.fullName || selectedConversation.profileData?.name || (selectedConversation.profileData?.firstName && selectedConversation.profileData?.lastName ? \`\${selectedConversation.profileData.firstName} \${selectedConversation.profileData.lastName}\` : selectedConversation.email || 'User')}`
      }
    ];

    let totalFixes = 0;

    for (const fix of fixes) {
      if (fs.existsSync(fix.file)) {
        let content = fs.readFileSync(fix.file, 'utf8');
        
        if (content.includes(fix.old)) {
          content = content.replace(fix.old, fix.new);
          fs.writeFileSync(fix.file, content);
          console.log(`✅ Fixed: ${path.basename(fix.file)}`);
          totalFixes++;
        } else {
          console.log(`ℹ️  Skipped: ${path.basename(fix.file)} (already fixed or pattern not found)`);
        }
      } else {
        console.log(`⚠️  File not found: ${fix.file}`);
      }
    }

    console.log(`\n✅ Applied ${totalFixes} fixes to frontend user display`);
    console.log('\n📋 Summary of fixes:');
    console.log('   - Dashboard welcome message now shows proper names');
    console.log('   - Payment forms use correct lastName extraction');
    console.log('   - Messages show proper user names in conversations');
    console.log('\n🔄 Please refresh your browser to see the changes');

  } catch (error) {
    console.error('❌ Error fixing frontend display:', error.message);
  }
};

fixFrontendUserDisplay();