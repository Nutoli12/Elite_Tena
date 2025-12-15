#!/usr/bin/env node

/**
 * Debug Dashboard Error
 * Check what's causing the 500 error in technician dashboard
 */

import db from './server/src/models/index.js';

async function debugDashboardError() {
  try {
    console.log('🔍 Debugging Technician Dashboard Error...');

    // Check what tables exist
    console.log('\n📋 Checking database tables...');
    const tables = await db.sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", {
      type: db.sequelize.QueryTypes.SELECT
    });
    
    const tableNames = tables.map(t => t.table_name).filter(name => name && name.includes('lab'));
    console.log('Lab-related tables:', tableNames);

    // Check lab_workflow_results table structure
    if (tableNames.includes('lab_workflow_results')) {
      console.log('\n🔍 Checking lab_workflow_results table structure...');
      const columns = await db.sequelize.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'lab_workflow_results'
        ORDER BY ordinal_position
      `, {
        type: db.sequelize.QueryTypes.SELECT
      });
      
      console.log('Columns in lab_workflow_results:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    // Test the specific query that's failing
    console.log('\n🧪 Testing critical results query...');
    try {
      const criticalResults = await db.LabWorkflowResult.findAll({
        where: { 
          hasCriticalValues: true,
          criticalNotificationSent: false 
        },
        include: [{
          model: db.LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: db.User, as: 'patient', attributes: ['walletAddress', 'name', 'email'] },
            { model: db.User, as: 'doctor', attributes: ['walletAddress', 'name', 'email'] }
          ]
        }],
        limit: 5,
        order: [['created_at', 'ASC']]
      });
      console.log(`✅ Critical results query successful: ${criticalResults.length} results`);
    } catch (error) {
      console.log('❌ Critical results query failed:', error.message);
    }

    // Test simpler queries
    console.log('\n🧪 Testing simpler queries...');
    
    try {
      const orderCount = await db.LabWorkflowOrder.count();
      console.log(`✅ Lab orders count: ${orderCount}`);
    } catch (error) {
      console.log('❌ Lab orders count failed:', error.message);
    }

    try {
      const resultCount = await db.LabWorkflowResult.count();
      console.log(`✅ Lab results count: ${resultCount}`);
    } catch (error) {
      console.log('❌ Lab results count failed:', error.message);
    }

    console.log('\n🎯 Diagnosis complete!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await db.sequelize.close();
  }
}

debugDashboardError();