#!/usr/bin/env node

/**
 * Debug Technician Dashboard 500 Error
 * Tests each part of the technician dashboard to find the exact error
 */

import db from './server/src/models/index.js';

const { LabWorkflowOrder, LabWorkflowResult, LabWorkflowAccessLog } = db;

async function debugTechnicianDashboard500() {
  console.log('🔍 Debugging Technician Dashboard 500 Error...\n');

  try {
    console.log('🧪 Testing each dashboard component individually...\n');

    // Test 1: Pending orders
    console.log('1. Testing pending orders...');
    try {
      const pendingOrders = await LabWorkflowOrder.getOrdersByStatus('collected', { limit: 10 });
      console.log(`   ✅ Pending orders: ${pendingOrders.length} found`);
    } catch (error) {
      console.log(`   ❌ Pending orders error: ${error.message}`);
      console.log(`      Stack: ${error.stack}`);
    }

    // Test 2: Processing orders
    console.log('\n2. Testing processing orders...');
    try {
      const processingOrders = await LabWorkflowOrder.getOrdersByStatus('processing', { limit: 10 });
      console.log(`   ✅ Processing orders: ${processingOrders.length} found`);
    } catch (error) {
      console.log(`   ❌ Processing orders error: ${error.message}`);
    }

    // Test 3: Completed today count
    console.log('\n3. Testing completed today count...');
    try {
      const completedToday = await LabWorkflowResult.count({
        where: {
          created_at: {
            [db.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });
      console.log(`   ✅ Completed today: ${completedToday}`);
    } catch (error) {
      console.log(`   ❌ Completed today error: ${error.message}`);
    }

    // Test 4: Critical results
    console.log('\n4. Testing critical results...');
    try {
      const criticalResults = await LabWorkflowResult.getCriticalResults({ limit: 5 });
      console.log(`   ✅ Critical results: ${criticalResults.length} found`);
    } catch (error) {
      console.log(`   ❌ Critical results error: ${error.message}`);
      console.log(`      Stack: ${error.stack}`);
    }

    // Test 5: Recent activity
    console.log('\n5. Testing recent activity...');
    try {
      const recentActivity = await LabWorkflowAccessLog.getRecentActivity(20);
      console.log(`   ✅ Recent activity: ${recentActivity.length} entries found`);
    } catch (error) {
      console.log(`   ❌ Recent activity error: ${error.message}`);
      console.log(`      Stack: ${error.stack}`);
    }

    // Test 6: Full Promise.all (like in the actual endpoint)
    console.log('\n6. Testing full Promise.all...');
    try {
      const [
        pendingOrders,
        processingOrders,
        completedToday,
        criticalResults,
        recentActivity
      ] = await Promise.all([
        LabWorkflowOrder.getOrdersByStatus('collected', { limit: 10 }),
        LabWorkflowOrder.getOrdersByStatus('processing', { limit: 10 }),
        LabWorkflowResult.count({
          where: {
            created_at: {
              [db.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        LabWorkflowResult.getCriticalResults({ limit: 5 }),
        LabWorkflowAccessLog.getRecentActivity(20)
      ]);

      console.log('   ✅ Promise.all completed successfully!');
      console.log(`      Pending: ${pendingOrders.length}, Processing: ${processingOrders.length}`);
      console.log(`      Completed today: ${completedToday}, Critical: ${criticalResults.length}`);
      console.log(`      Recent activity: ${recentActivity.length}`);

      // Test response structure
      const response = {
        success: true,
        data: {
          workQueue: {
            pendingOrders,
            processingOrders,
            pendingCount: pendingOrders.length,
            processingCount: processingOrders.length
          },
          statistics: {
            completedToday,
            criticalResultsCount: criticalResults.length
          },
          alerts: {
            criticalResults
          },
          recentActivity
        }
      };

      console.log('   ✅ Response structure created successfully!');
      console.log(`      Response size: ${JSON.stringify(response).length} characters`);

    } catch (error) {
      console.log(`   ❌ Promise.all error: ${error.message}`);
      console.log(`      Stack: ${error.stack}`);
    }

    // Test 7: Check database tables exist
    console.log('\n7. Checking database tables...');
    try {
      const orderCount = await LabWorkflowOrder.count();
      const resultCount = await LabWorkflowResult.count();
      const logCount = await LabWorkflowAccessLog.count();
      
      console.log(`   ✅ Tables exist:`);
      console.log(`      lab_workflow_orders: ${orderCount} records`);
      console.log(`      lab_workflow_results: ${resultCount} records`);
      console.log(`      lab_workflow_access_logs: ${logCount} records`);
    } catch (error) {
      console.log(`   ❌ Database table error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Overall error:', error);
  } finally {
    await db.sequelize.close();
  }

  console.log('\n📝 Next steps:');
  console.log('- If all tests pass, the issue might be in the route handler');
  console.log('- If a specific test fails, that component needs fixing');
  console.log('- Check server logs for more detailed error information');
}

// Run the debug
debugTechnicianDashboard500().catch(console.error);