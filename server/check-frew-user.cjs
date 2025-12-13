require('dotenv').config();
const { Sequelize } = require('sequelize');

async function checkFrewUser() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    const [results] = await sequelize.query("SELECT email, role, \"walletAddress\" FROM users WHERE email = 'frew@gmail.com'");
    console.log('Frew user:', JSON.stringify(results, null, 2));
    
    if (results.length === 0) {
      console.log('❌ User frew@gmail.com not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkFrewUser();