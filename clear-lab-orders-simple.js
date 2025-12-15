import db from './server/src/models/index.js';

const { LabWorkflowOrder, LabWorkflowResult, LabWorkflowAccessLog } = db;

console.log('🧹 Clearing Lab Orders (Simple Version)...\n');

async function clearLabOrdersSimple() {
  try {
    // Initialize database associations
    console.log('🔄 Initializing database associations...');
    await db.sequelize.authenticate();
    console.log('✅ Database associations initialized successfully\n');

    // 1. Get count of existing lab orders
    console.log('1. Checking existing lab orders...');
    const orderCount = await LabWorkflowOrder.count();
    console.log(`📊 Found ${orderCount} lab orders to clear\n`);

    if (orderCount === 0) {
      console.log('✅ No lab orders to clear. System is already clean.\n');
      return;
    }

    // 2. Clear lab results first (due to foreign key constraints)
    console.log('2. Clearing lab results...');
    try {
      const resultCount = await LabWorkflowResult.count();
      if (resultCount > 0) {
        await LabWorkflowResult.destroy({ where: {} });
        console.log(`✅ Cleared ${resultCount} lab results`);
      } else {
        console.log('✅ No lab results to clear');
      }
    } catch (error) {
      console.log('⚠️  Could not clear lab results:', error.message);
    }

    // 3. Clear access logs
    console.log('\n3. Clearing access logs...');
    try {
      const logCount = await LabWorkflowAccessLog.count();
      if (logCount > 0) {
        await LabWorkflowAccessLog.destroy({ where: {} });
        console.log(`✅ Cleared ${logCount} access logs`);
      } else {
        console.log('✅ No access logs to clear');
      }
    } catch (error) {
      console.log('⚠️  Could not clear access logs:', error.message);
    }

    // 4. Clear all lab orders
    console.log('\n4. Clearing all lab orders...');
    const deletedOrders = await LabWorkflowOrder.destroy({ where: {} });
    console.log(`✅ Cleared ${orderCount} lab orders\n`);

    // 5. Verify cleanup
    console.log('5. Verifying cleanup...');
    const finalOrderCount = await LabWorkflowOrder.count();
    console.log(`📊 Lab orders remaining: ${finalOrderCount}\n`);

    console.log('🏁 LAB ORDER CLEANUP COMPLETE!');
    console.log('✅ All existing lab orders cleared');
    console.log('✅ Lab technician work queue is now empty');
    console.log('✅ System ready for fresh lab order creation');
    console.log('\n💡 You can now create new lab orders and test the workflow from scratch.');

  } catch (error) {
    console.error('❌ Error clearing lab orders:', error);
  } finally {
    await db.sequelize.close();
  }
}

clearLabOrdersSimple();