#!/usr/bin/env node

/**
 * Enhanced Two-Tier Pricing System Migration Runner
 * 
 * This script runs the enhanced database schema migration for the two-tier pricing system.
 * It creates all necessary tables, indexes, and initial data for the auto-approval logic.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const MIGRATION_FILE = './migrations/create-enhanced-two-tier-pricing-schema-postgres.sql';

async function runMigration() {
  let client;
  
  try {
    console.log('🚀 Starting Enhanced Two-Tier Pricing System Migration...');
    
    // Create database connection
    client = new Client({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'elite_tena',
      port: process.env.DB_PORT || 5432
    });

    await client.connect();

    console.log('✅ Database connection established');

    // Read migration file
    if (!fs.existsSync(MIGRATION_FILE)) {
      throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
    }

    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    console.log('📄 Migration file loaded');

    // Execute migration
    console.log('⚡ Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'doctor_service_fees_enhanced',
        'enhanced_payment_transactions',
        'pricing_audit_log',
        'market_rate_analytics',
        'doctor_wallet_config',
        'enhanced_system_config'
      )
    `);

    const tables = tablesResult.rows;

    console.log('📊 Created tables:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Initialize default system configuration
    console.log('⚙️  Initializing system configuration...');
    
    // Check if we have any doctors to migrate
    const doctorsResult = await client.query(`
      SELECT COUNT(*) as doctor_count 
      FROM users 
      WHERE role = 'doctor'
    `);

    console.log(`👨‍⚕️ Found ${doctorsResult.rows[0].doctor_count} doctors in system`);

    // Initialize default pricing for existing doctors
    if (parseInt(doctorsResult.rows[0].doctor_count) > 0) {
      await client.query(`
        INSERT INTO doctor_service_fees_enhanced (
          doctor_id, service_type, fee_amount, fee_set_by, is_auto_approve, is_active
        )
        SELECT 
          id as doctor_id,
          'in_person' as service_type,
          400.00 as fee_amount,
          'admin' as fee_set_by,
          false as is_auto_approve,
          true as is_active
        FROM users 
        WHERE role = 'doctor'
        ON CONFLICT (doctor_id, service_type) DO NOTHING
      `);

      console.log('💰 Default in-person pricing (400 ETB) set for all doctors');
    }

    // Create initial market rate analytics if we have premium pricing
    const premiumFeesResult = await client.query(`
      SELECT COUNT(*) as premium_count 
      FROM doctor_service_fees_enhanced 
      WHERE service_type IN ('video_call', 'chat') 
      AND fee_set_by = 'doctor'
    `);

    if (parseInt(premiumFeesResult.rows[0].premium_count) > 0) {
      console.log('📈 Calculating initial market rates...');
      
      // This would normally be done by the MarketRateAnalytics.calculateAndStore() method
      // For now, we'll just log that it should be done
      console.log('ℹ️  Run market rate calculation after system startup');
    }

    console.log('\n🎉 Enhanced Two-Tier Pricing System Migration Complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Restart your application server');
    console.log('   2. Initialize enhanced models in your application');
    console.log('   3. Configure doctor wallet settings');
    console.log('   4. Run initial market rate calculations');
    console.log('   5. Test auto-approval logic with sample transactions');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   - Check database connection settings in .env file');
    console.error('   - Ensure database exists and user has proper permissions');
    console.error('   - Verify migration file exists and is readable');
    console.error('   - Check for any conflicting table names');
    
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };