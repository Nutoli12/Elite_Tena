#!/usr/bin/env node

/**
 * IMMEDIATE FIX: Unknown Doctor Issue - Direct Database Query
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

const fixUnknownDoctorDirectly = async () => {
  console.log('🚨 ========== DIRECT FIX: UNKNOWN DOCTOR ISSUE ==========');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // 1. Find appointments with missing doctor records
    console.log('\n🔍 Step 1: Finding appointments with missing doctor records...');
    
    const orphanedQuery = `
      SELECT a.id, a."doctorWalletAddress", a."patientWalletAddress", a."appointmentDate"
      FROM appointments a
      LEFT JOIN doctors d ON LOWER(a."doctorWalletAddress") = LOWER(d."walletAddress")
      WHERE d."walletAddress" IS NULL
      LIMIT 10;
    `;
    
    const orphanedAppointments = await sequelize.query(orphanedQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log(`❌ Found ${orphanedAppointments.length} appointments with missing doctor records`);

    if (orphanedAppointments.length > 0) {
      console.log('\n📋 Sample orphaned appointments:');
      orphanedAppointments.slice(0, 3).forEach((apt, index) => {
        console.log(`   ${index + 1}. ID: ${apt.id}`);
        console.log(`      Doctor Wallet: ${apt.doctorWalletAddress}`);
        console.log(`      Patient Wallet: ${apt.patientWalletAddress}`);
        console.log(`      Date: ${apt.appointmentDate}`);
      });
    }

    // 2. Get unique doctor wallets that need records
    console.log('\n🔧 Step 2: Creating missing doctor records...');
    
    const uniqueDoctorsQuery = `
      SELECT DISTINCT a."doctorWalletAddress"
      FROM appointments a
      LEFT JOIN doctors d ON LOWER(a."doctorWalletAddress") = LOWER(d."walletAddress")
      WHERE d."walletAddress" IS NULL
      AND a."doctorWalletAddress" IS NOT NULL
      AND a."doctorWalletAddress" != '';
    `;
    
    const uniqueDoctorWallets = await sequelize.query(uniqueDoctorsQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log(`🔍 Found ${uniqueDoctorWallets.length} unique doctor wallets needing records`);

    let createdDoctors = 0;
    
    for (const { doctorWalletAddress } of uniqueDoctorWallets) {
      try {
        // Get user data for this doctor
        const userQuery = `
          SELECT "walletAddress", "profileData", "role"
          FROM users
          WHERE LOWER("walletAddress") = LOWER($1);
        `;
        
        const users = await sequelize.query(userQuery, {
          bind: [doctorWalletAddress],
          type: Sequelize.QueryTypes.SELECT
        });

        if (users.length > 0) {
          const user = users[0];
          
          // Extract name from profile data
          let doctorName = 'Unknown Doctor';
          let specialization = 'General Practice';
          
          if (user.profileData) {
            const profile = user.profileData;
            doctorName = profile.name || 
                        profile.fullName || 
                        (profile.firstName && profile.lastName 
                          ? `${profile.firstName} ${profile.lastName}` 
                          : profile.firstName || `Dr. ${doctorWalletAddress.substring(0, 8)}`);
            specialization = profile.specialization || 'General Practice';
          }

          // Create doctor record
          const createDoctorQuery = `
            INSERT INTO doctors ("walletAddress", "name", "specialization", "department", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT ("walletAddress") DO NOTHING;
          `;
          
          await sequelize.query(createDoctorQuery, {
            bind: [
              doctorWalletAddress.toLowerCase(),
              doctorName,
              specialization,
              specialization
            ]
          });

          // Update user role if needed
          if (user.role !== 'doctor') {
            const updateRoleQuery = `
              UPDATE users 
              SET "role" = 'doctor', "updatedAt" = NOW()
              WHERE LOWER("walletAddress") = LOWER($1);
            `;
            
            await sequelize.query(updateRoleQuery, {
              bind: [doctorWalletAddress]
            });
            
            console.log(`   ✅ Updated user role to doctor: ${doctorWalletAddress}`);
          }

          createdDoctors++;
          console.log(`   ✅ Created doctor record: ${doctorName} (${doctorWalletAddress})`);
        } else {
          console.log(`   ⚠️  No user found for doctor wallet: ${doctorWalletAddress}`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating doctor record for ${doctorWalletAddress}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${createdDoctors} missing doctor records`);

    // 3. Verify repair
    console.log('\n🔍 Step 3: Verifying repair...');
    
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM appointments a
      LEFT JOIN doctors d ON LOWER(a."doctorWalletAddress") = LOWER(d."walletAddress")
      WHERE d."walletAddress" IS NULL;
    `;
    
    const remainingOrphaned = await sequelize.query(verifyQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log(`📊 Remaining orphaned appointments: ${remainingOrphaned[0].count}`);

    // 4. Final statistics
    console.log('\n🔍 Step 4: Final statistics...');
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM appointments) as total_appointments,
        (SELECT COUNT(*) FROM appointments a 
         INNER JOIN doctors d ON LOWER(a."doctorWalletAddress") = LOWER(d."walletAddress")) as appointments_with_doctors;
    `;
    
    const stats = await sequelize.query(statsQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    const { total_appointments, appointments_with_doctors } = stats[0];
    const doctorCoverage = ((appointments_with_doctors / total_appointments) * 100).toFixed(1);

    console.log(`📊 Total appointments: ${total_appointments}`);
    console.log(`📊 Appointments with doctor records: ${appointments_with_doctors}`);
    console.log(`📊 Doctor coverage: ${doctorCoverage}%`);

    console.log('\n✅ ========== REPAIR COMPLETE ==========');
    console.log('✅ "Unknown Doctor" issue should now be resolved!');
    console.log('✅ Please refresh your frontend to see the changes.');

    return {
      success: true,
      createdDoctors,
      totalAppointments: total_appointments,
      appointmentsWithDoctors: appointments_with_doctors,
      doctorCoverage
    };

  } catch (error) {
    console.error('❌ Repair failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the fix
fixUnknownDoctorDirectly()
  .then((result) => {
    console.log('\n🎉 Unknown Doctor fix completed successfully!');
    console.log(`🎉 Doctor coverage is now ${result.doctorCoverage}%`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fix failed:', error);
    process.exit(1);
  });