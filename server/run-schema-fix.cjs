const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSchemaFix() {
  console.log('🔧 Fixing appointment consent schema...');

  try {
    const fixPath = path.join(__dirname, 'fix-appointment-consent-schema.sql');
    const fixSQL = fs.readFileSync(fixPath, 'utf8');

    const dbConfig = {
      host: 'localhost',
      port: 5432,
      database: 'elitetena',
      user: 'admin',
      password: 'password'
    };

    const client = new Client(dbConfig);
    await client.connect();

    console.log('🚀 Executing schema fix...');
    await client.query(fixSQL);
    console.log('✅ Schema fix completed successfully');

    await client.end();
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
  }
}

runSchemaFix().catch(console.error);