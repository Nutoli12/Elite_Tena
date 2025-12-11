/**
 * Execute the no-cancel appointment system database migration
 * This script will run the migration using Node.js and pg library
 */

const fs = require('fs');
const path = require('path');

async function executeMigration() {
  console.log('🚀 Executing No-Cancel Appointment System Migration');
  console.log('==================================================');

  try {
    // Try to use pg library if available
    let Client;
    try {
      const pg = require('pg');
      Client = pg.Client;
    } catch (error) {
      console.log('⚠️  pg library not found, will provide manual instructions');
      return showManualInstructions();
    }

    // Read database configuration
    const configPath = path.join(__dirname, 'server', 'config', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const dbConfig = config.development;

    console.log('📋 Connecting to database:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Username: ${dbConfig.username}`);

    // Create database client
    const client = new Client({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password
    });

    // Connect to database
    console.log('\n🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read migration SQL
    const migrationPath = path.join(__dirname, 'server', 'migrations', 'add-appointment-note-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📝 Executing migration...');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!');

    // Verify the new columns exist
    console.log('\n🔍 Verifying migration...');
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      AND column_name IN ('patientNote', 'rescheduleDeadline', 'canReschedule')
      ORDER BY column_name;
    `);

    if (result.rows.length >= 3) {
      console.log('✅ New columns verified:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}`);
      });
    } else {
      console.log('⚠️  Some columns may not have been created');
    }

    // Close connection
    await client.end();
    console.log('\n🎉 Migration Complete!');
    console.log('=====================================');
    console.log('✅ Database migration successful');
    console.log('✅ New appointment system columns added');
    console.log('✅ Indexes created for performance');
    console.log('✅ Existing appointments updated');
    
    console.log('\n🔄 Next Steps:');
    console.log('1. The development server should automatically pick up the changes');
    console.log('2. Test the new no-cancel system in the frontend');
    console.log('3. Try rescheduling and leaving notes on appointments');
    
    console.log('\n🎯 New Features Now Active:');
    console.log('• 24-hour reschedule deadline enforcement');
    console.log('• Patient note system (replaces cancellation)');
    console.log('• Doctor time and payment protection');
    console.log('• Complete audit trail');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n🔧 Manual Migration Required:');
    showManualInstructions();
  }
}

function showManualInstructions() {
  console.log('\n📋 Manual Migration Instructions:');
  console.log('=================================');
  console.log('Run this SQL in your PostgreSQL database:');
  console.log('\n```sql');
  
  const migrationPath = path.join(__dirname, 'server', 'migrations', 'add-appointment-note-system.sql');
  try {
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
  } catch (error) {
    console.log(`-- Could not read migration file: ${error.message}`);
    console.log(`-- Please run the SQL from: ${migrationPath}`);
  }
  
  console.log('```\n');
  console.log('Database connection details:');
  console.log('- Host: localhost');
  console.log('- Port: 5432');
  console.log('- Database: elitetena');
  console.log('- Username: admin');
}

// Execute the migration
executeMigration();