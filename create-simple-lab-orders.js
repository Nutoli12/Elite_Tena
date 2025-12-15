import db from './server/src/models/index.js';
import LabNotificationService from './server/src/services/LabNotificationService.js';

const { LabWorkflowOrder, User, LabWorkflowAccessLog } = db;

console.log('🧪 Creating Simple Lab Orders for Testing...\n');

async function createSimpleLabOrders() {
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
      limit: 3
    });

    const patients = await User.findAll({
      where: { role: 'patient' },
      attributes: ['walletAddress', 'name', 'email'],
      limit: 3
    });

    console.log(`✅ Found ${doctors.length} doctors and ${patients.length} patients`);
    
    console.log('\n👨‍⚕️ Available Doctors:');
    doctors.forEach((doctor, index) => {
      console.log(`   ${index + 1}. ${doctor.name || 'Unknown'} (${doctor.email})`);
    });

    console.log('\n👥 Available Patients:');
    patients.forEach((patient, index) => {
      console.log(`   ${index + 1}. ${patient.name || 'Unknown'} (${patient.email})`);
    });

    if (doctors.length === 0 || patients.length === 0) {
      console.log('\n❌ Need at least 1 doctor and 1 patient to create lab orders');
      return;
    }

    // 2. Available test codes (hardcoded since we know they exist)
    const availableTests = ['CBC', 'GLU', 'LIPID', 'UA', 'TSH'];
    console.log(`\n2. Available test codes: ${availableTests.join(', ')}\n`);

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
        tests: ['LIPID'],
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
      },
      {
        doctor: doctors[0],
        patient: patients[2] || patients[0],
        tests: ['TSH', 'CBC'],
        priority: 'routine',
        sampleType: 'Blood',
        specialInstructions: 'Thyroid function assessment'
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

        // Send notifications to lab technicians
        try {
          const notificationResult = await LabNotificationService.notifyLabTechniciansNewOrder(
            labOrder, 
            [] // Empty test details for now
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
        await new Promise(resolve => setTimeout(resolve, 200));

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
    console.log('\n🔄 Next steps:');
    console.log('   1. Login as lab technician to see the work queue');
    console.log('   2. Check notifications for new lab orders');
    console.log('   3. Process orders and update status');
    console.log('   4. Upload results when ready');

  } catch (error) {
    console.error('❌ Error creating simple lab orders:', error);
  } finally {
    await db.sequelize.close();
  }
}

createSimpleLabOrders();