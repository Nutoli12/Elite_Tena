import db from './server/src/models/index.js';

async function checkExistingLabTables() {
  try {
    console.log('🔍 Checking existing lab-related tables...\n');

    // Check if lab_results table exists
    try {
      const [results] = await db.sequelize.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'lab_results'
        ORDER BY ordinal_position;
      `);
      
      if (results.length > 0) {
        console.log('📋 Existing lab_results table structure:');
        results.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      } else {
        console.log('❌ No lab_results table found');
      }
    } catch (error) {
      console.log('❌ Error checking lab_results table:', error.message);
    }

    // Check other lab tables
    const labTables = ['lab_orders', 'lab_test_catalog', 'lab_access_logs'];
    
    for (const tableName of labTables) {
      try {
        const [results] = await db.sequelize.query(`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_name = '${tableName}';
        `);
        
        if (results[0].count > 0) {
          console.log(`✅ Table '${tableName}' exists`);
        } else {
          console.log(`❌ Table '${tableName}' does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking ${tableName}:`, error.message);
      }
    }

    // Check users table structure (for wallet address reference)
    try {
      const [results] = await db.sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('id', 'walletAddress', 'wallet_address')
        ORDER BY ordinal_position;
      `);
      
      console.log('\n👤 Users table relevant columns:');
      results.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } catch (error) {
      console.log('❌ Error checking users table:', error.message);
    }

    process.exit(0);

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

checkExistingLabTables();