#!/usr/bin/env node

/**
 * Lab Worksheet System Migration Runner
 * Creates the database tables for the lab worksheet workflow system
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './server/src/models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runLabWorksheetMigration() {
  try {
    console.log('🧪 Starting Lab Worksheet System Migration...');

    // Read the migration SQL file
    const migrationPath = join(__dirname, 'server/migrations/create-lab-worksheet-system.sql');
    const migrationSQL = await readFile(migrationPath, 'utf8');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          await db.sequelize.query(statement);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    // Test the new tables
    console.log('\n🔍 Testing new tables...');
    
    const worksheetCount = await db.LabWorksheet.count();
    console.log(`✅ lab_worksheets table: ${worksheetCount} records`);
    
    const sampleCount = await db.SampleCollection.count();
    console.log(`✅ sample_collections table: ${sampleCount} records`);
    
    const processingCount = await db.ProcessingRecord.count();
    console.log(`✅ processing_records table: ${processingCount} records`);

    // Test associations
    console.log('\n🔗 Testing associations...');
    const worksheets = await db.LabWorksheet.findAll({
      include: [
        {
          model: db.LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: db.User, as: 'patient' },
            { model: db.User, as: 'doctor' }
          ]
        },
        {
          model: db.User,
          as: 'technician'
        }
      ],
      limit: 1
    });

    if (worksheets.length > 0) {
      console.log('✅ Worksheet associations working correctly');
    } else {
      console.log('⚠️  No worksheets found for association testing');
    }

    console.log('\n🎉 Lab Worksheet System Migration completed successfully!');
    console.log('\n📋 New Tables Created:');
    console.log('   • lab_worksheets - Main worksheet records');
    console.log('   • sample_collections - Sample collection details');
    console.log('   • processing_records - Processing and analysis records');
    console.log('\n🔄 Workflow Steps Now Available:');
    console.log('   1. Doctor creates lab order');
    console.log('   2. Technician creates worksheet');
    console.log('   3. Sample collection recorded');
    console.log('   4. Processing started and tracked');
    console.log('   5. Results entered and validated');
    console.log('   6. Results released to doctor');
    console.log('   7. Doctor reviews and completes');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Run the migration
runLabWorksheetMigration();