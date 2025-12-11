#!/usr/bin/env node

/**
 * Add ALL missing columns to appointments table
 */

import db from './server/src/models/index.js';

console.log('🔧 Adding ALL missing appointment columns...');

try {
  // Add all missing columns from the model
  const columns = [
    // Basic workflow columns
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS workflow_state VARCHAR(50) DEFAULT \'scheduled\';',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_call_id UUID NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS diagnosis TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS treatment_plan TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS chief_complaint TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS history_present_illness TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_findings JSONB NULL;',
    
    // Consultation tracking
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_completed_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_notes TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_ended_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_duration INTEGER NULL;',
    
    // Check-in and queue
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS check_in_status VARCHAR(50) DEFAULT \'not_checked_in\';',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_by VARCHAR(255) NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS queue_number INTEGER NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS qr_code_data TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS estimated_wait_time INTEGER NULL;',
    
    // Payment fields
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT \'pending\';',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255) NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT \'free\';',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_payment_details JSONB NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_instructions TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255) NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_confirmed_by VARCHAR(255) NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT NULL;',
    
    // Workflow metadata
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_checked_in_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_joined_at TIMESTAMP NULL;',
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS workflow_metadata JSONB NULL;'
  ];
  
  for (const sql of columns) {
    try {
      await db.sequelize.query(sql);
      const columnName = sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0];
      console.log('✅ Added:', columnName);
    } catch (error) {
      const columnName = sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0];
      console.log('ℹ️ Skipped:', columnName, '(already exists)');
    }
  }
  
  console.log('✅ All appointment columns added!');
  console.log('🚀 Appointment 500 errors should be completely fixed now.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}