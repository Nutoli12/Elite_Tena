const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'elitetena',
  password: 'password',
  port: 5432,
});

async function checkDatabaseSchema() {
  console.log('🔍 CHECKING DATABASE SCHEMA');
  console.log('============================');
  
  try {
    // Check medical_records table
    console.log('\n📋 MEDICAL RECORDS TABLE:');
    const medicalRecordsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'medical_records' 
      ORDER BY ordinal_position
    `);
    
    medicalRecordsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check prescriptions table
    console.log('\n💊 PRESCRIPTIONS TABLE:');
    const prescriptionsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'prescriptions' 
      ORDER BY ordinal_position
    `);
    
    prescriptionsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check appointments table
    console.log('\n📅 APPOINTMENTS TABLE:');
    const appointmentsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position
    `);
    
    appointmentsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check consents table
    console.log('\n✋ CONSENTS TABLE:');
    const consentsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'consents' 
      ORDER BY ordinal_position
    `);
    
    consentsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check sample data
    console.log('\n📊 SAMPLE DATA ANALYSIS:');
    
    const medicalRecordsCount = await pool.query('SELECT COUNT(*) FROM medical_records');
    console.log(`📋 Medical Records: ${medicalRecordsCount.rows[0].count} total`);
    
    const prescriptionsCount = await pool.query('SELECT COUNT(*) FROM prescriptions');
    console.log(`💊 Prescriptions: ${prescriptionsCount.rows[0].count} total`);
    
    const appointmentsCount = await pool.query('SELECT COUNT(*) FROM appointments');
    console.log(`📅 Appointments: ${appointmentsCount.rows[0].count} total`);
    
    const consentsCount = await pool.query('SELECT COUNT(*) FROM consents');
    console.log(`✋ Consents: ${consentsCount.rows[0].count} total`);
    
    // Check blockchain status
    console.log('\n🔗 BLOCKCHAIN STATUS:');
    
    const medicalRecordsBlockchain = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "blockchainTxHash" IS NOT NULL THEN 1 END) as with_tx_hash,
        COUNT(CASE WHEN "onBlockchain" = true THEN 1 END) as on_blockchain
      FROM medical_records
    `);
    
    const mrStats = medicalRecordsBlockchain.rows[0];
    console.log(`📋 Medical Records: ${mrStats.with_tx_hash}/${mrStats.total} have tx hash, ${mrStats.on_blockchain}/${mrStats.total} on blockchain`);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseSchema();