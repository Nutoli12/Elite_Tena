const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'elitetena',
  username: 'admin',
  password: 'password',
  logging: false
});

async function debugConsentStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check appointment_consents table
    console.log('📋 APPOINTMENT CONSENTS:');
    const [consents] = await sequelize.query(`
      SELECT 
        id,
        appointment_id,
        patient_wallet_address,
        doctor_wallet_address,
        status,
        granted_at,
        expires_at,
        created_at
      FROM appointment_consents
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(consents);

    // Check appointments workflow state
    console.log('\n📋 APPOINTMENTS WORKFLOW STATE:');
    const [appointments] = await sequelize.query(`
      SELECT 
        id,
        patient_wallet_address,
        doctor_wallet_address,
        status,
        workflow_state,
        consent_status,
        requires_consent,
        consent_granted_at
      FROM appointments
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(appointments);

    // Check if there's a mismatch
    console.log('\n🔍 CHECKING FOR MISMATCHES:');
    const [mismatches] = await sequelize.query(`
      SELECT 
        a.id as appointment_id,
        a.workflow_state as appointment_workflow_state,
        a.consent_status as appointment_consent_status,
        ac.status as consent_record_status,
        ac.granted_at
      FROM appointments a
      LEFT JOIN appointment_consents ac ON a.id = ac.appointment_id
      WHERE ac.status = 'granted' AND a.workflow_state != 'consent_granted'
    `);
    
    if (mismatches.length > 0) {
      console.log('❌ FOUND MISMATCHES - Consent granted but appointment not updated:');
      console.table(mismatches);
      
      // Fix the mismatches
      console.log('\n🔧 FIXING MISMATCHES...');
      for (const mismatch of mismatches) {
        await sequelize.query(`
          UPDATE appointments 
          SET workflow_state = 'consent_granted', 
              consent_status = 'granted',
              consent_granted_at = NOW()
          WHERE id = :appointmentId
        `, {
          replacements: { appointmentId: mismatch.appointment_id }
        });
        console.log(`✅ Fixed appointment ${mismatch.appointment_id}`);
      }
    } else {
      console.log('✅ No mismatches found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

debugConsentStatus();
