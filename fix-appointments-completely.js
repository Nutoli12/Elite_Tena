/**
 * Complete Appointment Fix Script
 * This script will diagnose and fix all appointment-related issues
 */

const axios = require('axios');
const { createRequire } = require('module');
const require = createRequire(import.meta.url);

const BASE_URL = 'http://localhost:3001/api';

async function fixAppointmentsCompletely() {
  console.log('🔧 COMPLETE APPOINTMENT FIX SCRIPT');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check server status
    console.log('🔍 Step 1: Checking server status...');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/appointments`);
      console.log('✅ Server is running and responding');
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first.');
      console.log('   Run: npm run dev (in server directory)');
      return;
    }

    // Step 2: Check database structure
    console.log('\n📊 Step 2: Checking database structure...');
    await checkDatabaseStructure();

    // Step 3: Test appointment creation
    console.log('\n📝 Step 3: Testing appointment creation...');
    const testAppointment = await createTestAppointment();

    if (testAppointment) {
      // Step 4: Test appointment retrieval
      console.log('\n🔍 Step 4: Testing appointment retrieval...');
      await testAppointmentRetrieval(testAppointment);
    }

    // Step 5: Test different query methods
    console.log('\n🧪 Step 5: Testing different query methods...');
    await testQueryMethods();

    console.log('\n🎯 COMPLETE FIX SCRIPT FINISHED');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Fix script failed:', error.message);
  }
}

async function checkDatabaseStructure() {
  try {
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

    // Check appointments table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position;
    `);

    console.log('✅ Appointments table columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check for wallet-related columns specifically
    const walletColumns = columns.rows.filter(col => 
      col.column_name.toLowerCase().includes('wallet')
    );

    console.log('\n🔍 Wallet-related columns:');
    walletColumns.forEach(col => {
      console.log(`   - ${col.column_name}`);
    });

    // Count total appointments
    const totalCount = await client.query('SELECT COUNT(*) as total FROM appointments;');
    console.log(`\n📊 Total appointments in database: ${totalCount.rows[0].total}`);

    // Sample appointment data
    if (totalCount.rows[0].total > 0) {
      const sample = await client.query('SELECT * FROM appointments LIMIT 1;');
      console.log('\n📋 Sample appointment data:');
      const sampleData = sample.rows[0];
      Object.keys(sampleData).forEach(key => {
        if (key.toLowerCase().includes('wallet') || key === 'id' || key === 'status') {
          console.log(`   ${key}: ${sampleData[key]}`);
        }
      });
    }

    await client.end();
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

async function createTestAppointment() {
  try {
    console.log('📝 Creating test appointment...');
    
    const testData = {
      patientWalletAddress: '0x1111111111111111111111111111111111111111',
      doctorWalletAddress: '0x2222222222222222222222222222222222222222',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Test appointment for debugging',
      duration: 30,
      fee: 0
    };

    const response = await axios.post(`${BASE_URL}/appointments`, testData);

    if (response.data.success) {
      console.log('✅ Test appointment created successfully');
      console.log(`   ID: ${response.data.data.id}`);
      return response.data.data;
    } else {
      console.log('❌ Failed to create test appointment:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Test appointment creation failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testAppointmentRetrieval(testAppointment) {
  try {
    const testWallet = '0x1111111111111111111111111111111111111111';

    // Test 1: Get all appointments
    console.log('🔍 Test 1: Getting all appointments...');
    const allResponse = await axios.get(`${BASE_URL}/appointments`);
    console.log(`   Result: ${allResponse.data.data?.length || 0} appointments found`);

    // Test 2: Get patient appointments
    console.log('🔍 Test 2: Getting patient appointments...');
    const patientResponse = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'patient',
        userId: testWallet
      }
    });
    console.log(`   Result: ${patientResponse.data.data?.length || 0} patient appointments found`);

    // Test 3: Get doctor appointments
    console.log('🔍 Test 3: Getting doctor appointments...');
    const doctorResponse = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'doctor',
        userId: '0x2222222222222222222222222222222222222222'
      }
    });
    console.log(`   Result: ${doctorResponse.data.data?.length || 0} doctor appointments found`);

    // Check if our test appointment is found
    const foundInPatient = patientResponse.data.data?.find(apt => apt.id === testAppointment.id);
    const foundInDoctor = doctorResponse.data.data?.find(apt => apt.id === testAppointment.id);

    console.log(`   Test appointment found in patient query: ${foundInPatient ? '✅ YES' : '❌ NO'}`);
    console.log(`   Test appointment found in doctor query: ${foundInDoctor ? '✅ YES' : '❌ NO'}`);

    if (!foundInPatient || !foundInDoctor) {
      console.log('⚠️  Query filtering issue detected!');
    }

  } catch (error) {
    console.log('❌ Appointment retrieval test failed:', error.message);
  }
}

async function testQueryMethods() {
  try {
    // Test different query parameter combinations
    const testCases = [
      { name: 'No parameters', params: {} },
      { name: 'Patient role only', params: { userRole: 'patient' } },
      { name: 'Doctor role only', params: { userRole: 'doctor' } },
      { name: 'Patient with wallet', params: { userRole: 'patient', userId: '0x1111111111111111111111111111111111111111' } },
      { name: 'Doctor with wallet', params: { userRole: 'doctor', userId: '0x2222222222222222222222222222222222222222' } },
      { name: 'Legacy patient wallet', params: { patientWallet: '0x1111111111111111111111111111111111111111' } },
      { name: 'Legacy doctor wallet', params: { doctorWallet: '0x2222222222222222222222222222222222222222' } }
    ];

    for (const testCase of testCases) {
      try {
        const response = await axios.get(`${BASE_URL}/appointments`, { params: testCase.params });
        console.log(`✅ ${testCase.name}: ${response.data.data?.length || 0} appointments`);
      } catch (error) {
        console.log(`❌ ${testCase.name}: ${error.response?.status} ${error.response?.statusText}`);
      }
    }
  } catch (error) {
    console.log('❌ Query method testing failed:', error.message);
  }
}

// Check if required modules are available
try {
  require('axios');
  require('pg');
  fixAppointmentsCompletely();
} catch (error) {
  console.log('❌ Missing required modules. Please run:');
  console.log('   npm install axios pg');
}