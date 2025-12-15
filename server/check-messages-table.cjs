const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena',
  { dialect: 'postgres', logging: console.log }
);

async function check() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Add missing columns to messages table
    console.log('\n📝 Adding missing columns to messages table...');
    
    const alterQueries = [
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size INTEGER`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(100)`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB`
    ];

    for (const query of alterQueries) {
      try {
        await sequelize.query(query);
        console.log('✅', query.substring(0, 60) + '...');
      } catch (e) {
        console.log('⚠️ Column may already exist:', e.message.substring(0, 50));
      }
    }

    console.log('\n✅ Messages table updated');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

check();
