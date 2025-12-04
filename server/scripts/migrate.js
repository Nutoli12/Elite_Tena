import sequelize from '../src/config/db.js';
import { up } from '../migrations/create-user.js';

async function runMigration() {
  try {
    console.log('Running migration...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    await up(sequelize.getQueryInterface(), sequelize.Sequelize);
    console.log('Migration completed successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
