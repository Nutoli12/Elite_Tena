import { Client } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔄 Running consent workflow state migration...');

async function runMigration() {
  let client;
  
  try {
    // Read migration SQL
    const migrationSQL = fs.readFileSync('./migrations/add-consent-workflow-state.sql', 'utf8');
    
    // Use environment variables for database connection
    client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('📊 Connected to database');
    
    // Execute migration
    await client.query(migrationSQL);
    console.log('✅ Consent workflow state migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Migration appears to have been run already');
    }
  } finally {
    if (client) {
      await client.end();
    }
  }
}

runMigration();