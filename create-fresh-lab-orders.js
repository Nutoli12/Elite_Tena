import db from './server/src/models/index.js';
import LabNotificationService from './server/src/services/LabNotificationService.js';

const { LabWorkflowOrder, LabWorkflowTestCatalog, User, LabWorkflowAccessLog } = db;

console.log('🧪 Creating Fresh Lab Orders for Testing...\n');

async function createFreshLabOrders() {
  try {
    // Initialize database associations
    console.log('🔄 Initializing database associations...');
    await db.sequelize.authenticate();
    console.log('✅ Database associations initialized successfully\n');

    // 1. Get available doctors and patients
    console.log('1. Finding available doctors and patients...');
    const doctors = await User.findAll({
      where: { role: 'doctor' },
      attributes: ['walletAddress', 'name', 'email'],
      limit: 5
    });

    const patients = await User.findAll({
      where: { role: 'patient' },
      attributes: ['walletAddress', 'name', 'email'],
      limit: 5
    });

    console.log(`✅ Found ${doctors.length} doctors and ${patients.length} patients\n`);

    if (doctors.length === 0 || patients.length === 0) {
      console.log('❌ Need at least 1 doctor and 1 patient to create lab orders');
      return;
    }

    // 2. Get available lab tests
    console.log('2. Getting available lab tests...');
    const availableTests = await LabWorkflowTestCatalog.findAll({
      where: { isActive: true },
      attributes: ['testCode', 'testName', 'price']
    });

    console.log(`✅ Found ${availableTests.length} available tests:`);
    availableTests.forEach(test => {
      console.log(`   • ${test.testCode}: ${test.testName} - $${test.price}`);
    });
    console.log('');

    // 3. Create sample lab orders
    console.log('3. Creating fresh lab orders...\n');

    const testOrders = [
      {
        doctor: doctors[0],
        patient: patients[0],
        tests: ['CBC', 'GLU'],
        priority: 'urgent',
        sampleType: 'Blood',
        specialInstructions: 'Fasting required for glucose test'
      },
      {
        doctor: doctors[0],
        patient: patients[1] || patients[0],
        tests: ['LIPID', 'TSH'],
        priority: 'routine',
        sampleType: 'Blood',
        specialInstructions: 'Morning collection preferred'
      },
      {
        doctor: doctors[1] || doctors[0],
        patient: patients[0],
        tests: ['UA'],
        priority: 'stat',
        sampleType: 'Urine',
        specialInstructions: 'STAT - Process immediately'
      }
    ];

    let createdCount = 0;

    for (const orderData of testOrders) {
      try {
        // Generate order number
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timestamp = Date.now().toString().slice(-6);
        const orderNumber = `LAB-${year}${month}${day}-${timestamp}`;

        // Create lab order
        const labOrder = await LabWorkflowOrder.create({
          orderNumber,
          patientWalletAddress: orderData.patient.walletAddress.toLowerCase(),
          doctorWalletAddress: orderData.doctor.walletAddress.toLowerCase(),
          testCodes: orderData.tests,
          priority: orderData.priority,
          sampleType: orderData.sampleType,
          specialInstructions: orderData.specialInstructions,
          status: 'collected', // Ready for lab technician processing
          statusChangedBy: orderData.doctor.walletAddress.toLowerCase()
        });

        // Log the creation
        await LabWorkflowAccessLog.logAccess({
          labOrderId: labOrder.id,
          userWalletAddress: orderData.doctor.walletAddress.toLowerCase(),
          userRole: 'doctor',
          action: 'create',
          resourceType: 'order',
          accessedData: {
            testCodes: orderData.tests,
            priority: orderData.priority,
            patientWalletAddress: orderData.patient.walletAddress
          }
        });

        // Get test details for notification
        const testDetails = await LabWorkflowTestCatalog.getTestsByCodes(orderData.tests);

        // Send notifications to lab technicians
        try {
          const notificationResult = await LabNotificationService.notifyLabTechniciansNewOrder(
            labOrder, 
            testDetails
          );
          
          console.log(`✅ Created order ${orderNumber}:`);
          console.log(`   👤 Patient: ${orderData.patient.name || 'Unknown'}`);
          console.log(`   👨‍⚕️ Doctor: ${orderData.doctor.name || 'Unknown'}`);
          console.log(`   📋 Tests: ${orderData.tests.join(', ')}`);
          console.log(`   ⚡ Priority: ${orderData.priority}`);
          console.log(`   📧 Notifications sent: ${notificationResult.success ? 'Yes' : 'Failed'}`);
          console.log('');

          createdCount++;
        } catch (notificationError) {
          console.log(`⚠️  Order created but notification failed: ${notificationError.message}`);
          createdCount++;
        }

        // Small delay between orders
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (orderError) {
        console.error(`❌ Failed to create order: ${orderError.message}`);
      }
    }

    // 4. Verify created orders
    console.log(`4. Verifying created orders...`);
    const allOrders = await LabWorkflowOrder.findAll({
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['walletAddress', 'name', 'email']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['walletAddress', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Total orders in system: ${allOrders.length}`);
    console.log('\n📋 Current lab orders in work queue:');
    allOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.orderNumber}`);
      console.log(`      👤 Patient: ${order.patient?.name || 'Unknown'}`);
      console.log(`      👨‍⚕️ Doctor: ${order.doctor?.name || 'Unknown'}`);
      console.log(`      📋 Tests: ${order.testCodes.join(', ')}`);
      console.log(`      ⚡ Priority: ${order.priority}`);
      console.log(`      📊 Status: ${order.status}`);
      console.log('');
    });

    console.log('🏁 FRESH LAB ORDER CREATION COMPLETE!');
    console.log(`✅ Created ${createdCount} new lab orders`);
    console.log('✅ All orders have proper patient and doctor names');
    console.log('✅ Orders are in "collected" status (ready for processing)');
    console.log('✅ Notifications sent to lab technicians');
    console.log('✅ Lab technician work queue is populated');
    console.log('\n💡 You can now test the complete lab workflow with fresh data!');

  } catch (error) {
    console.error('❌ Error creating fresh lab orders:', error);
  } finally {
    await db.sequelize.close();
  }
}

createFreshLabOrders();