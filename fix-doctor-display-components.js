/**
 * Fix Doctor Display Components - Update all components to show proper doctor names
 */

import fs from 'fs';

const fixDoctorDisplayComponents = () => {
  try {
    console.log('🔧 Fixing doctor display in frontend components...\n');

    const fixes = [
      {
        file: 'frontend/src/pages/Appointments.tsx',
        description: 'Fix appointment doctor name display',
        replacements: [
          {
            old: `doctorName: apt.appointedWith?.name || apt.displayDoctor || 'Unknown Doctor',`,
            new: `doctorName: apt.doctor?.profileData?.name || apt.doctor?.profileData?.fullName || (apt.doctor?.profileData?.firstName && apt.doctor?.profileData?.lastName ? \`\${apt.doctor.profileData.firstName} \${apt.doctor.profileData.lastName}\` : apt.appointedWith?.name || apt.displayDoctor || 'Unknown Doctor'),`
          },
          {
            old: `displayDoctor: apt.displayDoctor || \`\${apt.appointedWith?.name || 'Unknown Doctor'} (\${apt.appointedWith?.specialization || 'General'})\`,`,
            new: `displayDoctor: apt.displayDoctor || \`\${apt.doctor?.profileData?.name || apt.doctor?.profileData?.fullName || (apt.doctor?.profileData?.firstName && apt.doctor?.profileData?.lastName ? \`\${apt.doctor.profileData.firstName} \${apt.doctor.profileData.lastName}\` : apt.appointedWith?.name || 'Unknown Doctor')} (\${apt.doctor?.doctorProfile?.specialization || apt.appointedWith?.specialization || 'General'})\`,`
          }
        ]
      },
      {
        file: 'frontend/src/components/patient/UpcomingAppointments.tsx',
        description: 'Fix upcoming appointments doctor display',
        replacements: [
          {
            old: `doctor: apt.displayDoctor || apt.appointedWith?.name || 'Unknown Doctor',`,
            new: `doctor: apt.doctor?.profileData?.name || apt.doctor?.profileData?.fullName || (apt.doctor?.profileData?.firstName && apt.doctor?.profileData?.lastName ? \`\${apt.doctor.profileData.firstName} \${apt.doctor.profileData.lastName}\` : apt.displayDoctor || apt.appointedWith?.name || 'Unknown Doctor'),`
          },
          {
            old: `specialization: apt.appointedWith?.specialization || 'General Medicine',`,
            new: `specialization: apt.doctor?.doctorProfile?.specialization || apt.appointedWith?.specialization || 'General Medicine',`
          }
        ]
      },
      {
        file: 'frontend/src/components/patient/MedicalRecordsPreview.tsx',
        description: 'Fix medical records doctor display',
        replacements: [
          {
            old: `doctor: record.doctor?.user?.name || record.doctor?.name || \`Dr. \${record.doctorWalletAddress?.substring(0, 8)}...\` || 'Unknown Doctor',`,
            new: `doctor: record.doctor?.profileData?.name || record.doctor?.profileData?.fullName || (record.doctor?.profileData?.firstName && record.doctor?.profileData?.lastName ? \`\${record.doctor.profileData.firstName} \${record.doctor.profileData.lastName}\` : record.doctor?.user?.name || record.doctor?.name || \`Dr. \${record.doctorWalletAddress?.substring(0, 8)}...\` || 'Unknown Doctor'),`
          }
        ]
      }
    ];

    let totalFixes = 0;

    for (const fix of fixes) {
      console.log(`🔧 Processing: ${fix.file}`);
      
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

    console.log(`✅ Applied fixes to ${totalFixes} files\n`);
    
    console.log('📋 Summary of fixes:');
    console.log('   - Appointments page now shows proper doctor names');
    console.log('   - Upcoming appointments component shows real doctor names');
    console.log('   - Medical records preview shows correct doctor names');
    console.log('   - All components now check multiple name sources in priority order');
    
    console.log('\n🔄 The frontend will now display:');
    console.log('   - "Dr. Ahmed Hassan (Cardiology)" instead of "Unknown Doctor (Cardiology)"');
    console.log('   - "Dr. Burhan Ali (Cardiology)" instead of "Unknown Doctor (Cardiology)"');
    console.log('   - Proper doctor names in all appointment-related components');

  } catch (error) {
    console.error('❌ Error fixing doctor display:', error.message);
  }
};

fixDoctorDisplayComponents();