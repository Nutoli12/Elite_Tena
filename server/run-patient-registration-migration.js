#!/usr/bin/env node

/**
 * Run patient registration enhancement migration
 */

import { Sequelize } from 'sequelize';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load database configuration
const configPath = join(__dirname, 'config/config.json');
const configData = await readFile(configPath, 'utf8');
const dbConfig = JSON.parse(configData);

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Initialize Sequelize
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const runMigration = async () => {
  console.log('🔧 ========== RUNNING PATIENT REGISTRATION MIGRATION ==========');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Read migration SQL
    const migrationPath = join(__dirname, 'migrations/enhance-patient-registration-fields.sql');
    const migrationSQL = await readFile(migrationPath, 'utf8');

    // Execute migration
    console.log('📝 Executing migration...');
    await sequelize.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');

    // Verify the changes
    console.log('\n🔍 Verifying migration...');
    const tableInfo = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'patients'
      AND column_name IN ('gender', 'phone', 'location', 'preferences', 'registration_date', 'registration_method')
      ORDER BY column_name;
    `, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log('📋 New patient table columns:');
    tableInfo.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✅ Patient registration migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });