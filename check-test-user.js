const { Sequelize } = require('sequelize');

async function checkTestUser() {
  const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena', {
    dialect: 'postgres',
    logging: false
  });

  try {
    const [results] = await sequelize.query("SELECT email, role, wallet_address FROM users WHERE email = 'patient@test.com'");
    console.log('Test user:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTestUser();