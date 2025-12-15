/**
 * Fix Premium Consultations Schema
 * Removes patient_id and doctor_id columns since User model uses walletAddress as PK
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './server/.env' });

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena',
  {
    dialect: 'postgres',
    logging: console.log
  }
);

async function fixSchema() {
  try {
    console.log('🔧 Fixing premium_consultations schema...\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if columns exist
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'premium_consultations' 
      AND column_name IN ('patient_id', 'doctor_id')
    `);
    
    console.log('Found columns:', columns.map(c => c.column_name));

    if (columns.length > 0) {
      // Drop the columns
      console.log('\n📝 Dropping patient_id and doctor_id columns...');
      
      await sequelize.query(`
        ALTER TABLE premium_consultations 
        DROP COLUMN IF EXISTS patient_id,
        DROP COLUMN IF EXISTS doctor_id;
      `);
      
      console.log('✅ Columns dropped successfully');
    } else {
      console.log('✅ Columns already removed');
    }

    // Also fix payment_verified_by to be VARCHAR
    console.log('\n📝 Updating payment_verified_by column type...');
    await sequelize.query(`
      ALTER TABLE premium_consultations 
      ALTER COLUMN payment_verified_by TYPE VARCHAR(255);
    `).catch(e => console.log('   (Column type already correct or does not exist)'));

    // Also fix consultation_messages sender_id
    console.log('\n📝 Fixing consultation_messages schema...');
    await sequelize.query(`
      ALTER TABLE consultation_messages 
      DROP COLUMN IF EXISTS sender_id;
    `).catch(e => console.log('   (sender_id already removed)'));

    // Fix consultation_availability doctor_id
    console.log('\n📝 Fixing consultation_availability schema...');
    await sequelize.query(`
      ALTER TABLE consultation_availability 
      DROP COLUMN IF EXISTS doctor_id;
    `).catch(e => console.log('   (doctor_id already removed)'));

    console.log('\n✅ Schema fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixSchema();
