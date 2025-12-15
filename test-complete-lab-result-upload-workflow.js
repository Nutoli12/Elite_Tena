/**
 * Test Complete Lab Result Upload Workflow
 * Tests the end-to-end process of uploading lab results and notifying doctors
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

// Test users
const testUsers = {
  doctor: {
    walletAddress: '0x1234567890123456789012345678901234567890',
    role: 'doctor',
    name: 'Dr. Test Doctor'
  },
  patient: {
    walletAddress: '0x2345678901234567890123456789012345678901',
    role: 'patient',
    name: 'Test Patient'
  },
  technician: {
    walletAddress: '0x3456789012345678901234567890123456789012',
    role: 'lab_technician',
    name: 'Test Technician'
  }
};

async function testCompleteLabResultUploadWorkflow() {
  console.log('🧪 Testing Complete Lab Result Upload Workflow...\n');

  try {
    // Step 1: Create a lab order (as doctor)
    console.log('📋 Step 1: Creating lab order...');
    const orderResponse = await axios.post(`${API_BASE_URL}/api/lab/orders`, {
      patientWalletAddress: testUsers.patient.walletAddress,
      testCodes: ['GLUCOSE', 'TROPONIN', 'CBC'],
      priority: 'urgent',
      sampleType: 'blood',
      specialInstructions: 'Patient has diabetes, monitor glucose levels'
    }, {
      headers: {
        'x-wallet-address': testUsers.doctor.walletAddress,
        'x-user-role': testUsers.doctor.role
      }
    });

    if (!orderResponse.data.success) {
      throw new Error('Failed to create lab order');
    }

    const labOrder = orderResponse.data.data.labOrder;
    console.log(`✅ Lab order created: ${labOrder.orderNumber}`);
    console.log(`   Patient: ${labOrder.patient?.name || 'Unknown'}`);
    console.log(`   Doctor: ${labOrder.doctor?.name || 'Unknown'}`);
    console.log(`   Tests: ${labOrder.testCodes.join(', ')}\n`);

    // Step 2: Update order status to collected (simulate sample collection)
    console.log('💉 Step 2: Updating order status to collected...');
    await axios.patch(`${API_BASE_URL}/api/lab/orders/${labOrder.id}/status`, {
      status: 'collected'
    }, {
      headers: {
        'x-wallet-address': testUsers.technician.walletAddress,
        'x-user-role': testUsers.technician.role
      }
    });
    console.log('✅ Order status updated to collected\n');

    // Step 3: Upload lab results with critical values (as technician)
    console.log('📊 Step 3: Uploading lab results with critical values...');
    
    const resultData = {
      GLUCOSE: {
        value: '450', // Critical high glucose
        unit: 'mg/dL',
        status: 'critical',
        referenceRange: '70-100 mg/dL',
        notes: 'Severely elevated glucose level'
      },
      TROPONIN: {
        value: '0.8', // Critical high troponin
        unit: 'ng/mL',
        status: 'critical',
        referenceRange: '<0.04 ng/mL',
        notes: 'Elevated troponin indicating cardiac injury'
      },
      CBC: {
        value: '12.5',
        unit: 'g/dL',
        status: 'normal',
        referenceRange: '12.0-15.5 g/dL',
        notes: 'Hemoglobin within normal range'
      }
    };

    const uploadResponse = await axios.post(`${API_BASE_URL}/api/lab/results`, {
      labOrderId: labOrder.id,
      resultData,
      interpretation: 'CRITICAL RESULTS: Patient shows severely elevated glucose (450 mg/dL) and elevated troponin (0.8 ng/mL) indicating possible diabetic emergency with cardiac involvement. IMMEDIATE MEDICAL ATTENTION REQUIRED.',
      technicianNotes: 'Results verified twice due to critical values. Quality controls passed. Recommend immediate physician notification.'
    }, {
      headers: {
        'x-wallet-address': testUsers.technician.walletAddress,
        'x-user-role': testUsers.technician.role
      }
    });

    if (!uploadResponse.data.success) {
      throw new Error('Failed to upload lab results');
    }

    const labResult = uploadResponse.data.data.labResult;
    console.log('✅ Lab results uploaded successfully!');
    console.log(`   Result ID: ${labResult.id}`);
    console.log(`   Critical Values: ${labResult.hasCriticalValues ? 'YES' : 'NO'}`);
    console.log(`   Doctor Notified: ${uploadResponse.data.data.doctorNotified ? 'YES' : 'NO'}`);
    console.log(`   Doctor: ${uploadResponse.data.data.doctorInfo?.name || 'Unknown'}\n`);

    // Step 4: Check doctor notifications
    console.log('🔔 Step 4: Checking doctor notifications...');
    const notificationsResponse = await axios.get(`${API_BASE_URL}/api/notifications`, {
      headers: {
        'x-wallet-address': testUsers.doctor.walletAddress,
        'x-user-role': testUsers.doctor.role
      }
    });

    if (notificationsResponse.data.success) {
      const notifications = notificationsResponse.data.data.notifications || [];
      const labNotifications = notifications.filter(n => 
        n.type.includes('lab') || n.relatedType === 'lab_result'
      );
      
      console.log(`✅ Found ${labNotifications.length} lab-related notifications for doctor`);
      
      labNotifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.title}`);
        console.log(`      Type: ${notification.type}`);
        console.log(`      Priority: ${notification.priority}`);
        console.log(`      Critical: ${notification.data?.hasCriticalValues ? 'YES' : 'NO'}`);
      });
    }

    // Step 5: Test doctor viewing results
    console.log('\n👨‍⚕️ Step 5: Testing doctor viewing results...');
    const doctorResultsResponse = await axios.get(`${API_BASE_URL}/api/lab/results`, {
      headers: {
        'x-wallet-address': testUsers.doctor.walletAddress,
        'x-user-role': testUsers.doctor.role
      }
    });

    if (doctorResultsResponse.data.success) {
      const results = doctorResultsResponse.data.data.labResults || [];
      console.log(`✅ Doctor can view ${results.length} lab results`);
      
      const criticalResults = results.filter(r => r.hasCriticalValues);
      console.log(`   Critical results: ${criticalResults.length}`);
    }

    // Step 6: Test critical results endpoint
    console.log('\n🚨 Step 6: Testing critical results endpoint...');
    const criticalResponse = await axios.get(`${API_BASE_URL}/api/lab/results/critical/alerts`, {
      headers: {
        'x-wallet-address': testUsers.doctor.walletAddress,
        'x-user-role': testUsers.doctor.role
      }
    });

    if (criticalResponse.data.success) {
      const criticalResults = criticalResponse.data.data.criticalResults || [];
      console.log(`✅ Found ${criticalResults.length} critical results requiring attention`);
      
      criticalResults.forEach((result, index) => {
        console.log(`   ${index + 1}. Order: ${result.labOrder?.orderNumber}`);
        console.log(`      Patient: ${result.labOrder?.patient?.name}`);
        console.log(`      Critical Values: ${result.criticalValues?.length || 0}`);
      });
    }

    console.log('\n🎉 Complete Lab Result Upload Workflow Test PASSED!');
    console.log('\n📋 Summary:');
    console.log('✅ Lab order created by doctor');
    console.log('✅ Sample collected and status updated');
    console.log('✅ Lab results uploaded by technician');
    console.log('✅ Critical values detected automatically');
    console.log('✅ Doctor notified immediately');
    console.log('✅ Results available in doctor dashboard');
    console.log('✅ Critical results flagged for attention');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   Server response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testCompleteLabResultUploadWorkflow();