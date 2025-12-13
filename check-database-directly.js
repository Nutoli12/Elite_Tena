/**
 * Direct Database Check
 * Check appointments directly in the database
 */

async function checkDatabase() {
  console.log('🗄️  DIRECT DATABASE CHECK');
  console.log('=' .repeat(40));

  try {
    const { Client } = require('pg');
    const config = require('./server/config/config.json');
    
    const client = new Client({
      host: config.development.host,
      port: config.development.port,
      database: config.development.database,
      username: config.development.username,
      password: config.development.password
    });

    await client.connect();
    console.log('✅ Connected to database');

    // Check table structure
    console.log('\n1. Checking table structure...');
    const structure = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      AND column_name LIKE '%wallet%'
      ORDER BY column_name;
    `);
    
    console.log('Wallet columns found:');
    structure.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });

    // Count total appointments
    console.log('\n2. Counting appointments...');
    const count = await client.query('SELECT COUNT(*) as total FROM appointments;');
    console.log(`Total appointments: ${count.rows[0].total}`);

    // Show sample data
    if (count.rows[0].total > 0) {
      console.log('\n3. Sample appointments:');
      const sample = await client.query(`
        SELECT 
          id,
          "patientWalletAddress",
          "doctorWalletAddress", 
          "appointmentDate",
          status,
          "createdAt"
        FROM appointments 
        ORDER BY "createdAt" DESC 
        LIMIT 5;
      `);

      sample.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}`);
        console.log(`      Patient: ${row.patientWalletAddress}`);
        console.log(`      Doctor: ${row.doctorWalletAddress}`);
        console.log(`      Date: ${row.appointmentDate}`);
        console.log(`      Status: ${row.status}`);
        console.log('');
      });
    }

    // Check for specific wallet (replace with your wallet)
    const testWallet = '0x742d35Cc6634C0532925a3b8D0C9964E5Bd4f071';
    console.log(`4. Checking for wallet: ${testWallet}`);
    
    const walletCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE LOWER("patientWalletAddress") = LOWER($1) 
         OR LOWER("doctorWalletAddress") = LOWER($1);
    `, [testWallet]);
    
    console.log(`Appointments for this wallet: ${walletCheck.rows[0].count}`);

    await client.end();
    console.log('\n🎯 Database check complete!');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('💡 Install pg module: npm install pg');
    }
  }
}

// Run the check
checkDatabase();