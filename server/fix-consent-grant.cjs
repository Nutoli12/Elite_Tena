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

async function fixConsentGrant() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get the pending consent request
    const [consents] = await sequelize.query(`
      SELECT 
        id,
        appointment_id,
        patient_wallet_address,
        doctor_wallet_address,
        status,
        permissions
      FROM appointment_consents
      WHERE status = 'requested'
    `);

    if (consents.length === 0) {
      console.log('No pending consent requests found');
      return;
    }

    console.log('📋 Found pending consent requests:');
    console.table(consents);

    // Manually grant the consent
    for (const consent of consents) {
      console.log(`\n🔧 Granting consent for appointment ${consent.appointment_id}...`);
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      // Update consent record
      await sequelize.query(`
        UPDATE appointment_consents 
        SET status = 'granted',
            granted_at = :now,
            expires_at = :expiresAt,
            updated_at = :now
        WHERE id = :consentId
      `, {
        replacements: { 
          consentId: consent.id,
          now: now.toISOString(),
          expiresAt: expiresAt.toISOString()
        }
      });
      console.log('✅ Consent record updated');

      // Update appointment workflow state
      await sequelize.query(`
        UPDATE appointments 
        SET workflow_state = 'consent_granted',
            consent_status = 'granted',
            consent_granted_at = :now
        WHERE id = :appointmentId
      `, {
        replacements: { 
          appointmentId: consent.appointment_id,
          now: now.toISOString()
        }
      });
      console.log('✅ Appointment workflow state updated');
    }

    // Verify the fix
    console.log('\n📋 VERIFICATION:');
    const [updatedConsents] = await sequelize.query(`
      SELECT 
        ac.id,
        ac.appointment_id,
        ac.status as consent_status,
        ac.granted_at,
        a.workflow_state,
        a.consent_status as appointment_consent_status
      FROM appointment_consents ac
      JOIN appointments a ON ac.appointment_id = a.id
    `);
    console.table(updatedConsents);

    console.log('\n✅ Consent grant fix complete! The doctor should now be able to start the consultation.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixConsentGrant();
