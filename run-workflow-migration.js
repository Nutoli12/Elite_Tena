/**
 * Run Appointment Workflow Migration
 * Adds workflow state tracking to appointments table
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

async function runWorkflowMigration() {
  try {
    console.log('🔄 Running appointment workflow migration...');
    
    // Get database URL from server/.env
    const envPath = path.join('server', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1];
    
    if (!dbUrl) {
      console.log('❌ DATABASE_URL not found in server/.env');
      process.exit(1);
    }
    
    console.log('📊 Executing SQL migration...');
    
    // Run the migration
    const migrationPath = path.join('server', 'migrations', 'add-appointment-workflow-fields.sql');
    const command = `psql "${dbUrl}" -f "${migrationPath}"`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ Appointment workflow migration completed successfully!');
    console.log('🎉 Your system now supports complete appointment workflows!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Make sure PostgreSQL is running and accessible');
    process.exit(1);
  }
}

// Run the migration
runWorkflowMigration();