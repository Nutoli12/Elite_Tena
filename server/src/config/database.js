import db from '../models/index.js';

export const testConnection = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

export default testConnection;
