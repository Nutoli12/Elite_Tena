const { Client } = require('pg');

async function checkSpecificPricing() {
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

    // Check for specific wallet
    const result = await client.query(`
      SELECT * FROM doctor_service_pricing 
      WHERE doctor_wallet ILIKE '%1765465194183a78fkp%'
    `);
    
    console.log('\n📋 Records for wallet 0x1765465194183a78fkp:');
    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(JSON.stringify(row, null, 2));
      });
    } else {
      console.log('No records found');
    }

    // Show all records
    const allRecords = await client.query('SELECT * FROM doctor_service_pricing');
    console.log('\n📋 All records in table:');
    allRecords.rows.forEach(row => {
      console.log(`  - ${row.doctor_wallet}: video=${row.video_call_fee}, chat=${row.chat_fee}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSpecificPricing();
