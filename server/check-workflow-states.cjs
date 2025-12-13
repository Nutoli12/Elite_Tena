const { Client } = require('pg');

async function checkWorkflowStates() {
  console.log('🔍 Checking current workflow states...');

  try {
    const dbConfig = {
      host: 'localhost',
      port: 5432,
      database: 'elitetena',
      user: 'admin',
      password: 'password'
    };

    const client = new Client(dbConfig);
    await client.connect();

    // Check if appointments table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
      );
    `);
    
    console.log('📊 Appointments table exists:', tableExists.rows[0].exists);

    if (tableExists.rows[0].exists) {
      // Check current columns
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'appointments'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Current appointments table columns:');
      columns.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Check if workflow_state column exists
      const workflowColumn = columns.rows.find(col => col.column_name === 'workflow_state');
      if (workflowColumn) {
        console.log('✅ workflow_state column exists');
        
        // Check enum values
        const enumValues = await client.query(`
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname LIKE '%workflow_state%'
          )
          ORDER BY enumsortorder;
        `);
        
        console.log('📝 Current workflow_state enum values:');
        enumValues.rows.forEach(val => {
          console.log(`   - ${val.enumlabel}`);
        });
      } else {
        console.log('❌ workflow_state column does not exist');
      }

      // Check consent-related columns
      const consentColumns = ['consent_status', 'consent_required', 'consent_expires_at', 'consent_granted_at'];
      console.log('🔐 Consent-related columns:');
      consentColumns.forEach(colName => {
        const exists = columns.rows.find(col => col.column_name === colName);
        console.log(`   ${colName}: ${exists ? '✅ exists' : '❌ missing'}`);
      });
    }

    await client.end();
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkWorkflowStates().catch(console.error);