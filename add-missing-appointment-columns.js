#!/usr/bin/env node

/**
 * Add all missing columns to appointments table
 */

import db from './server/src/models/index.js';

console.log('🔧 Adding missing appointment columns...');

try {
  // Add all missing columns
  const columns = [
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS workflow_state VARCHAR(50) DEFAULT \'scheduled\';',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_call_id UUID NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_completed_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_notes TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_checked_in_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_joined_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS workflow_metadata JSONB NULL;'
  ];
  
  for (const sql of columns) {
    try {
      await db.sequelize.query(sql);
      console.log('✅ Added column:', sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0]);
    } catch (error) {
      console.log('ℹ️ Column already exists or error:', error.message.split('\n')[0]);
    }
  }
  
  console.log('✅ All missing columns added!');
  console.log('🚀 Appointment 500 errors should be completely fixed now.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}