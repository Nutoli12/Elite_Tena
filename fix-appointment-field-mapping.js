/**
 * Fix Appointment Field Mapping Issue
 * The model maps to 'patientWallet' and 'doctorWallet' but controller uses 'patientWalletAddress'
 */

const { createRequire } = require('module');
const require = createRequire(import.meta.url);

async function fixFieldMapping() {
  console.log('🔧 FIXING APPOINTMENT FIELD MAPPING ISSUE');
  console.log('=' .repeat(60));

  try {
    // Import database connection
    const { Client } = require('pg');
    const config = require('./server/config/config.json');
    
    const client = new Client({
      host: config.development.host,
      port: config.development.port,
      database: config.development.database,
      username: config.development.username,
      password: config.development.password
    });

    await client.connect();
    console.log('✅ Connected to database\n');

    // Check actual column names in appointments table
    console.log('📋 Checking actual column names in appointments table...');
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      AND column_name LIKE '%wallet%'
      ORDER BY column_name;
    `);

    console.log('✅ Wallet-related columns found:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}`);
    });

    // Check if we have data with either field name
    console.log('\n📊 Checking data in appointments table...');
    
    // Try both possible field names
    const fieldChecks = [
      { name: 'patientWallet', query: 'SELECT COUNT(*) as count FROM appointments WHERE "patientWallet" IS NOT NULL;' },
      { name: 'patientWalletAddress', query: 'SELECT COUNT(*) as count FROM appointments WHERE "patientWalletAddress" IS NOT NULL;' },
      { name: 'doctorWallet', query: 'SELECT COUNT(*) as count FROM appointments WHERE "doctorWallet" IS NOT NULL;' },
      { name: 'doctorWalletAddress', query: 'SELECT COUNT(*) as count FROM appointments WHERE "doctorWalletAddress" IS NOT NULL;' }
    ];

    for (const check of fieldChecks) {
      try {
        const result = await client.query(check.query);
        console.log(`✅ ${check.name}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`❌ ${check.name}: Column does not exist`);
      }
    }

    // Sample data check
    console.log('\n📋 Sample appointment data:');
    try {
      const sample = await client.query('SELECT * FROM appointments LIMIT 1;');
      if (sample.rows.length > 0) {
        console.log('✅ Sample appointment structure:');
        Object.keys(sample.rows[0]).forEach(key => {
          if (key.toLowerCase().includes('wallet')) {
            console.log(`   ${key}: ${sample.rows[0][key]}`);
          }
        });
      } else {
        console.log('❌ No appointments found to sample');
      }
    } catch (error) {
      console.log('❌ Error sampling data:', error.message);
    }

    await client.end();
    console.log('\n🎯 FIELD MAPPING CHECK COMPLETE');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Field mapping check failed:', error.message);
  }
}

// Run the check
fixFieldMapping();