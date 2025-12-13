// Debug script to check consent records and diagnose 500 error
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'elite_tena',
  username: 'postgres',
  password: 'postgres',
  logging: false
});

async function debugConsent() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check if consents table exists
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'consents'
    `);
    console.log('📋 Consents table exists:', tables.length > 0);

    if (tables.length === 0) {
      console.log('\n❌ Consents table does not exist! Need to run migration.');
      return;
    }

    // Check table structure
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'consents'
      ORDER BY ordinal_position
    `);
    console.log('\n📊 Consents table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check all consent records
    const [consents] = await sequelize.query(`
      SELECT id, "patientWalletAddress", "doctorWalletAddress", status, purpose, "createdAt"
      FROM consents
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    console.log('\n📋 Recent consent records:', consents.length);
    consents.forEach(c => {
      console.log(`  ID: ${c.id}`);
      console.log(`    Patient: ${c.patientWalletAddress}`);
      console.log(`    Doctor: ${c.doctorWalletAddress}`);
      console.log(`    Status: ${c.status}`);
      console.log(`    Purpose: ${c.purpose}`);
      console.log('');
    });

    // Check for the specific consent ID
    const consentId = '835b3535-977f-450e-8104-83bdb74b4f19';
    const [specificConsent] = await sequelize.query(`
      SELECT * FROM consents WHERE id = :id
    `, { replacements: { id: consentId } });
    
    console.log(`\n🔍 Looking for consent ID: ${consentId}`);
    if (specificConsent.length > 0) {
      console.log('✅ Found consent:', JSON.stringify(specificConsent[0], null, 2));
    } else {
      console.log('❌ Consent not found with this ID');
      
      // Check if this is an appointment ID
      const [appointment] = await sequelize.query(`
        SELECT id, "patientWallet", "doctorWallet", status FROM appointments WHERE id = :id
      `, { replacements: { id: consentId } });
      
      if (appointment.length > 0) {
        console.log('\n⚠️ This ID is an APPOINTMENT, not a consent!');
        console.log('Appointment:', JSON.stringify(appointment[0], null, 2));
      }
    }

    // Check pending consents
    const [pendingConsents] = await sequelize.query(`
      SELECT id, "patientWalletAddress", status FROM consents WHERE status = 'pending'
    `);
    console.log('\n📋 Pending consents:', pendingConsents.length);
    pendingConsents.forEach(c => {
      console.log(`  ID: ${c.id}, Patient: ${c.patientWalletAddress}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
  } finally {
    await sequelize.close();
  }
}

debugConsent();
