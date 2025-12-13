#!/usr/bin/env node

/**
 * Check what appointment data exists in the database
 */

import { Sequelize } from 'sequelize';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load database configuration
const configPath = join(__dirname, 'config/config.json');
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

const checkAppointmentData = async () => {
  console.log('🔍 ========== CHECKING APPOINTMENT DATA ==========');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check all appointments with doctor info
    console.log('\n📋 All appointments with doctor info:');
    const appointmentsQuery = `
      SELECT 
        a.id,
        a."patientWallet" as patient_wallet,
        a."doctorWallet" as doctor_wallet,
        a."appointmentDate",
        a.status,
        a.reason,
        d.name as doctor_name,
        d.specialization as doctor_specialty,
        u.email as doctor_email,
        u."profileData" as doctor_profile
      FROM appointments a
      LEFT JOIN doctors d ON a."doctorWallet" = d."walletAddress"
      LEFT JOIN users u ON a."doctorWallet" = u."walletAddress"
      ORDER BY a."appointmentDate" DESC
      LIMIT 10;
    `;
    
    const appointments = await sequelize.query(appointmentsQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    console.log(`📊 Found ${appointments.length} appointments:`);
    
    appointments.forEach((apt, index) => {
      console.log(`\n   ${index + 1}. Appointment ${apt.id.substring(0, 8)}...`);
      console.log(`      Patient: ${apt.patient_wallet}`);
      console.log(`      Doctor: ${apt.doctor_wallet}`);
      console.log(`      Doctor Name: ${apt.doctor_name || 'NULL'}`);
      console.log(`      Doctor Specialty: ${apt.doctor_specialty || 'NULL'}`);
      console.log(`      Date: ${new Date(apt.appointmentDate).toLocaleString()}`);
      console.log(`      Status: ${apt.status}`);
      console.log(`      Reason: ${apt.reason}`);
    });

    // Check specific patient appointments
    console.log('\n🔍 Checking specific patient appointments:');
    const patientWallets = [
      '0x1765465194183a78fkp',
      '0x1765374535552776ch',
      '0x176489407390876ypl7fp'
    ];

    for (const wallet of patientWallets) {
      const patientAppointmentsQuery = `
        SELECT COUNT(*) as count
        FROM appointments 
        WHERE "patientWallet" = $1;
      `;
      
      const result = await sequelize.query(patientAppointmentsQuery, {
        bind: [wallet],
        type: Sequelize.QueryTypes.SELECT
      });
      
      console.log(`   ${wallet}: ${result[0].count} appointments`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await sequelize.close();
  }
};

// Run the check
checkAppointmentData()
  .then(() => {
    console.log('\n✅ Appointment data check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });