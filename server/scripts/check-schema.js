import sequelize from '../src/config/db.js';

async function checkSchema() {
  try {
    const [tables] = await sequelize.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    console.log('Ì∑ÉÔ∏è  DATABASE SCHEMA STRUCTURE:\n');
    
    let currentTable = '';
    tables.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`Ì≥ã TABLE: ${currentTable}`);
      }
      console.log(`   ‚îî‚îÄ ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n‚úÖ Schema check completed!');

  } catch (error) {
    console.error('‚ùå Error checking schema:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
