#!/usr/bin/env node

/**
 * Check the actual appointments table schema
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

const checkSchema = async () => {
  console.log('🔍 ========== CHECKING APPOINTMENTS TABLE SCHEMA ==========');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check appointments table schema
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      ORDER BY ordinal_position;
    `;
    
    const columns = await sequelize.query(schemaQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log('\n📋 Appointments table columns:');
    columns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });

    // Check a few sample appointments
    console.log('\n📋 Sample appointments data:');
    const sampleQuery = `SELECT * FROM appointments LIMIT 3;`;
    const samples = await sequelize.query(sampleQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    if (samples.length > 0) {
      console.log('\n📋 Sample appointment columns:');
      Object.keys(samples[0]).forEach((key, index) => {
        console.log(`   ${index + 1}. ${key}: ${samples[0][key]}`);
      });
    }

    // Check doctors table schema
    console.log('\n📋 Doctors table columns:');
    const doctorSchemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'doctors'
      ORDER BY ordinal_position;
    `;
    
    const doctorColumns = await sequelize.query(doctorSchemaQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    doctorColumns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    await sequelize.close();
  }
};

// Run the check
checkSchema()
  .then(() => {
    console.log('\n✅ Schema check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Schema check failed:', error);
    process.exit(1);
  });