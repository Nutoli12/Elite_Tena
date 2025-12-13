import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  let client;
  
  try {
    client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('📊 Connected to database');
    
    // Check appointments table schema
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'appointments'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Appointments table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if requiresConsent column exists
    const consentColumn = result.rows.find(row => row.column_name === 'requiresConsent' || row.column_name === 'requires_consent');
    if (consentColumn) {
      console.log('\n✅ requiresConsent column exists');
    } else {
      console.log('\n❌ requiresConsent column does NOT exist');
    }
    
    // Check if workflowState column exists
    const workflowColumn = result.rows.find(row => row.column_name === 'workflowState' || row.column_name === 'workflow_state');
    if (workflowColumn) {
      console.log('✅ workflowState column exists');
    } else {
      console.log('❌ workflowState column does NOT exist');
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

checkSchema();