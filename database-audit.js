#!/usr/bin/env node

/**
 * PHASE 4: DATABASE INTEGRITY AUDIT
 * 
 * Comprehensive database audit to identify and report integrity issues
 */

import db from './server/src/models/index.js';
const { Appointment, Patient, Doctor, User, Sequelize, Op } = db;

const auditDatabase = async () => {
  console.log('🔍 ========== DATABASE INTEGRITY AUDIT ==========\n');

  const auditResults = {
    orphanedAppointments: 0,
    usersWithoutProfiles: 0,
    inconsistentData: 0,
    totalAppointments: 0,
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    issues: []
  };

  try {
    // 1. Check appointments without doctors
    console.log('🔍 1. Checking appointments without doctor records...');
    
    const orphanedAppointments = await Appointment.findAll({
      include: [{
        model: Doctor,
        as: 'doctorDetails',
        required: false
      }],
      where: {
        '$doctorDetails.walletAddress$': null
      }
    });

    auditResults.orphanedAppointments = orphanedAppointments.length;
    console.log(`   ❌ Orphaned appointments (no doctor): ${orphanedAppointments.length}`);

    if (orphanedAppointments.length > 0) {
      auditResults.issues.push({
        type: 'orphaned_appointments_doctor',
        count: orphanedAppointments.length,
        description: 'Appointments without corresponding doctor records',
        severity: 'high',
        samples: orphanedAppointments.slice(0, 3).map(apt => ({
          id: apt.id,
          doctorWallet: apt.doctorWalletAddress,
          patientWallet: apt.patientWalletAddress,
          date: apt.appointmentDate
        }))
      });
    }

    // 2. Check appointments without patients
    console.log('\n🔍 2. Checking appointments without patient records...');
    
    const orphanedPatientAppointments = await Appointment.findAll({
      include: [{
        model: Patient,
        as: 'patientDetails',
        required: false
      }],
      where: {
        '$patientDetails.walletAddress$': null
      }
    });

    console.log(`   ❌ Orphaned appointments (no patient): ${orphanedPatientAppointments.length}`);

    if (orphanedPatientAppointments.length > 0) {
      auditResults.issues.push({
        type: 'orphaned_appointments_patient',
        count: orphanedPatientAppointments.length,
        description: 'Appointments without corresponding patient records',
        severity: 'high'
      });
    }

    // 3. Check users without profiles
    console.log('\n🔍 3. Checking users without profile records...');
    
    const patientsWithoutProfiles = await User.findAll({
      where: { role: 'patient' },
      include: [{
        model: Patient,
        required: false
      }],
      having: Sequelize.literal('COUNT(Patient.walletAddress) = 0'),
      group: ['User.walletAddress']
    });

    const doctorsWithoutProfiles = await User.findAll({
      where: { role: 'doctor' },
      include: [{
        model: Doctor,
        required: false
      }],
      having: Sequelize.literal('COUNT(Doctor.walletAddress) = 0'),
      group: ['User.walletAddress']
    });

    auditResults.usersWithoutProfiles = patientsWithoutProfiles.length + doctorsWithoutProfiles.length;
    console.log(`   ❌ Patients without profiles: ${patientsWithoutProfiles.length}`);
    console.log(`   ❌ Doctors without profiles: ${doctorsWithoutProfiles.length}`);

    if (patientsWithoutProfiles.length > 0) {
      auditResults.issues.push({
        type: 'patients_without_profiles',
        count: patientsWithoutProfiles.length,
        description: 'Patient users without corresponding patient profile records',
        severity: 'medium'
      });
    }

    if (doctorsWithoutProfiles.length > 0) {
      auditResults.issues.push({
        type: 'doctors_without_profiles',
        count: doctorsWithoutProfiles.length,
        description: 'Doctor users without corresponding doctor profile records',
        severity: 'medium'
      });
    }

    // 4. Check data consistency
    console.log('\n🔍 4. Checking data consistency...');
    
    const inconsistentData = await Appointment.findAll({
      where: {
        [Op.or]: [
          { patientWalletAddress: null },
          { doctorWalletAddress: null },
          { appointmentDate: null },
          { patientWalletAddress: '' },
          { doctorWalletAddress: '' }
        ]
      }
    });

    auditResults.inconsistentData = inconsistentData.length;
    console.log(`   ❌ Appointments with null/empty fields: ${inconsistentData.length}`);

    if (inconsistentData.length > 0) {
      auditResults.issues.push({
        type: 'inconsistent_appointment_data',
        count: inconsistentData.length,
        description: 'Appointments with null or empty required fields',
        severity: 'high'
      });
    }

    // 5. Check for duplicate appointments
    console.log('\n🔍 5. Checking for duplicate appointments...');
    
    const duplicateAppointments = await db.sequelize.query(`
      SELECT 
        "patientWalletAddress", 
        "doctorWalletAddress", 
        "appointmentDate",
        COUNT(*) as count
      FROM appointments 
      GROUP BY "patientWalletAddress", "doctorWalletAddress", "appointmentDate"
      HAVING COUNT(*) > 1
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`   ❌ Duplicate appointment groups: ${duplicateAppointments.length}`);

    if (duplicateAppointments.length > 0) {
      auditResults.issues.push({
        type: 'duplicate_appointments',
        count: duplicateAppointments.length,
        description: 'Multiple appointments with same patient, doctor, and date',
        severity: 'medium',
        samples: duplicateAppointments.slice(0, 3)
      });
    }

    // 6. Get overall statistics
    console.log('\n🔍 6. Gathering overall statistics...');
    
    auditResults.totalAppointments = await Appointment.count();
    auditResults.totalUsers = await User.count();
    auditResults.totalPatients = await Patient.count();
    auditResults.totalDoctors = await Doctor.count();

    const appointmentsWithDoctors = await Appointment.count({
      include: [{
        model: Doctor,
        as: 'doctorDetails',
        required: true
      }]
    });

    const appointmentsWithPatients = await Appointment.count({
      include: [{
        model: Patient,
        as: 'patientDetails',
        required: true
      }]
    });

    console.log(`   📊 Total appointments: ${auditResults.totalAppointments}`);
    console.log(`   📊 Total users: ${auditResults.totalUsers}`);
    console.log(`   📊 Total patients: ${auditResults.totalPatients}`);
    console.log(`   📊 Total doctors: ${auditResults.totalDoctors}`);
    console.log(`   📊 Appointments with doctor records: ${appointmentsWithDoctors}`);
    console.log(`   📊 Appointments with patient records: ${appointmentsWithPatients}`);

    // 7. Calculate integrity percentages
    const doctorIntegrity = auditResults.totalAppointments > 0 
      ? ((appointmentsWithDoctors / auditResults.totalAppointments) * 100).toFixed(1)
      : '100.0';
    
    const patientIntegrity = auditResults.totalAppointments > 0 
      ? ((appointmentsWithPatients / auditResults.totalAppointments) * 100).toFixed(1)
      : '100.0';

    console.log(`   📊 Doctor record integrity: ${doctorIntegrity}%`);
    console.log(`   📊 Patient record integrity: ${patientIntegrity}%`);

    // 8. Generate audit summary
    console.log('\n📋 ========== AUDIT SUMMARY ==========');
    
    const totalIssues = auditResults.issues.length;
    const highSeverityIssues = auditResults.issues.filter(issue => issue.severity === 'high').length;
    const mediumSeverityIssues = auditResults.issues.filter(issue => issue.severity === 'medium').length;

    if (totalIssues === 0) {
      console.log('✅ DATABASE INTEGRITY: EXCELLENT');
      console.log('✅ No integrity issues found!');
    } else {
      console.log(`❌ DATABASE INTEGRITY: ${highSeverityIssues > 0 ? 'CRITICAL' : 'NEEDS ATTENTION'}`);
      console.log(`❌ Total issues found: ${totalIssues}`);
      console.log(`❌ High severity: ${highSeverityIssues}`);
      console.log(`❌ Medium severity: ${mediumSeverityIssues}`);
      
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      auditResults.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.description} (${issue.count} affected)`);
        if (issue.severity === 'high') {
          console.log(`      🚨 HIGH PRIORITY - Fix immediately`);
        }
      });
    }

    console.log('\n✅ ========== AUDIT COMPLETE ==========');
    
    return auditResults;

  } catch (error) {
    console.error('❌ Database audit failed:', error);
    throw error;
  }
};

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  auditDatabase()
    .then((results) => {
      console.log('\n🎉 Database audit completed successfully!');
      
      // Exit with error code if critical issues found
      const criticalIssues = results.issues.filter(issue => issue.severity === 'high').length;
      process.exit(criticalIssues > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Database audit failed:', error);
      process.exit(1);
    });
}

export default auditDatabase;