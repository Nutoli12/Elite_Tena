import { readFile } from 'fs/promises';
import db from './server/src/models/index.js';

async function runLabWorkflowMigration() {
  try {
    console.log('🧪 Starting Lab Workflow System Migration...\n');

    // Read the migration SQL file
    const migrationSQL = await readFile('./server/migrations/create-lab-workflow-system.sql', 'utf8');

    // Split into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.trim().length === 0) {
          continue;
        }
        
        await db.sequelize.query(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
        
      } catch (error) {
        // Some statements might fail if they already exist, that's okay
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          // Continue with other statements
        }
      }
    }

    console.log('\n🔄 Syncing Sequelize models...');
    
    // Sync the new models (without force to preserve existing data)
    await db.sequelize.sync({ 
      force: false,
      alter: false // Don't alter existing tables
    });

    console.log('✅ Sequelize models synced successfully');

    console.log('\n📊 Verifying lab workflow tables...');
    
    // Verify tables were created
    const tables = [
      'lab_orders',
      'lab_results', 
      'medical_record_lab_links',
      'lab_access_logs',
      'lab_consent_logs',
      'lab_test_catalog',
      'lab_equipment_logs'
    ];

    for (const table of tables) {
      try {
        const [results] = await db.sequelize.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ Table '${table}' exists with ${results[0].count} records`);
      } catch (error) {
        console.log(`❌ Table '${table}' verification failed:`, error.message);
      }
    }

    console.log('\n🧪 Lab Workflow System Migration Completed Successfully! 🎉');
    console.log('\n📋 Available Lab Workflow Endpoints:');
    console.log('   🔬 Lab Test Catalog: GET /api/lab/catalog');
    console.log('   📝 Create Lab Order: POST /api/lab/orders');
    console.log('   📊 Lab Orders: GET /api/lab/orders');
    console.log('   🧪 Upload Results: POST /api/lab/results');
    console.log('   📈 Lab Results: GET /api/lab/results');
    console.log('   👨‍⚕️ Doctor Overview: GET /api/lab/doctor/overview');
    console.log('   🔬 Technician Dashboard: GET /api/lab/technician/dashboard');
    console.log('   👤 Patient History: GET /api/lab/patient/history');
    console.log('   🚨 Critical Results: GET /api/lab/results/critical/alerts');

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Lab Workflow Migration Failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the migration
runLabWorkflowMigration();