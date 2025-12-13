const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'elitetena',
    user: 'admin',
    password: 'password'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Read and execute migration
    const migrationPath = path.join(__dirname, 'migrations', 'add-payment-settings-columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Running migration...');
    const result = await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Show current columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'doctor_payment_settings'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current columns in doctor_payment_settings:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from PostgreSQL');
  }
}

runMigration();
