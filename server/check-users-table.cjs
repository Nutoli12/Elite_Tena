require('dotenv').config();
const { Sequelize } = require('sequelize');

async function checkUsersTable() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    // Check table structure
    const [columns] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Users table columns:', JSON.stringify(columns, null, 2));
    
    // Check test user
    const [results] = await sequelize.query("SELECT * FROM users WHERE email = 'patient@test.com' LIMIT 1");
    console.log('Test user:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUsersTable();