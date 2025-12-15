#!/usr/bin/env node

/**
 * Debug Patient Selection Issue
 * Investigates why patient selection returns 0 patients despite having appointments
 */

import db from './server/src/models/index.js';

const { User, Appointment } = db;

async function debugPatientSelectionIssue() {
  console.log('🔍 Debugging Patient Selection Issue...\n');

  try {
    // Get the doctor we're testing with
    const testDoctor = await User.findOne({
      where: { 
        role: 'doctor',
        email: 'dr.alemayehu@gmail.com'
      }
    });

    if (!testDoctor) {
      console.log('❌ Test doctor not found');
      return;
    }

    console.log(`👨‍⚕️ Test Doctor: ${testDoctor.name || testDoctor.email}`);
    console.log(`   Wallet: ${testDoctor.walletAddress}`);
    console.log(`   Wallet (lowercase): ${testDoctor.walletAddress.toLowerCase()}`);

    // Step 1: Check appointments for this doctor
    console.log('\n📅 Step 1: Checking appointments...');
    const appointments = await Appointment.findAll({
      where: {
        doctorWalletAddress: testDoctor.walletAddress.toLowerCase()
      },
      attributes: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'status'],
      raw: true
    });

    console.log(`   Found ${appointments.length} appointments`);
    appointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. Patient: ${apt.patientWalletAddress}, Status: ${apt.status}`);
    });

    if (appointments.length === 0) {
      console.log('\n🔍 Checking with different case...');
      const appointmentsAnyCase = await Appointment.findAll({
        where: {
          [db.Sequelize.Op.or]: [
            { doctorWalletAddress: testDoctor.walletAddress },
            { doctorWalletAddress: testDoctor.walletAddress.toLowerCase() },
            { doctorWalletAddress: testDoctor.walletAddress.toUpperCase() }
          ]
        },
        attributes: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'status'],
        raw: true
      });
      
      console.log(`   Found ${appointmentsAnyCase.length} appointments with any case`);
      appointmentsAnyCase.forEach((apt, index) => {
        console.log(`   ${index + 1}. Doctor: ${apt.doctorWalletAddress}, Patient: ${apt.patientWalletAddress}`);
      });
    }

    // Step 2: Get unique patient wallets
    if (appointments.length > 0) {
      console.log('\n👥 Step 2: Getting unique patient wallets...');
      const uniquePatientWallets = [...new Set(appointments.map(apt => apt.patientWalletAddress))];
      console.log(`   Unique patient wallets: ${uniquePatientWallets.length}`);
      uniquePatientWallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet}`);
      });

      // Step 3: Check if these patients exist in Users table
      console.log('\n🔍 Step 3: Checking if patients exist in Users table...');
      const patients = await User.findAll({
        where: {
          walletAddress: {
            [db.Sequelize.Op.in]: uniquePatientWallets
          }
        },
        attributes: ['walletAddress', 'name', 'email', 'role']
      });

      console.log(`   Found ${patients.length} matching users`);
      patients.forEach((patient, index) => {
        console.log(`   ${index + 1}. ${patient.name || patient.email} (${patient.walletAddress}) - Role: ${patient.role}`);
      });

      // Step 4: Filter by role = 'patient'
      console.log('\n🎯 Step 4: Filtering by role = "patient"...');
      const patientUsers = patients.filter(user => user.role === 'patient');
      console.log(`   Patients with role "patient": ${patientUsers.length}`);
      patientUsers.forEach((patient, index) => {
        console.log(`   ${index + 1}. ${patient.name || patient.email} (${patient.walletAddress})`);
      });

      // Step 5: Check for case sensitivity issues
      console.log('\n🔍 Step 5: Checking for case sensitivity issues...');
      for (const patientWallet of uniquePatientWallets) {
        const exactMatch = await User.findOne({
          where: { walletAddress: patientWallet }
        });
        
        const lowerMatch = await User.findOne({
          where: { walletAddress: patientWallet.toLowerCase() }
        });

        console.log(`   Wallet: ${patientWallet}`);
        console.log(`     Exact match: ${exactMatch ? 'YES' : 'NO'}`);
        console.log(`     Lower match: ${lowerMatch ? 'YES' : 'NO'}`);
        
        if (lowerMatch && !exactMatch) {
          console.log(`     ⚠️  Case mismatch detected!`);
          console.log(`     Appointment has: ${patientWallet}`);
          console.log(`     User table has: ${lowerMatch.walletAddress}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging patient selection:', error);
  } finally {
    await db.sequelize.close();
  }
}

// Run the debug
debugPatientSelectionIssue().catch(console.error);