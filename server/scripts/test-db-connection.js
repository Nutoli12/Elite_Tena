// server/test-db-connection.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const testDatabase = async () => {
  console.log('🧪 Testing Database Connection...\n');
  console.log('Database URL:', process.env.DATABASE_URL?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

  try {
    // 1. Test basic connection
    console.log('1. Testing basic database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // 2. Check if database exists and get version
    console.log('\n2. Checking database version...');
    const [results] = await sequelize.query('SELECT version();');
    console.log('✅ PostgreSQL Version:', results[0].version);

    // 3. List all tables
    console.log('\n3. Checking existing tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`✅ Found ${tables.length} tables:`, tables.map(t => t.table_name));

    // 4. Test simple query
    console.log('\n4. Testing simple query...');
    const [testQuery] = await sequelize.query('SELECT 1 as test_value');
    console.log('✅ Simple query test:', testQuery[0].test_value);

    console.log('\n🎉 DATABASE CONNECTION SUCCESSFUL!');
    console.log('✅ Database is accessible');
    console.log('✅ Connection parameters are correct');
    console.log('✅ Queries are executing properly');

  } catch (error) {
    console.error('\n❌ DATABASE CONNECTION FAILED:');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Check if PostgreSQL is running: docker ps');
    console.error('2. Verify DATABASE_URL in .env file');
    console.error('3. Check if database "elite_tena" exists');
    console.error('4. Verify PostgreSQL credentials');
    console.error('5. Check if port 5432 is accessible');
    
    if (error.original) {
      console.error('\nOriginal error:', error.original);
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run the test
testDatabase();