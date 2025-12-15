#!/usr/bin/env node

/**
 * Create Test Appointments for Lab Workflow
 * Creates appointments between doctors and patients so they appear in lab patient selection
 */

import db from './server/src/models/index.js';

const { User, Appointment } = db;

async function createTestAppointmentsForLab() {
  console.log('🏥 Creating test appointments for lab workflow...\n');

  try {
    // First, let's check existing users
    const doctors = await User.findAll({
      where: { role: 'doctor' },
      attributes: ['walletAddress', 'name', 'email'],
      limit: 5
    });

    const patients = await User.findAll({
      where: { role: 'patient' },
      attributes: ['walletAddress', 'name', 'email'],
      limit: 10
    });

    console.log(`👨‍⚕️ Found ${doctors.length} doctors`);
    console.log(`👥 Found ${patients.length} patients`);

    if (doctors.length === 0 || patients.length === 0) {
      console.log('❌ Need at least 1 doctor and 1 patient to create appointments');
      return;
    }

    // Create appointments between doctors and patients
    const appointmentsToCreate = [];
    
    for (let i = 0; i < Math.min(doctors.length, 3); i++) {
      const doctor = doctors[i];
      
      // Create 2-3 appointments per doctor with different patients
      for (let j = 0; j < Math.min(patients.length, 3); j++) {
        const patient = patients[j];
        
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + (i * 7) + j); // Spread appointments over time
        
        appointmentsToCreate.push({
          patientWalletAddress: patient.walletAddress,
          doctorWalletAddress: doctor.walletAddress,
          appointmentDate,
          appointmentTime: '10:00',
          status: 'confirmed',
          appointmentType: 'consultation',
          reason: 'Regular checkup - Lab tests may be needed',
          notes: `Appointment between ${patient.name || patient.email} and ${doctor.name || doctor.email}`,
          paymentStatus: 'paid',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    console.log(`\n📅 Creating ${appointmentsToCreate.length} appointments...`);

    // Create appointments
    const createdAppointments = await Appointment.bulkCreate(appointmentsToCreate, {
      ignoreDuplicates: true
    });

    console.log(`✅ Created ${createdAppointments.length} appointments successfully!`);

    // Show summary
    console.log('\n📋 Appointment Summary:');
    for (const doctor of doctors.slice(0, 3)) {
      const doctorAppointments = await Appointment.count({
        where: { doctorWalletAddress: doctor.walletAddress }
      });
      
      console.log(`   👨‍⚕️ ${doctor.name || doctor.email}: ${doctorAppointments} appointments`);
    }

    console.log('\n🧪 Lab Workflow Impact:');
    console.log('- Doctors can now see their appointed patients in lab order creation');
    console.log('- Patient selection dropdown will show real patients instead of "No patients available"');
    console.log('- Each doctor will only see patients who have appointments with them');

    // Test the patient selection for the first doctor
    if (doctors.length > 0) {
      const testDoctor = doctors[0];
      console.log(`\n🔍 Testing patient selection for ${testDoctor.name || testDoctor.email}...`);
      
      const doctorAppointments = await Appointment.findAll({
        where: { doctorWalletAddress: testDoctor.walletAddress },
        attributes: ['patientWalletAddress'],
        raw: true
      });

      const uniquePatientWallets = [...new Set(doctorAppointments.map(apt => apt.patientWalletAddress))];
      
      const appointedPatients = await User.findAll({
        where: {
          walletAddress: { [db.Sequelize.Op.in]: uniquePatientWallets },
          role: 'patient'
        },
        attributes: ['walletAddress', 'name', 'email']
      });

      console.log(`   📋 ${appointedPatients.length} patients available for lab orders:`);
      appointedPatients.forEach(patient => {
        console.log(`      - ${patient.name || patient.email} (${patient.walletAddress.slice(0, 8)}...)`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating test appointments:', error);
  } finally {
    await db.sequelize.close();
  }
}

// Run the script
createTestAppointmentsForLab().catch(console.error);