/**
 * 💬🎥 PREMIUM CONSULTATIONS MIGRATION RUNNER
 * Creates tables for chat and video consultation system
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Starting Premium Consultations Migration...\n');

  // Database connection
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/elitetena'
  });

  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, 'server/migrations/create-premium-consultations-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration SQL...\n');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('premium_consultations', 'consultation_messages', 'video_call_sessions', 'consultation_availability')
    `);

    console.log('📊 Tables created:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check DoctorPaymentSettings columns
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'doctor_payment_settings'
      AND column_name IN ('chat_consultation_fee', 'video_consultation_fee', 'chat_duration_hours')
    `);

    console.log('\n📊 DoctorPaymentSettings columns added:');
    columns.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });

    console.log('\n🎉 Premium Consultations System is ready!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart the server');
    console.log('   2. Set DAILY_API_KEY and DAILY_DOMAIN in .env for video calls');
    console.log('   3. Test the consultation flow');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️ Some tables may already exist. This is okay if you\'re re-running the migration.');
    }
  } finally {
    await pool.end();
  }
}

runMigration();
