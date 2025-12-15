#!/usr/bin/env node

/**
 * Simple Lab Worksheet Tables Creation
 * Uses Sequelize sync to create the tables properly
 */

import db from './server/src/models/index.js';

async function createWorksheetTables() {
  try {
    console.log('🧪 Creating Lab Worksheet System Tables...');

    // Sync the new models to create tables
    console.log('📝 Creating lab_worksheets table...');
    await db.LabWorksheet.sync({ force: false });
    console.log('✅ lab_worksheets table created');

    console.log('📝 Creating sample_collections table...');
    await db.SampleCollection.sync({ force: false });
    console.log('✅ sample_collections table created');

    console.log('📝 Creating processing_records table...');
    await db.ProcessingRecord.sync({ force: false });
    console.log('✅ processing_records table created');

    // Test the tables
    console.log('\n🔍 Testing tables...');
    
    const worksheetCount = await db.LabWorksheet.count();
    console.log(`✅ lab_worksheets: ${worksheetCount} records`);
    
    const sampleCount = await db.SampleCollection.count();
    console.log(`✅ sample_collections: ${sampleCount} records`);
    
    const processingCount = await db.ProcessingRecord.count();
    console.log(`✅ processing_records: ${processingCount} records`);

    // Create some test data
    console.log('\n📋 Creating test worksheet...');
    
    // First check if we have any lab orders
    const labOrders = await db.LabWorkflowOrder.findAll({ limit: 2 });
    
    if (labOrders.length > 0) {
      for (const order of labOrders) {
        const accessionNumber = `LAB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(order.id).padStart(4, '0')}`;
        
        try {
          const worksheet = await db.LabWorksheet.create({
            accessionNumber,
            labOrderId: order.id,
            technicianId: '0x1234567890123456789012345678901234567890',
            sampleCollectionStatus: 'pending',
            processingStatus: 'queued',
            chainOfCustody: [],
            qualityControlChecks: {},
            notes: 'Test worksheet created automatically'
          });
          
          console.log(`✅ Created worksheet ${worksheet.accessionNumber} for order ${order.id}`);
        } catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            console.log(`⚠️  Worksheet for order ${order.id} already exists`);
          } else {
            console.error(`❌ Error creating worksheet for order ${order.id}:`, error.message);
          }
        }
      }
    } else {
      console.log('⚠️  No lab orders found - worksheets will be created when orders exist');
    }

    console.log('\n🎉 Lab Worksheet System Tables Created Successfully!');
    console.log('\n📋 Available Tables:');
    console.log('   • lab_worksheets - Main worksheet records');
    console.log('   • sample_collections - Sample collection details');
    console.log('   • processing_records - Processing and analysis records');
    console.log('\n🔄 Workflow Now Available:');
    console.log('   1. Doctor creates lab order');
    console.log('   2. Technician creates worksheet (POST /api/lab-workflow/worksheets)');
    console.log('   3. Record sample collection (POST /api/lab-workflow/worksheets/:id/sample-collection)');
    console.log('   4. Start processing (POST /api/lab-workflow/worksheets/:id/start-processing)');
    console.log('   5. Enter results and complete workflow');

  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Run the creation
createWorksheetTables();