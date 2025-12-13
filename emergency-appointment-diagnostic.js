/**
 * Emergency Appointment Diagnostic Script
 * This script will help identify why appointments aren't showing up
 */

const { createRequire } = require('module');
const require = createRequire(import.meta.url);

async function runDiagnostic() {
  console.log('🚨 EMERGENCY APPOINTMENT DIAGNOSTIC');
  console.log('=' .repeat(60));

  try {
    // Import database connection
    const { Client } = require('pg');
    const config = require('./server/config/config.json');
    
    const client = new Client({
      host: config.development.host,
      port: config.development.port,
      database: config.development.database,
      username: config.development.username,
      password: config.development.password
    });

    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Check if appointments table exists and its structure
    console.log('📋 Step 1: Checking appointments table structure...');
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position;
    `);

    if (tableStructure.rows.length === 0) {
      console.log('❌ CRITICAL: appointments table does not exist!');
      await client.end();
      return;
    }

    console.log('✅ Appointments table structure:');
    tableStructure.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Step 2: Count total appointments
    console.log('\n📊 Step 2: Counting total appointments...');
    const totalCount = await client.query('SELECT COUNT(*) as total FROM appointments;');
    console.log(`✅ Total appointments in database: ${totalCount.rows[0].total}`);

    if (totalCount.rows[0].total === '0') {
      console.log('⚠️  No appointments found in database!');
      console.log('   This means appointments are not being created or saved properly.');
    }

    // Step 3: Check recent appointments with details
    console.log('\n📋 Step 3: Checking recent appointments...');
    const recentAppointments = await client.query(`
      SELECT 
        id,
        "patientWalletAddress" as patient_wallet,
        "doctorWalletAddress" as doctor_wallet,
        "appointmentDate" as appointment_date,
        status,
        "paymentStatus" as payment_status,
        "workflowState" as workflow_state,
        "createdAt" as created_at
      FROM appointments 
      ORDER BY "createdAt" DESC 
      LIMIT 10;
    `);

    if (recentAppointments.rows.length > 0) {
      console.log('✅ Recent appointments found:');
      recentAppointments.rows.forEach((apt, index) => {
        console.log(`   ${index + 1}. ID: ${apt.id}`);
        console.log(`      Patient: ${apt.patient_wallet}`);
        console.log(`      Doctor: ${apt.doctor_wallet}`);
        console.log(`      Date: ${apt.appointment_date}`);
        console.log(`      Status: ${apt.status}`);
        console.log(`      Workflow: ${apt.workflow_state || 'NULL'}`);
        console.log(`      Created: ${apt.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No appointments found');
    }

    // Step 4: Check for NULL wallet addresses
    console.log('🔍 Step 4: Checking for NULL wallet addresses...');
    const nullWallets = await client.query(`
      SELECT COUNT(*) as null_count 
      FROM appointments 
      WHERE "patientWalletAddress" IS NULL OR "doctorWalletAddress" IS NULL;
    `);
    
    if (nullWallets.rows[0].null_count > 0) {
      console.log(`❌ Found ${nullWallets.rows[0].null_count} appointments with NULL wallet addresses`);
    } else {
      console.log('✅ No NULL wallet addresses found');
    }

    // Step 5: Check users table
    console.log('\n👥 Step 5: Checking users table...');
    const userCount = await client.query('SELECT COUNT(*) as total FROM users;');
    console.log(`✅ Total users in database: ${userCount.rows[0].total}`);

    const userRoles = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role;
    `);
    
    console.log('✅ User roles breakdown:');
    userRoles.rows.forEach(role => {
      console.log(`   ${role.role}: ${role.count}`);
    });

    // Step 6: Check for case sensitivity issues
    console.log('\n🔤 Step 6: Checking for case sensitivity issues...');
    const caseCheck = await client.query(`
      SELECT 
        "patientWalletAddress",
        "doctorWalletAddress",
        LOWER("patientWalletAddress") as patient_lower,
        LOWER("doctorWalletAddress") as doctor_lower
      FROM appointments 
      LIMIT 5;
    `);

    if (caseCheck.rows.length > 0) {
      console.log('✅ Sample wallet addresses (checking case):');
      caseCheck.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Patient: ${row.patientWalletAddress} → ${row.patient_lower}`);
        console.log(`      Doctor: ${row.doctorWalletAddress} → ${row.doctor_lower}`);
      });
    }

    await client.end();
    console.log('\n🎯 DIAGNOSTIC COMPLETE');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run diagnostic
runDiagnostic();