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

async function checkEnum() {
  try {
    const [result] = await sequelize.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_consents_status')
    `);
    console.log('Status enum values:', result.map(x => x.enumlabel));
    
    // Check if 'active' is in the enum
    const hasActive = result.some(x => x.enumlabel === 'active');
    console.log('Has "active" status:', hasActive);
    
    if (!hasActive) {
      console.log('\n⚠️ "active" status is missing from enum! Adding it...');
      await sequelize.query(`ALTER TYPE "enum_consents_status" ADD VALUE IF NOT EXISTS 'active'`);
      console.log('✅ Added "active" to enum');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkEnum();
