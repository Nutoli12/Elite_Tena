import sequelize from '../src/config/db.js';
import { User, Session, FileMetadata, Appointment } from '../src/models/index.js';

async function viewDatabase() {
  try {
    console.log('Ì≥ä ELITE TENA DATABASE STATUS\n');
    
    // Get all records from each table
    const users = await User.findAll();
    const sessions = await Session.findAll();
    const files = await FileMetadata.findAll();
    const appointments = await Appointment.findAll();

    console.log('Ì±• USERS TABLE:');
    console.log('Total users:', users.length);
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`  - ${user.walletAddress} (${user.role}) - ${user.email || 'No email'} - Specialization: ${user.specialization || 'None'}`);
      });
    } else {
      console.log('  No users found');
    }

    console.log('\nÌ¥ê SESSIONS TABLE:');
    console.log('Total sessions:', sessions.length);
    if (sessions.length > 0) {
      sessions.forEach(session => {
        console.log(`  - ${session.walletAddress} - Role: ${session.role} - Expires: ${session.expiresAt}`);
      });
    } else {
      console.log('  No sessions found');
    }

    console.log('\nÌ≥Å FILES TABLE:');
    console.log('Total files:', files.length);
    if (files.length > 0) {
      files.forEach(file => {
        console.log(`  - ${file.originalFilename} (${file.fileSize} bytes) - CID: ${file.cid} - Type: ${file.fileType}`);
      });
    } else {
      console.log('  No files found');
    }

    console.log('\nÌ≥Ö APPOINTMENTS TABLE:');
    console.log('Total appointments:', appointments.length);
    if (appointments.length > 0) {
      appointments.forEach(apt => {
        console.log(`  - Patient: ${apt.patientWallet} -> Doctor: ${apt.doctorWallet} - Status: ${apt.status} - Date: ${apt.appointmentDate}`);
      });
    } else {
      console.log('  No appointments found');
    }

    console.log('\n‚úÖ Database check completed successfully!');

  } catch (error) {
    console.error('‚ùå Error viewing database:', error);
  } finally {
    await sequelize.close();
  }
}

viewDatabase();
