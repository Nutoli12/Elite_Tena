/**
 * Add missing consultationDetails column to appointments table
 */
import db from '../src/models/index.js';

const addMissingColumn = async () => {
    try {
        console.log('Adding missing consultationDetails column...');

        // Use raw SQL to add the column if it doesn't exist
        await db.sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'appointments' 
          AND column_name = 'consultationDetails'
        ) THEN 
          ALTER TABLE appointments ADD COLUMN "consultationDetails" JSONB;
          RAISE NOTICE 'Column consultationDetails added';
        ELSE
          RAISE NOTICE 'Column consultationDetails already exists';
        END IF;
      END $$;
    `);

        console.log('✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.sequelize.close();
    }
};

addMissingColumn();
