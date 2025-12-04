import { testConnection } from './config/database.js';

async function testDB() {
  try {
    console.log('Testing database connection...');
    const connected = await testConnection();
    if (connected) {
      console.log('‚úÖ Database connection successful');
      process.exit(0);
    } else {
      console.log('‚ùå Database connection failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Ì≤• Database test error:', error);
    process.exit(1);
  }
}

testDB();
