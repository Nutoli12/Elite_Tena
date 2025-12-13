const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'elitetena',
  username: 'admin',
  password: 'password',
  logging: console.log
});

async function fixTrigger() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check for triggers on consents table
    const [triggers] = await sequelize.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'consents'
    `);
    console.log('📋 Triggers on consents table:', triggers);

    // Drop the problematic trigger if it exists
    console.log('\n🔧 Dropping problematic trigger...');
    await sequelize.query(`
      DROP TRIGGER IF EXISTS update_consents_updated_at ON consents
    `);
    console.log('✅ Trigger dropped (if existed)');

    // Also try to drop any other update_updated_at triggers
    await sequelize.query(`
      DROP TRIGGER IF EXISTS set_updated_at ON consents
    `);

    // Check again
    const [triggersAfter] = await sequelize.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'consents'
    `);
    console.log('\n📋 Triggers after cleanup:', triggersAfter);

    console.log('\n✅ Trigger fix complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixTrigger();
