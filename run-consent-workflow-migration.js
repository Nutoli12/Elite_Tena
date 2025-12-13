const fs = require('fs');
const { Client } = require('pg');

console.log('🔄 Running consent workflow state migration...');

async function runMigration() {
  let client;
  
  try {
    // Read migration SQL
    const migrationSQL = fs.readFileSync('./server/migrations/add-consent-workflow-state.sql', 'utf8');
    
    // Read database config
    const config = require('./server/config/config.json');
    
    client = new Client({
      host: config.development.host,
      port: config.development.port,
      database: config.development.database,
      username: config.development.username,
      password: config.development.password
    });
    
    await client.connect();
    console.log('📊 Connected to database');
    
    // Execute migration
    await client.query(migrationSQL);
    console.log('✅ Consent workflow state migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

runMigration();