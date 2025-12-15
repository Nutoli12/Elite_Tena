import axios from 'axios';

console.log('🧪 Lab Result Upload - Working Example...\n');

const API_BASE = 'http://localhost:3003/api';

async function uploadLabResultExample() {
  try {
    // 1. Get the first available order
    console.log('1. Getting available lab order...');
    const queueResponse = await axios.get(`${API_BASE}/lab/technician/queue`, {
      headers: {
        'x-user-role': 'lab_technician',
        'x-wallet-address': '0xlabtech123456789012345678901234567890123'
      }
    });

    if (!queueResponse.data.success || queueResponse.data.data.orders.length === 0) {
      console.log('❌ No orders available for results');
      return;
    }

    const order = queueResponse.data.data.orders[0];
    console.log(`✅ Selected Order: ${order.orderNumber}`);
    console.log(`   👤 Patient: ${order.patient?.name}`);
    console.log(`   👨‍⚕️ Doctor: ${order.doctor?.name}`);
    console.log(`   📋 Tests: ${order.testCodes.join(', ')}`);
    console.log(`   🆔 Order ID: ${order.id}\n`);

    // 2. Prepare result data
    console.log('2. Preparing lab result data...');
    
    // Create sample results based on the tests in the order
    const testResults = [];
    
    for (const testCode of order.testCodes) {
      let testResult = {
        testCode: testCode,
        testName: getTestName(testCode),
        values: getTestValues(testCode),
        interpretation: 'Normal findings',
        methodology: 'Automated analyzer'
      };
      
      testResults.push(testResult);
    }

    const resultData = {
      labOrderId: order.id,
      testResults: testResults,
      technicianNotes: `Results processed for ${order.patient?.name}. All quality controls passed. Sample quality: Good.`,
      verificationStatus: 'verified',
      hasCriticalValues: false,
      resultDate: new Date().toISOString(),
      processedBy: '0xlabtech123456789012345678901234567890123'
    };

    console.log('📋 Result Data Prepared:');
    console.log(`   🔬 Tests: ${testResults.length}`);
    console.log(`   📝 Notes: ${resultData.technicianNotes.substring(0, 50)}...`);
    console.log(`   ✅ Status: ${resultData.verificationStatus}`);
    console.log(`   📅 Date: ${new Date(resultData.resultDate).toLocaleString()}\n`);

    // 3. Upload the result
    console.log('3. Uploading lab result...');
    
    try {
      const uploadResponse = await axios.post(`${API_BASE}/lab/results`, resultData, {
        headers: {
          'x-user-role': 'lab_technician',
          'x-wallet-address': '0xlabtech123456789012345678901234567890123',
          'Content-Type': 'application/json'
        }
      });

      if (uploadResponse.data.success) {
        console.log('✅ LAB RESULT UPLOADED SUCCESSFULLY!');
        console.log(`   🆔 Result ID: ${uploadResponse.data.data.labResult.id}`);
        console.log(`   📅 Upload Time: ${new Date().toLocaleString()}`);
        console.log(`   🔬 Tests Processed: ${order.testCodes.join(', ')}`);
        
        // 4. Update order status to completed
        console.log('\n4. Updating order status to completed...');
        
        const statusUpdate = await axios.patch(`${API_BASE}/lab/orders/${order.id}/status`, {
          status: 'completed',
          notes: 'Results uploaded and verified by lab technician'
        }, {
          headers: {
            'x-user-role': 'lab_technician',
            'x-wallet-address': '0xlabtech123456789012345678901234567890123'
          }
        });

        if (statusUpdate.data.success) {
          console.log('✅ Order status updated to COMPLETED');
        }

        // 5. Show the complete workflow
        console.log('\n5. Workflow completed successfully!');
        console.log('   📋 Order processed ✅');
        console.log('   🔬 Results uploaded ✅');
        console.log('   📊 Status updated ✅');
        console.log('   📧 Doctor will be notified ✅');

      } else {
        console.log('❌ Failed to upload result:', uploadResponse.data.message);
      }

    } catch (uploadError) {
      console.log('❌ Upload Error:', uploadError.response?.data?.message || uploadError.message);
      
      // Show detailed error info
      if (uploadError.response?.data) {
        console.log('📋 Error Details:', JSON.stringify(uploadError.response.data, null, 2));
      }
    }

    console.log('\n🏁 LAB RESULT UPLOAD EXAMPLE COMPLETE!');
    console.log('\n📝 HOW TO UPLOAD LAB RESULTS:');
    console.log('1. Get lab order from work queue');
    console.log('2. Prepare result data with test values');
    console.log('3. POST to /api/lab/results');
    console.log('4. Update order status to "completed"');
    console.log('5. Doctor receives notification');

  } catch (error) {
    console.error('❌ Error in lab result upload:', error.response?.data || error.message);
  }
}

// Helper functions for test data
function getTestName(testCode) {
  const testNames = {
    'CBC': 'Complete Blood Count',
    'GLU': 'Blood Glucose',
    'LIPID': 'Lipid Profile',
    'UA': 'Urinalysis',
    'TSH': 'Thyroid Stimulating Hormone'
  };
  return testNames[testCode] || `Test ${testCode}`;
}

function getTestValues(testCode) {
  const testValues = {
    'CBC': {
      'WBC': { value: '7.2', unit: '10³/μL', referenceRange: '4.0-11.0', status: 'normal' },
      'RBC': { value: '4.5', unit: '10⁶/μL', referenceRange: '4.2-5.4', status: 'normal' },
      'Hemoglobin': { value: '14.2', unit: 'g/dL', referenceRange: '12.0-16.0', status: 'normal' },
      'Hematocrit': { value: '42.1', unit: '%', referenceRange: '36.0-46.0', status: 'normal' },
      'Platelets': { value: '285', unit: '10³/μL', referenceRange: '150-450', status: 'normal' }
    },
    'GLU': {
      'Glucose': { value: '95', unit: 'mg/dL', referenceRange: '70-100', status: 'normal' }
    },
    'LIPID': {
      'Total Cholesterol': { value: '185', unit: 'mg/dL', referenceRange: '<200', status: 'normal' },
      'HDL Cholesterol': { value: '55', unit: 'mg/dL', referenceRange: '>40', status: 'normal' },
      'LDL Cholesterol': { value: '110', unit: 'mg/dL', referenceRange: '<100', status: 'borderline' },
      'Triglycerides': { value: '120', unit: 'mg/dL', referenceRange: '<150', status: 'normal' }
    },
    'UA': {
      'Color': { value: 'Yellow', unit: '', referenceRange: 'Yellow', status: 'normal' },
      'Clarity': { value: 'Clear', unit: '', referenceRange: 'Clear', status: 'normal' },
      'Specific Gravity': { value: '1.020', unit: '', referenceRange: '1.003-1.030', status: 'normal' },
      'pH': { value: '6.0', unit: '', referenceRange: '5.0-8.0', status: 'normal' },
      'Protein': { value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal' }
    },
    'TSH': {
      'TSH': { value: '2.5', unit: 'mIU/L', referenceRange: '0.4-4.0', status: 'normal' }
    }
  };
  
  return testValues[testCode] || {
    'Result': { value: 'Normal', unit: '', referenceRange: 'Normal', status: 'normal' }
  };
}

uploadLabResultExample();