const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena',
  { dialect: 'postgres', logging: false }
);

async function check() {
  try {
    await sequelize.authenticate();
    
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    
    console.log('Messages table columns:');
    columns.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

check();
