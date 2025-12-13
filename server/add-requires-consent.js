import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function addRequiresConsentColumn() {
  let client;
  
  try {
    client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('📊 Connected to database');
    
    // Add requiresConsent column
    await client.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS requires_consent BOOLEAN DEFAULT true;
    `);
    
    console.log('✅ Added requires_consent column');
    
    // Add index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_requires_consent 
      ON appointments(requires_consent);
    `);
    
    console.log('✅ Added index for requires_consent');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      AND column_name = 'requires_consent';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ requires_consent column verified');
    } else {
      console.log('❌ requires_consent column not found');
    }
    
  } catch (error) {
    console.error('❌ Failed to add column:', error.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

addRequiresConsentColumn();