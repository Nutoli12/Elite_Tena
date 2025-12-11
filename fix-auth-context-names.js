/**
 * Fix AuthContext Names - Update all fullName extractions
 */

import fs from 'fs';

const fixAuthContextNames = () => {
  try {
    console.log('🔧 Fixing AuthContext fullName extraction...\n');

    const filePath = 'frontend/src/contexts/AuthContext.tsx';
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace all occurrences of the problematic fullName extraction
    const oldPattern = /fullName: user\.profileData\?\.fullName \|\| 'User',/g;
    const newPattern = `fullName: user.profileData?.fullName || 
                 user.profileData?.name || 
                 (user.profileData?.firstName && user.profileData?.lastName 
                   ? \`\${user.profileData.firstName} \${user.profileData.lastName}\` 
                   : 'User'),`;

    const updatedContent = content.replace(oldPattern, newPattern);

    // Count how many replacements were made
    const matches = content.match(oldPattern);
    const replacementCount = matches ? matches.length : 0;

    if (replacementCount > 0) {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ Fixed ${replacementCount} fullName extractions in AuthContext`);
      console.log('   Now properly extracts names from:');
      console.log('   - profileData.fullName (first priority)');
      console.log('   - profileData.name (second priority)');
      console.log('   - firstName + lastName (third priority)');
      console.log('   - "User" (fallback)');
    } else {
      console.log('ℹ️  No replacements needed - file already updated');
    }

  } catch (error) {
    console.error('❌ Error fixing AuthContext:', error.message);
  }
};

fixAuthContextNames();