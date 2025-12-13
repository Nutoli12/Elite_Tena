#!/usr/bin/env node

/**
 * Update doctor records with names from user profiles
 */

import db from './src/models/index.js';
const { Doctor, User, Sequelize } = db;

const updateDoctorNames = async () => {
  console.log('🔧 ========== UPDATING DOCTOR NAMES ==========');
  
  try {
    // Find all doctors with null or empty names
    console.log('🔍 Step 1: Finding doctors with missing names...');
    
    const doctorsWithoutNames = await Doctor.findAll({
      where: {
        [Sequelize.Op.or]: [
          { name: null },
          { name: '' },
          { name: 'Unknown Doctor' }
        ]
      }
    });

    console.log(`❌ Found ${doctorsWithoutNames.length} doctors with missing names`);

    if (doctorsWithoutNames.length === 0) {
      console.log('✅ All doctors already have names!');
      return;
    }

    let updatedDoctors = 0;

    for (const doctor of doctorsWithoutNames) {
      try {