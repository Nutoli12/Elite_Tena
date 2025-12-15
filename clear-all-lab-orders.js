import db from './server/src/models/index.js';

const { LabWorkflowOrder, LabWorkflowResult, LabWorkflowAccessLog, Notification } = db;

console.log('🧹 Clearing All Lab Orders and Related Data...\n');

async function clearAllLabOrders() {
  try {
    // Initialize database associations
    console.log('🔄 Initializing database associations...');
    await db.sequelize.authenticate();
    console.log('✅ Database associations initialized successfully\n');

    // 1. Get count of existing data before clearing
    console.log('1. Checking existing data...');
    const [orderCount, resultCount, logCount, notificationCount] = await Promise.all([
      LabWorkflowOrder.count(),
      LabWorkflowResult.count(),
      LabWorkflowAccessLog.count(),
      Notification.count({ where: { type: { [db.Sequelize.Op.like]: '%lab%' } } })
    ]);

    console.log(`📊 Current data:
   • Lab Orders: ${orderCount}
   • Lab Results: ${resultCount}
   • Access Logs: ${logCount}
   • Lab Notifications: ${notificationCount}\n`);

    if (orderCount === 0) {
      console.log('✅ No lab orders to clear. System is already clean.\n');
      return;
    }

    // 2. Clear lab results first (due to foreign key constraints)
    console.log('2. Clearing lab results...');
    const deletedResults = await LabWorkflowResult.destroy({
      where: {},
      truncate: true
    });
    console.log(`✅ Cleared ${resultCount} lab results\n`);

    // 3. Clear access logs
    console.log('3. Clearing access logs...');
    const deletedLogs = await LabWorkflowAccessLog.destroy({
      where: {},
      truncate: true
    });
    console.log(`✅ Cleared ${logCount} access logs\n`);

    // 4. Clear lab-related notifications
    console.log('4. Clearing lab notifications...');
    const deletedNotifications = await Notification.destroy({
      where: {
        type: {
          [db.Sequelize.Op.in]: [
            'new_lab_order',
            'urgent_test',
            'lab_results_to_review',
            'lab_results_ready'
          ]
        }
      }
    });
    console.log(`✅ Cleared ${deletedNotifications} lab notifications\n`);

    // 5. Clear all lab orders
    console.log('5. Clearing all lab orders...');
    const deletedOrders = await LabWorkflowOrder.destroy({
      where: {},
      truncate: true
    });
    console.log(`✅ Cleared ${orderCount} lab orders\n`);

    // 6. Reset auto-increment counters (if needed)
    console.log('6. Resetting database sequences...');
    try {
      await db.sequelize.query('DELETE FROM sqlite_sequence WHERE name IN ("lab_workflow_orders", "lab_workflow_results", "lab_workflow_access_logs")');
      console.log('✅ Reset auto-increment sequences\n');
    } catch (error) {
      console.log('⚠️  Could not reset sequences (this is normal for some databases)\n');
    }

    // 7. Verify cleanup
    console.log('7. Verifying cleanup...');
    const [finalOrderCount, finalResultCount, finalLogCount] = await Promise.all([
      LabWorkflowOrder.count(),
      LabWorkflowResult.count(),
      LabWorkflowAccessLog.count()
    ]);

    console.log(`📊 After cleanup:
   • Lab Orders: ${finalOrderCount}
   • Lab Results: ${finalResultCount}
   • Access Logs: ${finalLogCount}\n`);

    console.log('🏁 LAB ORDER CLEANUP COMPLETE!');
    console.log('✅ All existing lab orders cleared');
    console.log('✅ All lab results cleared');
    console.log('✅ All access logs cleared');
    console.log('✅ All lab notifications cleared');
    console.log('✅ System ready for fresh lab order creation');
    console.log('\n💡 You can now create new lab orders and test the complete workflow from scratch.');

  } catch (error) {
    console.error('❌ Error clearing lab orders:', error);
  } finally {
    await db.sequelize.close();
  }
}

clearAllLabOrders();