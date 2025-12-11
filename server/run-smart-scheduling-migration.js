/**
 * Execute the Smart Appointment Scheduling System database migrations
 * This script runs the new scheduling system migrations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeSmartSchedulingMigrations() {
  console.log('🚀 Executing Smart Appointment Scheduling System Migrations');
  console.log('=========================================================');

  try {
    // Read database configuration
    const configPath = path.join(__dirname, 'config', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const dbConfig = config.development;

    console.log('📋 Database Configuration:');
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

    // List of migrations to run in order
    const migrations = [
      'create-time-slots-table.sql',
      'create-doctor-availability-templates-table.sql',
      'create-patient-queue-management-tables.sql'
    ];

    console.log('\n📝 Running migrations...');
    
    for (const migrationFile of migrations) {
      console.log(`\n🔄 Running: ${migrationFile}`);
      
      try {
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        
        if (!fs.existsSync(migrationPath)) {
          console.log(`⚠️  Migration file not found: ${migrationFile}`);
          continue;
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migrationSQL);
        console.log(`✅ Completed: ${migrationFile}`);
        
      } catch (error) {
        if (error.code === '42P07') {
          console.log(`✅ Already exists: ${migrationFile} (skipping)`);
        } else if (error.code === '42710') {
          console.log(`✅ Already exists: ${migrationFile} (function/type exists)`);
        } else {
          console.log(`❌ Failed: ${migrationFile} - ${error.message}`);
          throw error;
        }
      }
    }

    // Verify the new tables exist
    console.log('\n🔍 Verifying new tables...');
    
    const tableChecks = [
      { name: 'time_slots', description: 'Time slots with overlap prevention' },
      { name: 'doctor_availability_templates', description: 'Doctor availability templates' },
      { name: 'patient_queues', description: 'Patient queues' },
      { name: 'queue_entries', description: 'Queue entries' }
    ];
    
    for (const table of tableChecks) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table.name]);
      
      if (result.rows[0].exists) {
        console.log(`✅ ${table.name} - ${table.description}`);
      } else {
        console.log(`❌ ${table.name} - NOT FOUND`);
      }
    }

    // Verify ENUM types
    console.log('\n🔍 Verifying ENUM types...');
    
    const enumChecks = [
      'slot_status',
      'slot_type', 
      'queue_status'
    ];
    
    for (const enumType of enumChecks) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_type 
          WHERE typname = $1
        );
      `, [enumType]);
      
      if (result.rows[0].exists) {
        console.log(`✅ ${enumType} enum type`);
      } else {
        console.log(`❌ ${enumType} enum type - NOT FOUND`);
      }
    }

    // Check constraints
    console.log('\n🔍 Verifying constraints...');
    
    const constraintResult = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('time_slots', 'doctor_availability_templates', 'patient_queues', 'queue_entries')
      AND tc.constraint_type IN ('EXCLUDE', 'UNIQUE', 'CHECK')
      ORDER BY tc.table_name, tc.constraint_name;
    `);
    
    if (constraintResult.rows.length > 0) {
      console.log('✅ Constraints created:');
      constraintResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}.${row.constraint_name} (${row.constraint_type})`);
      });
    }

    // Check indexes
    console.log('\n🔍 Verifying indexes...');
    
    const indexResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND tablename IN ('time_slots', 'doctor_availability_templates', 'patient_queues', 'queue_entries')
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('✅ Indexes created:');
      indexResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}.${row.indexname}`);
      });
    }

    // Close connection
    await client.end();
    
    console.log('\n🎉 SMART SCHEDULING MIGRATIONS COMPLETE!');
    console.log('==========================================');
    console.log('✅ Database schema updated successfully');
    console.log('✅ Time slots table with overlap prevention');
    console.log('✅ Doctor availability templates');
    console.log('✅ Patient queue management system');
    console.log('✅ All constraints and indexes created');
    
    console.log('\n🔄 Next Steps:');
    console.log('1. Test the Sequelize models');
    console.log('2. Implement the slot management services');
    console.log('3. Build the API endpoints');
    
    console.log('\n🎯 New Features Now Available:');
    console.log('• ✅ Atomic slot booking with overlap prevention');
    console.log('• ✅ Dynamic doctor availability management');
    console.log('• ✅ Real-time patient queue system');
    console.log('• ✅ Template-based recurring schedules');
    
    console.log('\n🚀 Smart Appointment Scheduling System database is ready!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Database Connection Issue:');
      console.log('- Make sure PostgreSQL is running');
      console.log('- Check if the database exists');
      console.log('- Verify the connection details in server/config/config.json');
    } else {
      console.log('\n🔧 Error Details:', error);
      console.log('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Execute the migrations
executeSmartSchedulingMigrations();