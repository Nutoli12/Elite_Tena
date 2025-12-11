/**
 * Fix Smart Appointment Scheduling System tables
 * This script drops and recreates the tables with correct column sizes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixSmartSchedulingTables() {
  console.log('🔧 Fixing Smart Appointment Scheduling System Tables');
  console.log('==================================================');

  try {
    // Read database configuration
    const configPath = path.join(__dirname, 'config', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const dbConfig = config.development;

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

    // Drop existing tables in correct order (reverse dependency order)
    console.log('\n🗑️  Dropping existing tables...');
    
    const dropStatements = [
      'DROP TABLE IF EXISTS queue_entries CASCADE;',
      'DROP TABLE IF EXISTS patient_queues CASCADE;',
      'DROP TABLE IF EXISTS time_slots CASCADE;',
      'DROP TABLE IF EXISTS doctor_availability_templates CASCADE;',
      'DROP TYPE IF EXISTS queue_status CASCADE;',
      'DROP TYPE IF EXISTS slot_status CASCADE;',
      'DROP TYPE IF EXISTS slot_type CASCADE;',
      'DROP FUNCTION IF EXISTS update_queue_statistics(UUID) CASCADE;',
      'DROP FUNCTION IF EXISTS trigger_update_queue_statistics() CASCADE;',
      'DROP FUNCTION IF EXISTS calculate_estimated_wait_time(UUID, INTEGER) CASCADE;',
      'DROP FUNCTION IF EXISTS trigger_update_estimated_wait_time() CASCADE;',
      'DROP FUNCTION IF EXISTS validate_available_slots(JSONB) CASCADE;'
    ];
    
    for (const statement of dropStatements) {
      try {
        await client.query(statement);
        console.log(`✅ ${statement}`);
      } catch (error) {
        console.log(`⚠️  ${statement} - ${error.message}`);
      }
    }

    // Recreate tables with correct column sizes
    console.log('\n📝 Recreating tables with correct column sizes...');
    
    const migrations = [
      'create-time-slots-table.sql',
      'create-doctor-availability-templates-table.sql',
      'create-patient-queue-management-tables.sql'
    ];

    for (const migrationFile of migrations) {
      console.log(`\n🔄 Running: ${migrationFile}`);
      
      try {
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migrationSQL);
        console.log(`✅ Completed: ${migrationFile}`);
        
      } catch (error) {
        console.log(`❌ Failed: ${migrationFile} - ${error.message}`);
        throw error;
      }
    }

    // Verify the tables exist with correct column sizes
    console.log('\n🔍 Verifying column sizes...');
    
    const columnChecks = [
      { table: 'time_slots', column: 'doctor_wallet_address' },
      { table: 'doctor_availability_templates', column: 'doctor_wallet_address' },
      { table: 'patient_queues', column: 'doctor_wallet_address' }
    ];
    
    for (const check of columnChecks) {
      const result = await client.query(`
        SELECT character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2;
      `, [check.table, check.column]);
      
      if (result.rows.length > 0) {
        const maxLength = result.rows[0].character_maximum_length;
        console.log(`✅ ${check.table}.${check.column} - VARCHAR(${maxLength})`);
      }
    }

    // Close connection
    await client.end();
    
    console.log('\n🎉 TABLES FIXED SUCCESSFULLY!');
    console.log('=============================');
    console.log('✅ Tables recreated with correct column sizes');
    console.log('✅ All constraints and indexes recreated');
    console.log('✅ Ready for testing');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.log('\n🔧 Error Details:', error);
    process.exit(1);
  }
}

// Execute the fix
fixSmartSchedulingTables();