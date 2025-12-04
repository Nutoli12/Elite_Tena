import sequelize from '../src/config/db.js';
import '../src/models/index.js'; // This will import all models and set up associations

async function runMigrations() {
  try {
    console.log('Running migrations for all models...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // Sync all models with the database
    await sequelize.sync({ force: false }); // Use { force: true } only in development to drop and recreate tables
    console.log('All models synchronized successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
