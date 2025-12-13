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

async function checkSchema() {
  try {
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments'
    `);
    console.log('Appointment columns:', columns.map(c => c.column_name).join(', '));
  } catch (e) {
    console.error(e.message);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
