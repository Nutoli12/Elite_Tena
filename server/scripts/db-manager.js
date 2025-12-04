import sequelize from '../src/config/db.js';
import { User, Session, FileMetadata, Appointment } from '../src/models/index.js';

class DatabaseManager {
  static async showAllTables() {
    try {
      console.log('Ì≥ä DATABASE TABLES OVERVIEW\n');
      
      const [tables] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);
      
      for (const table of tables) {
        const tableName = table.table_name;
        const [rows] = await sequelize.query(`SELECT COUNT(*) FROM "${tableName}"`);
        const count = rows[0].count;
        
        console.log(`Ì≥ã ${tableName}: ${count} records`);
        
        // Show first 2 records from each table
        if (count > 0) {
          const [data] = await sequelize.query(`SELECT * FROM "${tableName}" LIMIT 2`);
          console.log('   Sample data:');
          data.forEach((row, index) => {
            const simplified = {};
            Object.keys(row).forEach(key => {
              if (typeof row[key] === 'string' && row[key].length > 30) {
                simplified[key] = row[key].substring(0, 30) + '...';
              } else {
                simplified[key] = row[key];
              }
            });
            console.log(`   ${index + 1}.`, simplified);
          });
        }
        console.log('');
      }
      
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  static async showTableDetails(tableName) {
    try {
      const [data] = await sequelize.query(`SELECT * FROM "${tableName}"`);
      console.log(`\nÌ≥ã ${tableName} - ${data.length} records:\n`);
      
      if (data.length > 0) {
        // Create a simplified view for console
        const simplifiedData = data.map(row => {
          const simple = {};
          Object.keys(row).forEach(key => {
            if (typeof row[key] === 'string' && row[key].length > 50) {
              simple[key] = row[key].substring(0, 50) + '...';
            } else if (row[key] instanceof Date) {
              simple[key] = row[key].toISOString();
            } else {
              simple[key] = row[key];
            }
          });
          return simple;
        });
        
        console.table(simplifiedData);
      } else {
        console.log('   No records found');
      }
      
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  static async createSampleData() {
    try {
      console.log('ÌæØ CREATING SAMPLE DATA...\n');
      
      // Create sample user
      const user = await User.create({
        walletAddress: '0xSampleWallet_' + Date.now(),
        role: 'patient',
        email: 'sample' + Date.now() + '@elitetena.com',
        specialization: null
      });
      console.log('‚úÖ Sample user created:', user.walletAddress);
      
      // Create sample session
      const session = await Session.create({
        walletAddress: user.walletAddress,
        tokenHash: 'sample_token_' + Date.now(),
        role: user.role,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      console.log('‚úÖ Sample session created');
      
      // Create sample file
      const file = await FileMetadata.create({
        cid: 'QmSampleFile_' + Date.now(),
        walletAddress: user.walletAddress,
        originalFilename: 'sample_medical_report.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        description: 'Sample medical report for testing'
      });
      console.log('‚úÖ Sample file created:', file.originalFilename);
      
      console.log('\nÌæâ SAMPLE DATA CREATED SUCCESSFULLY!');
      
    } catch (error) {
      console.error('‚ùå Error creating sample data:', error);
    }
  }
}

// Run based on command line argument
const command = process.argv[2];

async function main() {
  switch (command) {
    case 'tables':
      await DatabaseManager.showAllTables();
      break;
    case 'users':
      await DatabaseManager.showTableDetails('users');
      break;
    case 'sessions':
      await DatabaseManager.showTableDetails('sessions');
      break;
    case 'files':
      await DatabaseManager.showTableDetails('file_metadata');
      break;
    case 'appointments':
      await DatabaseManager.showTableDetails('appointments');
      break;
    case 'create-sample':
      await DatabaseManager.createSampleData();
      break;
    default:
      console.log(`
Ì∫Ä ELITE TENA DATABASE MANAGER

Usage:
  node scripts/db-manager.js [command]

Commands:
  tables        - Show all tables and record counts
  users         - Show users table
  sessions      - Show sessions table  
  files         - Show file_metadata table
  appointments  - Show appointments table
  create-sample - Create sample test data

Examples:
  node scripts/db-manager.js tables
  node scripts/db-manager.js users
  node scripts/db-manager.js create-sample
      `);
  }
  
  await sequelize.close();
}

main().catch(console.error);
