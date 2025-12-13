#!/usr/bin/env node

/**
 * Fix "Unknown Doctor" display issue in patient appointments
 * This script will:
 * 1. Check current doctor data in the database
 * 2. Update missing doctor names from User profileData
 * 3. Test the appointment display to ensure names show correctly
 */

import { Sequelize } from 'sequelize';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load database configuration
const configPath = join(__dirname, 'server/config/config.json');
const configData = await readFile(configPath, 'utf8');
const dbConfig = JSON.parse(configData);

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Initialize Sequelize
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const fixDoctorDisplay = async () => {
  console.log('🔧 ========== FIXING UNKNOWN DOCTOR DISPLAY ISSUE ==========');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Step 1: Check current doctor records
    console.log('\n📋 Step 1: Checking current doctor records...');
    const doctorsQuery = `
      SELECT d.*, u.email, u."profileData"
      FROM doctors d
      LEFT JOIN users u ON d."walletAddress" = u."walletAddress"
      ORDER BY d."createdAt" DESC;
    `;
    
    const doctors = await sequelize.query(doctorsQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log(`📊 Found ${doctors.length} doctor records`);
    
    if (doctors.length === 0) {
      console.log('⚠️  No doctors found in database');
      return;
    }

    // Step 2: Update missing doctor names
    console.log('\n🔧 Step 2: Updating missing doctor names...');
    let updatedCount = 0;

    for (const doctor of doctors) {
      let needsUpdate = false;
      let newName = doctor.name;
      let newSpecialty = doctor.specialization;

      // Check if name is missing or generic
      if (!doctor.name || doctor.name === 'Unknown Doctor' || doctor.name.trim() === '') {
        needsUpdate = true;
        
        // Try to get name from user profileData
        if (doctor.profileData) {
          const profileData = typeof doctor.profileData === 'string' 
            ? JSON.parse(doctor.profileData) 
            : doctor.profileData;
          
          newName = profileData.name || 
                   profileData.fullName || 
                   (profileData.firstName && profileData.lastName 
                     ? `${profileData.firstName} ${profileData.lastName}` 
                     : profileData.firstName) ||
                   `Dr. ${doctor.email?.split('@')[0] || 'Doctor'}`;
          
          // Also update specialty if missing
          if (!doctor.specialization && profileData.specialization) {
            newSpecialty = profileData.specialization;
          }
        } else {
          // Fallback to email-based name
          newName = `Dr. ${doctor.email?.split('@')[0] || 'Doctor'}`;
        }
      }

      if (needsUpdate) {
        console.log(`   🔧 Updating doctor: ${doctor.walletAddress}`);
        console.log(`      Old name: "${doctor.name}" → New name: "${newName}"`);
        
        const updateQuery = `
          UPDATE doctors 
          SET name = $1, specialization = $2, "updatedAt" = NOW()
          WHERE "walletAddress" = $3;
        `;
        
        await sequelize.query(updateQuery, {
          bind: [newName, newSpecialty || doctor.specialization || 'General Practice', doctor.walletAddress],
          type: Sequelize.QueryTypes.UPDATE
        });
        
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} doctor records`);

    // Step 3: Test appointment display
    console.log('\n🧪 Step 3: Testing appointment display...');
    
    const appointmentTestQuery = `
      SELECT 
        a.id,
        a."patientWallet" as patient_wallet,
        a."doctorWallet" as doctor_wallet,
        a."appointmentDate",
        a.status,
        d.name as doctor_name,
        d.specialization as doctor_specialty,
        u.email as doctor_email,
        u."profileData" as doctor_profile
      FROM appointments a
      LEFT JOIN doctors d ON a."doctorWallet" = d."walletAddress"
      LEFT JOIN users u ON a."doctorWallet" = u."walletAddress"
      ORDER BY a."appointmentDate" DESC
      LIMIT 5;
    `;
    
    const testAppointments = await sequelize.query(appointmentTestQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log(`📋 Testing ${testAppointments.length} recent appointments:`);
    
    testAppointments.forEach((apt, index) => {
      const doctorName = apt.doctor_name || 'Unknown Doctor';
      const doctorSpecialty = apt.doctor_specialty || 'General';
      
      console.log(`   ${index + 1}. Appointment ${apt.id.substring(0, 8)}...`);
      console.log(`      Doctor: ${doctorName} (${doctorSpecialty})`);
      console.log(`      Date: ${new Date(apt.appointmentDate).toLocaleString()}`);
      console.log(`      Status: ${apt.status}`);
      
      if (doctorName === 'Unknown Doctor') {
        console.log(`      ⚠️  Still showing "Unknown Doctor" - needs manual fix`);
      } else {
        console.log(`      ✅ Doctor name displaying correctly`);
      }
    });

    // Step 4: Check for any remaining "Unknown Doctor" issues
    console.log('\n🔍 Step 4: Checking for remaining issues...');
    
    const unknownDoctorsQuery = `
      SELECT COUNT(*) as count
      FROM doctors 
      WHERE name IS NULL OR name = '' OR name = 'Unknown Doctor';
    `;
    
    const unknownCount = await sequelize.query(unknownDoctorsQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    const remainingUnknown = unknownCount[0].count;
    
    if (remainingUnknown > 0) {
      console.log(`⚠️  ${remainingUnknown} doctors still have missing names`);
      
      // Show which ones
      const stillUnknownQuery = `
        SELECT "walletAddress", name, specialization, "createdAt"
        FROM doctors 
        WHERE name IS NULL OR name = '' OR name = 'Unknown Doctor'
        LIMIT 5;
      `;
      
      const stillUnknown = await sequelize.query(stillUnknownQuery, {
        type: Sequelize.QueryTypes.SELECT
      });
      
      console.log('   Doctors still needing names:');
      stillUnknown.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.walletAddress} - "${doc.name}" (${doc.specialization})`);
      });
    } else {
      console.log('✅ All doctors now have proper names');
    }

    // Step 5: Provide frontend fix recommendation
    console.log('\n💡 Step 5: Frontend Display Recommendations...');
    console.log('   The appointment controller should now return proper doctor names.');
    console.log('   If "Unknown Doctor" still appears, check:');
    console.log('   1. Frontend is using the correct API endpoint');
    console.log('   2. Frontend is reading the "appointedWith.name" field');
    console.log('   3. The appointment controller associations are working');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await sequelize.close();
  }
};

// Run the fix
fixDoctorDisplay()
  .then(() => {
    console.log('\n✅ Doctor display fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fix failed:', error);
    process.exit(1);
  });