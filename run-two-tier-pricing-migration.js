const mysql = require('mysql2/promise');
const fs = require('fs').promises;
require('dotenv').config();

async function runTwoTierPricingMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting Two-Tier Pricing System Migration...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'elite_tena_health',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read and execute migration
    const migrationSQL = await fs.readFile('./server/migrations/create-two-tier-pricing-system.sql', 'utf8');
    
    console.log('📝 Executing migration...');
    await connection.execute(migrationSQL);
    
    console.log('✅ Two-tier pricing system migration completed successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying created tables...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('doctor_service_fees', 'payment_routing', 'doctor_premium_settings', 'system_pricing_config')
    `, [process.env.DB_NAME || 'elite_tena_health']);
    
    console.log('Created tables:', tables.map(t => t.TABLE_NAME));

    // Check if default pricing was inserted
    const [defaultPricing] = await connection.execute(`
      SELECT COUNT(*) as count FROM doctor_service_fees WHERE service_type = 'in_person'
    `);
    
    console.log(`✅ Default in-person pricing set for ${defaultPricing[0].count} doctors`);

    // Check system configuration
    const [systemConfig] = await connection.execute(`
      SELECT config_key, config_value FROM system_pricing_config
    `);
    
    console.log('\n💰 System Pricing Configuration:');
    systemConfig.forEach(config => {
      console.log(`  ${config.config_key}: ${config.config_value}`);
    });

    console.log('\n🎉 Two-Tier Pricing System is ready!');
    console.log('\n📋 Next Steps:');
    console.log('1. Doctors can set premium pricing via /doctor/premium-pricing');
    console.log('2. Patients can view pricing via /doctors/pricing');
    console.log('3. Auto-approval works for premium services with exact payment');
    console.log('4. Standard 400 ETB in-person consultations require manual approval');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runTwoTierPricingMigration()
  .then(() => {
    console.log('\n✨ Two-Tier Pricing System Migration Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration Failed:', error.message);
    process.exit(1);
  });