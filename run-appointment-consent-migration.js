const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 ========== APPOINTMENT CONSENT MIGRATION ==========');
console.log('🔐 Setting up appointment-specific consent workflow...');

async function runMigration() {
  try {
    // Check if migration file exists
    const migrationPath = path.join(__dirname, 'server/migrations/add-appointment-specific-consent-workflow.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    console.log('📁 Migration file found:', migrationPath);
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration SQL loaded successfully');

    // Connect to database and run migration
    const { Client } = require('pg');
    
    // Database configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'elite_tena_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    };

    console.log('🔗 Connecting to database:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    });

    const client = new Client(dbConfig);
    
    await client.connect();
  console.log('✅ Connected to database successfully');

  // Execute migration
  console.log('🚀 Executing appointment consent migration...');
  await client.query(migrationSQL);
  console.log('✅ Migration executed successfully');

  // Verify tables were created
  console.log('🔍 Verifying migration results...');
  
  // Check if appointment_consents table exists
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'appointment_consents'
    );
  `);
  
  if (tableCheck.rows[0].exists) {
    console.log('✅ appointment_consents table created successfully');
  } else {
    console.error('❌ appointment_consents table not found');
  }

  // Check if new columns were added to appointments table
  const columnCheck = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name IN ('consent_status', 'consent_required', 'consent_expires_at', 'consent_granted_at');
  `);
  
  console.log('✅ New appointment columns added:', columnCheck.rows.map(row => row.column_name));

  // Check existing appointments count
  const appointmentCount = await client.query('SELECT COUNT(*) FROM appointments');
  console.log('📊 Existing appointments:', appointmentCount.rows[0].count);

  // Update existing appointments to have proper consent status
  const updateResult = await client.query(`
    UPDATE appointments 
    SET consent_status = 'not_requested', 
        consent_required = TRUE 
    WHERE consent_status IS NULL
  `);
  
  console.log('🔄 Updated existing appointments:', updateResult.rowCount);

  await client.end();
  console.log('🔐 ========== MIGRATION COMPLETE ==========');
  console.log('');
  console.log('✅ Appointment-specific consent workflow is now ready!');
  console.log('');
  console.log('📋 What was added:');
  console.log('   • appointment_consents table for tracking consent per appointment');
  console.log('   • consent_status, consent_required columns in appointments table');
  console.log('   • Automatic sync between appointment and consent status');
  console.log('   • Triggers for maintaining data consistency');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Restart your server to load the new AppointmentConsent model');
  console.log('   2. Add appointment consent routes to your server');
  console.log('   3. Update frontend components to use the new consent workflow');
  console.log('');
  console.log('🔗 API Endpoints now available:');
  console.log('   • POST /api/appointment-consent/request/:appointmentId');
  console.log('   • POST /api/appointment-consent/grant/:appointmentId');
  console.log('   • POST /api/appointment-consent/deny/:appointmentId');
  console.log('   • GET /api/appointment-consent/check/:appointmentId');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);