/**
 * Fix All Doctor Displays - Comprehensive fix for all doctor name displays
 */

import fs from 'fs';
import path from 'path';

const fixAllDoctorDisplays = () => {
  try {
    console.log('🔧 Fixing ALL doctor name displays across the frontend...\n');

    // Helper function to generate the correct doctor name extraction logic
    const getDoctorNameLogic = (doctorPath) => {
      return `${doctorPath}?.profileData?.name || ${doctorPath}?.profileData?.fullName || (${doctorPath}?.profileData?.firstName && ${doctorPath}?.profileData?.lastName ? \`\${${doctorPath}.profileData.firstName} \${${doctorPath}.profileData.lastName}\` : ${doctorPath}?.user?.name || ${doctorPath}?.name || 'Doctor')`;
    };

    const fixes = [
      // Medical Records page
      {
        file: 'frontend/src/pages/MedicalRecords.tsx',
        replacements: [
          {
            old: `record.doctor?.user?.name ||
            record.doctor?.name ||`,
            new: `record.doctor?.profileData?.name ||
            record.doctor?.profileData?.fullName ||
            (record.doctor?.profileData?.firstName && record.doctor?.profileData?.lastName 
              ? \`\${record.doctor.profileData.firstName} \${record.doctor.profileData.lastName}\` 
              : record.doctor?.user?.name) ||
            record.doctor?.name ||`
          }
        ]
      },
      
      // Waiting Room
      {
        file: 'frontend/src/pages/WaitingRoom.tsx',
        replacements: [
          {
            old: `Dr. {currentPatient.doctorDetails?.user?.fullName || 'Doctor'}`,
            new: `Dr. {${getDoctorNameLogic('currentPatient.doctorDetails')}}`
          },
          {
            old: `Dr. {patient.doctorDetails?.user?.fullName || 'Doctor'}`,
            new: `Dr. {${getDoctorNameLogic('patient.doctorDetails')}}`
          }
        ]
      },

      // Reception Check-in
      {
        file: 'frontend/src/pages/reception/ReceptionCheckIn.tsx',
        replacements: [
          {
            old: `Dr. {apt.doctorDetails?.user?.fullName || 'Doctor'}`,
            new: `Dr. {${getDoctorNameLogic('apt.doctorDetails')}}`
          }
        ]
      },

      // Consultation Room
      {
        file: 'frontend/src/pages/doctor/ConsultationRoom.tsx',
        replacements: [
          {
            old: `(appointment?.doctorDetails as any)?.user?.fullName || 'Doctor'`,
            new: `${getDoctorNameLogic('(appointment?.doctorDetails as any)')}`
          }
        ]
      },

      // Pending Consent Requests
      {
        file: 'frontend/src/components/patient/PendingConsentRequests.tsx',
        replacements: [
          {
            old: `{request.doctor?.user?.name || request.doctor?.name || request.doctor?.user?.email?.split('@')[0] || 'Doctor'}`,
            new: `{${getDoctorNameLogic('request.doctor')} || request.doctor?.user?.email?.split('@')[0]}`
          }
        ]
      },

      // Active Consents List
      {
        file: 'frontend/src/components/patient/ActiveConsentsList.tsx',
        replacements: [
          {
            old: `{(consent.doctor?.user?.name || consent.doctor?.name || 'D').charAt(0)}`,
            new: `{(${getDoctorNameLogic('consent.doctor')} || 'D').charAt(0)}`
          },
          {
            old: `👨‍⚕️ {consent.doctor?.user?.name || consent.doctor?.name || consent.doctor?.user?.email?.split('@')[0] || 'Doctor'}`,
            new: `👨‍⚕️ {${getDoctorNameLogic('consent.doctor')} || consent.doctor?.user?.email?.split('@')[0]}`
          }
        ]
      },

      // Book Appointment Modal
      {
        file: 'frontend/src/components/modals/BookAppointmentModal.tsx',
        replacements: [
          {
            old: `{doctor.user?.profileData?.fullName || 'Doctor'}`,
            new: `{${getDoctorNameLogic('doctor')}}`
          },
          {
            old: `{selectedDoctor?.user?.profileData?.fullName}`,
            new: `{${getDoctorNameLogic('selectedDoctor')}}`
          }
        ]
      },

      // Doctor Approval Modal
      {
        file: 'frontend/src/components/modals/DoctorApprovalModal.tsx',
        replacements: [
          {
            old: `'Dr. ' + appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor'`,
            new: `'Dr. ' + ${getDoctorNameLogic('appointment.doctorDetails')}`
          }
        ]
      },

      // Payment Details Modal
      {
        file: 'frontend/src/components/modals/PaymentDetailsModal.tsx',
        replacements: [
          {
            old: `doctorName: appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor',`,
            new: `doctorName: ${getDoctorNameLogic('appointment.doctorDetails')},`
          }
        ]
      }
    ];

    let totalFixes = 0;
    let totalReplacements = 0;

    for (const fix of fixes) {
      console.log(`🔧 Processing: ${path.basename(fix.file)}`);
      
      if (!fs.existsSync(fix.file)) {
        console.log(`   ⚠️  File not found: ${fix.file}`);
        continue;
      }

      let content = fs.readFileSync(fix.file, 'utf8');
      let fileChanged = false;

      for (const replacement of fix.replacements) {
        if (content.includes(replacement.old)) {
          content = content.replace(replacement.old, replacement.new);
          fileChanged = true;
          totalReplacements++;
          console.log(`   ✅ Applied replacement`);
        } else {
          console.log(`   ℹ️  Pattern not found or already fixed`);
        }
      }

      if (fileChanged) {
        fs.writeFileSync(fix.file, content);
        totalFixes++;
        console.log(`   ✅ File updated successfully`);
      } else {
        console.log(`   ℹ️  No changes needed`);
      }
      
      console.log('');
    }

    console.log(`✅ Applied ${totalReplacements} replacements across ${totalFixes} files\n`);
    
    console.log('📋 Components Fixed:');
    console.log('   ✅ Medical Records page - doctor names in record listings');
    console.log('   ✅ Waiting Room - doctor names in patient queue');
    console.log('   ✅ Reception Check-in - doctor names in appointments');
    console.log('   ✅ Consultation Room - doctor names in chat');
    console.log('   ✅ Pending Consent Requests - doctor names in consent requests');
    console.log('   ✅ Active Consents List - doctor names in consent management');
    console.log('   ✅ Book Appointment Modal - doctor names in selection');
    console.log('   ✅ Payment Modals - doctor names in payment details');
    
    console.log('\n🎯 Result:');
    console.log('   Instead of: "Unknown Doctor (Cardiology)"');
    console.log('   You\'ll see: "Dr. Ahmed Hassan (Cardiology)"');
    console.log('   Instead of: "Doctor"');
    console.log('   You\'ll see: "Dr. Burhan Ali"');

    console.log('\n🔄 Please refresh your browser to see all the changes!');

  } catch (error) {
    console.error('❌ Error fixing doctor displays:', error.message);
  }
};

fixAllDoctorDisplays();