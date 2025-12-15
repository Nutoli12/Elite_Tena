import axios from 'axios';

console.log('📋 Lab Result Upload Guide & Demo...\n');

const API_BASE = 'http://localhost:3003/api';

async function labResultUploadGuide() {
  try {
    console.log('🔬 HOW TO UPLOAD LAB RESULTS - Complete Guide');
    console.log('=' .repeat(60));
    
    // 1. First, let's see what orders are available for results
    console.log('\n1. STEP 1: Check Available Orders for Results');
    console.log('-'.repeat(40));
    
    const queueResponse = await axios.get(`${API_BASE}/lab/technician/queue`, {
      headers: {
        'x-user-role': 'lab_technician',
        'x-wallet-address': '0xlabtech123456789012345678901234567890123'
      }
    });

    let selectedOrder = null;
    if (queueResponse.data.success && queueResponse.data.data.orders.length > 0) {
      const orders = queueResponse.data.data.orders;
      selectedOrder = orders[0]; // Take the first order (highest priority)
      
      console.log(`✅ Found ${orders.length} orders ready for results`);
      console.log(`📋 Selected Order: ${selectedOrder.orderNumber}`);
      console.log(`   👤 Patient: ${selectedOrder.patient?.name}`);
      console.log(`   👨‍⚕️ Doctor: ${selectedOrder.doctor?.name}`);
      console.log(`   📋 Tests: ${selectedOrder.testCodes.join(', ')}`);
    } else {
      console.log('❌ No orders available for results');
      return;
    }

    // 2. Show the lab result upload format
    console.log('\n2. STEP 2: Lab Result Upload Format');
    console.log('-'.repeat(40));
    
    console.log('📝 API Endpoint: POST /api/lab/results');
    console.log('🔐 Headers Required:');
    console.log('   x-user-role: lab_technician');
    console.log('   x-wallet-address: [lab_technician_wallet]');
    console.log('   Content-Type: application/json');
    
    console.log('\n📋 Request Body Format:');
    const sampleResultData = {
      labOrderId: selectedOrder.id,
      testResults: selectedOrder.testCodes.map(testCode => {
        // Generate sample results based on test type
        let result = {};
        
        switch(testCode) {
          case 'CBC':
            result = {
              testCode: 'CBC',
              testName: 'Complete Blood Count',
              values: {
                'WBC': { value: '7.2', unit: '10³/μL', referenceRange: '4.0-11.0', status: 'normal' },
                'RBC': { value: '4.5', unit: '10⁶/μL', referenceRange: '4.2-5.4', status: 'normal' },
                'Hemoglobin': { value: '14.2', unit: 'g/dL', referenceRange: '12.0-16.0', status: 'normal' },
                'Hematocrit': { value: '42.1', unit: '%', referenceRange: '36.0-46.0', status: 'normal' },
                'Platelets': { value: '285', unit: '10³/μL', referenceRange: '150-450', status: 'normal' }
              }
            };
            break;
            
          case 'GLU':
            result = {
              testCode: 'GLU',
              testName: 'Blood Glucose',
              values: {
                'Glucose': { value: '95', unit: 'mg/dL', referenceRange: '70-100', status: 'normal' }
              }
            };
            break;
            
          case 'LIPID':
            result = {
              testCode: 'LIPID',
              testName: 'Lipid Profile',
              values: {
                'Total Cholesterol': { value: '185', unit: 'mg/dL', referenceRange: '<200', status: 'normal' },
                'HDL Cholesterol': { value: '55', unit: 'mg/dL', referenceRange: '>40', status: 'normal' },
                'LDL Cholesterol': { value: '110', unit: 'mg/dL', referenceRange: '<100', status: 'high' },
                'Triglycerides': { value: '120', unit: 'mg/dL', referenceRange: '<150', status: 'normal' }
              }
            };
            break;
            
          case 'UA':
            result = {
              testCode: 'UA',
              testName: 'Urinalysis',
              values: {
                'Color': { value: 'Yellow', unit: '', referenceRange: 'Yellow', status: 'normal' },
                'Clarity': { value: 'Clear', unit: '', referenceRange: 'Clear', status: 'normal' },
                'Specific Gravity': { value: '1.020', unit: '', referenceRange: '1.003-1.030', status: 'normal' },
                'pH': { value: '6.0', unit: '', referenceRange: '5.0-8.0', status: 'normal' },
                'Protein': { value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal' },
                'Glucose': { value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal' }
              }
            };
            break;
            
          case 'TSH':
            result = {
              testCode: 'TSH',
              testName: 'Thyroid Stimulating Hormone',
              values: {
                'TSH': { value: '2.5', unit: 'mIU/L', referenceRange: '0.4-4.0', status: 'normal' }
              }
            };
            break;
            
          default:
            result = {
              testCode: testCode,
              testName: `Test ${testCode}`,
              values: {
                'Result': { value: 'Normal', unit: '', referenceRange: 'Normal', status: 'normal' }
              }
            };
        }
        
        return result;
      }),
      technicianNotes: 'Sample processed successfully. All quality controls passed.',
      verificationStatus: 'verified',
      hasCriticalValues: false,
      resultDate: new Date().toISOString()
    };
    
    console.log(JSON.stringify(sampleResultData, null, 2));

    // 3. Demonstrate actual result upload
    console.log('\n3. STEP 3: Uploading Sample Result');
    console.log('-'.repeat(40));
    
    try {
      const uploadResponse = await axios.post(`${API_BASE}/lab/results`, sampleResultData, {
        headers: {
          'x-user-role': 'lab_technician',
          'x-wallet-address': '0xlabtech123456789012345678901234567890123',
          'Content-Type': 'application/json'
        }
      });
      
      if (uploadResponse.data.success) {
        console.log('✅ Lab Result Uploaded Successfully!');
        console.log(`📋 Result ID: ${uploadResponse.data.data.labResult.id}`);
        console.log(`📅 Result Date: ${new Date(uploadResponse.data.data.labResult.resultDate).toLocaleString()}`);
        console.log(`🔬 Tests Processed: ${selectedOrder.testCodes.join(', ')}`);
        console.log(`✅ Verification Status: ${uploadResponse.data.data.labResult.verificationStatus}`);
        
        // Update order status to completed
        console.log('\n4. STEP 4: Updating Order Status to Completed');
        console.log('-'.repeat(40));
        
        const statusUpdateResponse = await axios.patch(`${API_BASE}/lab/orders/${selectedOrder.id}/status`, {
          status: 'completed',
          notes: 'Results uploaded and verified'
        }, {
          headers: {
            'x-user-role': 'lab_technician',
            'x-wallet-address': '0xlabtech123456789012345678901234567890123'
          }
        });
        
        if (statusUpdateResponse.data.success) {
          console.log('✅ Order Status Updated to Completed');
        }
        
      } else {
        console.log('❌ Failed to upload result:', uploadResponse.data.message);
      }
      
    } catch (uploadError) {
      console.log('❌ Error uploading result:', uploadError.response?.data?.message || uploadError.message);
    }

    // 4. Show how to view uploaded results
    console.log('\n5. STEP 5: Viewing Uploaded Results');
    console.log('-'.repeat(40));
    
    try {
      const resultsResponse = await axios.get(`${API_BASE}/lab/results`, {
        headers: {
          'x-user-role': 'lab_technician',
          'x-wallet-address': '0xlabtech123456789012345678901234567890123'
        }
      });
      
      if (resultsResponse.data.success) {
        const results = resultsResponse.data.data;
        console.log(`✅ Found ${results.length} lab results`);
        
        if (results.length > 0) {
          const latestResult = results[0];
          console.log(`📋 Latest Result: ${latestResult.id}`);
          console.log(`   📅 Date: ${new Date(latestResult.resultDate).toLocaleString()}`);
          console.log(`   ✅ Status: ${latestResult.verificationStatus}`);
          console.log(`   🔬 Tests: ${latestResult.testResults?.length || 0} test(s)`);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not fetch results:', error.message);
    }

    console.log('\n🏁 LAB RESULT UPLOAD GUIDE COMPLETE!');
    console.log('=' .repeat(60));
    console.log('📝 SUMMARY - How to Upload Lab Results:');
    console.log('1. ✅ Check available orders in work queue');
    console.log('2. ✅ Prepare result data with test values');
    console.log('3. ✅ POST to /api/lab/results with proper headers');
    console.log('4. ✅ Update order status to "completed"');
    console.log('5. ✅ Results are now available for doctor review');
    
    console.log('\n🔬 RESULT DATA STRUCTURE:');
    console.log('• labOrderId: ID of the lab order');
    console.log('• testResults: Array of test results with values');
    console.log('• technicianNotes: Notes from lab technician');
    console.log('• verificationStatus: "verified" or "pending"');
    console.log('• hasCriticalValues: true/false for urgent results');
    console.log('• resultDate: ISO date string');
    
    console.log('\n💡 TIPS:');
    console.log('• Always include reference ranges for values');
    console.log('• Mark critical values with hasCriticalValues: true');
    console.log('• Add meaningful technician notes');
    console.log('• Verify results before marking as "verified"');

  } catch (error) {
    console.error('❌ Error in lab result guide:', error.response?.data || error.message);
  }
}

labResultUploadGuide();