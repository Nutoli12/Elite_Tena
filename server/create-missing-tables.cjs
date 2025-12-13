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
      logging: false // Reduce noise
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Create tables manually
    console.log('\n📋 Creating tables...');

    // 1. Doctor Service Pricing Table
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS doctor_service_pricing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_wallet VARCHAR(255) NOT NULL UNIQUE,
          doctor_id INTEGER,
          in_person_fee DECIMAL(10,2) DEFAULT 400.00,
          video_call_fee DECIMAL(10,2) DEFAULT 0.00,
          chat_fee DECIMAL(10,2) DEFAULT 0.00,
          accepts_in_person BOOLEAN DEFAULT 1,
          accepts_video_calls BOOLEAN DEFAULT 1,
          accepts_chat BOOLEAN DEFAULT 1,
          auto_approve_exact_payments BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_wallet VARCHAR(255) NOT NULL,
          doctor_wallet VARCHAR(255) NOT NULL,
          patient_id INTEGER,
          doctor_id INTEGER,
          appointment_date DATETIME NOT NULL,
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
          approved_at DATETIME,
          rejection_reason TEXT,
          refund_eligible BOOLEAN DEFAULT 1,
          refund_status VARCHAR(50) DEFAULT 'none',
          refund_amount DECIMAL(10,2) DEFAULT 0.00,
          refund_processed_at DATETIME,
          status VARCHAR(50) DEFAULT 'scheduled',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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