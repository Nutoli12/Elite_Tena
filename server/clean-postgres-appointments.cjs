/**
 * Clean PostgreSQL Appointments - Remove all appointments from PostgreSQL database
 */

const { Client } = require('pg');

const dbConfig = {
  user: 'admin',
  password: 'password',
  database: 'elitetena',
  host: 'localhost',
  port: 5432
};

async function cleanPostgresAppointments() {
  console.log('🧹 Cleaning PostgreSQL Appointments...\n');

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Step 1: Check what appointment tables exist
    console.log('\n📋 Step 1: Finding appointment tables...');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%appointment%'
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const appointmentTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('Found appointment tables:', appointmentTables);

    if (appointmentTables.length === 0) {
      console.log('✨ No appointment tables found');
      return;
    }

    // Step 2: Count and delete from each table
    let totalDeleted = 0;
    
    for (const tableName of appointmentTables) {
      console.log(`\n🗑️ Processing table: ${tableName}`);
      
      // Count records
      const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
      const countResult = await client.query(countQuery);
      const count = parseInt(countResult.rows[0].count);
      
      console.log(`   Records before: ${count}`);
      
      if (count === 0) {
        console.log(`   ✅ ${tableName} already clean`);
        continue;
      }
      
      // Delete all records
      const deleteQuery = `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`;
      const deleteResult = await client.query(deleteQuery);
      
      console.log(`   ✅ Truncated ${tableName} (deleted ${count} records)`);
      totalDeleted += count;
    }

    // Step 3: Final verification
    console.log('\n🔍 Step 3: Final verification...');
    
    let finalTotal = 0;
    for (const tableName of appointmentTables) {
      const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
      const countResult = await client.query(countQuery);
      const count = parseInt(countResult.rows[0].count);
      finalTotal += count;
      console.log(`   ${tableName}: ${count} records`);
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Tables processed: ${appointmentTables.length}`);
    console.log(`   Total records deleted: ${totalDeleted}`);
    console.log(`   Final total records: ${finalTotal}`);

    if (finalTotal === 0) {
      console.log('\n🎉 SUCCESS: All appointment tables are clean!');
      console.log('✨ PostgreSQL database is ready for fresh testing');
      console.log('\n🚀 Ready for Chapa payment integration testing:');
      console.log('   • All old appointments cleared');
      console.log('   • Clean slate for new bookings');
      console.log('   • Real payment flow ready to test');
      console.log('   • No interference from old test data');
    } else {
      console.log('\n⚠️ WARNING: Some records still remain');
    }

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check database credentials');
    console.log('3. Verify database "elitetena" exists');
    console.log('4. Check network connectivity to localhost:5432');
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the cleanup
cleanPostgresAppointments();