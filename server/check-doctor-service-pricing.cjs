const { Client } = require('pg');

async function checkDoctorServicePricing() {
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

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'doctor_service_pricing'
      );
    `);
    console.log('\n📋 Table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Get table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'doctor_service_pricing'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Table columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Check for existing records
      const records = await client.query('SELECT * FROM doctor_service_pricing LIMIT 5');
      console.log('\n📋 Existing records:', records.rows.length);
      if (records.rows.length > 0) {
        console.log('Sample record:', JSON.stringify(records.rows[0], null, 2));
      }
    } else {
      console.log('\n⚠️ Table does not exist - need to create it');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDoctorServicePricing();
