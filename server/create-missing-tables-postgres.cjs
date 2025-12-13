/**
 * Create missing tables for enhanced appointment system in PostgreSQL
 */

const { Sequelize } = require('sequelize');

async function createMissingTables() {
  console.log('🔧 Creating Missing Tables for Enhanced Appointment System (PostgreSQL)');
  console.log('='.repeat(60));

  try {
    // Database connection using environment variables
    const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena', {
      dialect: 'postgres',
      logging: false // Reduce noise
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL database connection established');

    // Create tables manually
    console.log('\n📋 Creating tables...');

    // 1. Doctor Service Pricing Table
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS doctor_service_pricing (
          id SERIAL PRIMARY KEY,
          doctor_wallet VARCHAR(255) NOT NULL UNIQUE,
          doctor_id INTEGER,
          in_person_fee DECIMAL(10,2) DEFAULT 400.00,
          video_call_fee DECIMAL(10,2) DEFAULT 0.00,
          chat_fee DECIMAL(10,2) DEFAULT 0.00,
          accepts_in_person BOOLEAN DEFAULT true,
          accepts_video_calls BOOLEAN DEFAULT true,
          accepts_chat BOOLEAN DEFAULT true,
          auto_approve_exact_payments BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ doctor_service_pricing table created');
    } catch (error) {
      console.log('⚠️ doctor_service_pricing:', error.message);
    }

    // 2. Enhanced Appointments Table
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS enhanced_appointments (
          id SERIAL PRIMARY KEY,
          patient_wallet VARCHAR(255) NOT NULL,
          doctor_wallet VARCHAR(255) NOT NULL,
          patient_id INTEGER,
          doctor_id INTEGER,
          appointment_date TIMESTAMP NOT NULL,
          service_type VARCHAR(50) NOT NULL,
          duration INTEGER DEFAULT 30,
          reason TEXT NOT NULL,
          expected_fee DECIMAL(10,2) NOT NULL,
          paid_amount DECIMAL(10,2) DEFAULT 0.00,
          payment_status VARCHAR(50) DEFAULT 'pending',
          payment_reference VARCHAR(255),
          approval_status VARCHAR(50) DEFAULT 'pending',
          approval_type VARCHAR(50) DEFAULT 'manual',
          approved_by INTEGER,
          approved_at TIMESTAMP,
          rejection_reason TEXT,
          refund_eligible BOOLEAN DEFAULT true,
          refund_status VARCHAR(50) DEFAULT 'none',
          refund_amount DECIMAL(10,2) DEFAULT 0.00,
          refund_processed_at TIMESTAMP,
          status VARCHAR(50) DEFAULT 'scheduled',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ enhanced_appointments table created');
    } catch (error) {
      console.log('⚠️ enhanced_appointments:', error.message);
    }

    // Verify tables exist
    console.log('\n🔍 Verifying Tables...');
    
    const tables = ['doctor_service_pricing', 'enhanced_appointments'];

    for (const table of tables) {
      try {
        const [results] = await sequelize.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}'`);
        if (results.length > 0) {
          console.log(`✅ ${table} - exists`);
        } else {
          console.log(`❌ ${table} - missing`);
        }
      } catch (error) {
        console.log(`❌ ${table} - error checking:`, error.message);
      }
    }

    // Create default doctor pricing for test doctor
    console.log('\n🔧 Creating default doctor pricing...');
    try {
      await sequelize.query(`
        INSERT INTO doctor_service_pricing (doctor_wallet, in_person_fee, video_call_fee, chat_fee)
        VALUES ('0x0987654321098765432109876543210987654321', 400.00, 500.00, 300.00)
        ON CONFLICT (doctor_wallet) DO UPDATE SET
          in_person_fee = EXCLUDED.in_person_fee,
          video_call_fee = EXCLUDED.video_call_fee,
          chat_fee = EXCLUDED.chat_fee,
          updated_at = CURRENT_TIMESTAMP
      `);
      console.log('✅ Default doctor pricing created/updated');
    } catch (error) {
      console.log('⚠️ Default doctor pricing:', error.message);
    }

    await sequelize.close();
    console.log('\n🎉 PostgreSQL database setup complete!');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('💡 Make sure PostgreSQL is running and the database exists');
    console.error('💡 Check your DATABASE_URL in .env file');
  }
}

// Run the setup
createMissingTables();