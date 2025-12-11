#!/usr/bin/env node

/**
 * Add missing workflow_state column to appointments table
 */

import { readFile } from 'fs/promises';
import db from './server/src/models/index.js';

console.log('🔧 Adding missing workflow_state column...');

try {
  // Add the missing column
  await db.sequelize.query(`
    ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS workflow_state VARCHAR(50) DEFAULT 'scheduled';
  `);
  
  console.log('✅ Added workflow_state column!');
  
  // Update existing records
  await db.sequelize.query(`
    UPDATE appointments 
    SET workflow_state = CASE 
      WHEN status = 'completed' THEN 'completed'
      WHEN status = 'in_progress' THEN 'consultation_started'
      ELSE 'scheduled'
    END
    WHERE workflow_state IS NULL OR workflow_state = '';
  `);
  
  console.log('✅ Updated existing appointment records!');
  console.log('🚀 Appointment 500 errors should be fixed now.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await db.sequelize.close();
  process.exit(0);
}