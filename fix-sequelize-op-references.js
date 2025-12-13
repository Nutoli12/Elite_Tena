/**
 * Fix Sequelize.Op References
 * Replace all remaining db.Sequelize.Op references with Sequelize.Op
 */

const fs = require('fs');
const path = require('path');

function fixSequelizeReferences() {
  console.log('🔧 FIXING SEQUELIZE.OP REFERENCES');
  console.log('=' .repeat(50));

  const filesToFix = [
    'server/middleware/requireConsentForConsultation.js',
    'server/src/controllers/appointmentController.js',
    'server/src/controllers/videoCallController.js',
    'server/src/controllers/chatController.js'
  ];

  filesToFix.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        console.log(`🔍 Fixing ${filePath}...`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Count occurrences before
        const beforeCount = (content.match(/db\.Sequelize\.Op/g) || []).length;
        
        // Replace all db.Sequelize.Op with Sequelize.Op
        content = content.replace(/db\.Sequelize\.Op/g, 'Sequelize.Op');
        
        // Count occurrences after
        const afterCount = (content.match(/db\.Sequelize\.Op/g) || []).length;
        
        // Write back to file
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`✅ Fixed ${beforeCount} references in ${filePath}`);
        if (afterCount > 0) {
          console.log(`⚠️  Still ${afterCount} references remaining`);
        }
      } else {
        console.log(`❌ File not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  });

  console.log('\n🎯 Sequelize.Op references fix complete!');
  console.log('Please restart the server to apply changes.');
}

// Run the fix
fixSequelizeReferences();