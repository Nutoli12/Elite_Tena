/**
 * Create missing tables for enhanced appointment system
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');

async function createMissingTables() {
  console.log('🔧 Creating Missing Tables for Enhanced Appointment System');
  console.log('='.repeat(60));

  try {
    // Database connection
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: console.log
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Read and execute the SQL migration
    const sqlContent = fs.readFileSync('./migrations/create-enhanced-appointment-system.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`\n📋 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`\n${i + 1}. Executing: ${statement.substring(0, 50)}...`);
          await sequelize.query(statement);
          console.log('   ✅ Success');
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log('   ⚠️ Already exists (skipping)');
          } else {
            console.log('   ❌ Error:', error.message);
          }
        }
      }
    }

    // Verify tables exist
    console.log('\n🔍 Verifying Tables...');
    
    const tables = [
      'doctor_service_pricing',
      'enhanced_appointments',
      'appointment_payments',
      'appointment_refunds',
      'appointment_approval_log'
    ];

    for (const table of tables) {
      try {
        const [results] = await sequelize.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        if (results.length > 0) {
          console.log(`✅ ${table} - exists`);
        } else {
          console.log(`❌ ${table} - missing`);
        }
      } catch (error) {
        console.log(`❌ ${table} - error checking:`, error.message);
      }
    }

    await sequelize.close();
    console.log('\n🎉 Database setup complete!');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
  }
}

// Run the setup
createMissingTables();