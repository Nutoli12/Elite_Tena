import db from '../src/models/index.js';

const check = async () => {
  try {
    const records = await db.MedicalRecord.findAll({
      attributes: ['id', 'patientWalletAddress', 'recordType', 'title']
    });
    
    console.log(`\nFound ${records.length} medical record(s):\n`);
    records.forEach(r => {
      console.log(`  Type: ${r.recordType}`);
      console.log(`  Title: ${r.title}`);
      console.log(`  Patient: ${r.patientWalletAddress}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.sequelize.close();
  }
};

check();
