const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena',
  { dialect: 'postgres', logging: false }
);

async function checkColumns() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Get actual column names from messages table
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Actual messages table columns:');
    results.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkColumns();