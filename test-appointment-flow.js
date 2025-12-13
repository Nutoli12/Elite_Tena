#!/usr/bin/env node

/**
 * PHASE 5: END-TO-END TESTING & VALIDATION
 * 
 * Comprehensive test suite for the appointment system
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:3003';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testData = {
  patient: {
    walletAddress: '0xpatient123test',
    name: 'Test Patient',
    email: 'patient@test.com'
  },
  doctor: {
    walletAddress: '0xdoctor456test',
    name: 'Dr. Test Doctor',
    email: 'doctor@test.com',
    specialization: 'General Practice'
  }
};

const testAppointmentFlow = async () => {
  console.log('🧪 ========== APPOINTMENT FLOW TEST SUITE ==========\n');

  const results = {
    tests: [],
    passed: 0,
    failed: 0,
    errors: []
  };

  const runTest = async (testName, testFn) => {
    console.log(`🧪 Running: ${testName}...`);
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`   ✅ PASSED: ${testName}`);
        results.passed++;
      } else {
        console.log(`   ❌ FAILED: ${testName} - ${result.message}`);
        results.failed++;
        results.errors.push({ test: testName, error: result.message });
      }
      results.tests.push({ name: testName, passed: result.success, message: result.message });
    } catch (error) {
      console.log(`   💥 ERROR: ${testName} - ${error.message}`);
      results.failed++;
      results.errors.push({ test: testName, error: error.message });
      results.tests.push({ name: testName, passed: false, message: error.message });
    }
  };

  // Test 1: Server Health Check
  await runTest('Server Health Check', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      return {
        success: response.status === 200,
        message: response.status === 200 ? 'Server is running' : `Server returned ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Server not accessible: ${error.message}`
      };
    }
  });

  // Test 2: Create Appointment
  let createdAppointmentId = null;
  await runTest('Create Appointment', async () => {
    const appointmentData = {
      patientWalletAddress: testData.patient.walletAddress,
      doctorWalletAddress: testData.doctor.walletAddress,
      appointmentDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      reason: 'Test appointment for flow validation',
      duration: 30,
      fee: 0
    };

    try {
      const response = await axios.post(`${API_BASE}/appointments`, appointmentData);
      
      if (response.data.success && response.data.data) {
        createdAppointmentId = response.data.data.id;
        return {
          success: true,
          message: `Appointment created with ID: ${createdAppointmentId}`
        };
      } else {
        return {
          success: false,
          message: `Failed to create appointment: ${response.data.error || 'Unknown error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API error: ${error.response?.data?.message || error.message}`
      };
    }
  });

  // Test 3: Fetch Patient Appointments
  await runTest('Fetch Patient Appointments', async () => {
    try {
      const response = await axios.get(`${API_BASE}/appointments`, {
        params: {
          userRole: 'patient',
          userId: testData.patient.walletAddress
        }
      });

      if (response.data.success) {
        const appointments = response.data.data || [];
        const hasTestAppointment = appointments.some(apt => apt.id === createdAppointmentId);
        
        return {
          success: hasTestAppointment,
          message: hasTestAppointment 
            ? `Found ${appointments.length} appointments including test appointment`
            : `Found ${appointments.length} appointments but test appointment missing`
        };
      } else {
        return {
          success: false,
          message: `Failed to fetch appointments: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API error: ${error.response?.data?.message || error.message}`
      };
    }
  });

  // Test 4: Fetch Doctor Appointments
  await runTest('Fetch Doctor Appointments', async () => {
    try {
      const response = await axios.get(`${API_BASE}/appointments`, {
        params: {
          userRole: 'doctor',
          userId: testData.doctor.walletAddress
        }
      });

      if (response.data.success) {
        const appointments = response.data.data || [];
        const hasTestAppointment = appointments.some(apt => apt.id === createdAppointmentId);
        
        return {
          success: hasTestAppointment,
          message: hasTestAppointment 
            ? `Found ${appointments.length} appointments including test appointment`
            : `Found ${appointments.length} appointments but test appointment missing`
        };
      } else {
        return {
          success: false,
          message: `Failed to fetch appointments: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API error: ${error.response?.data?.message || error.message}`
      };
    }
  });

  // Test 5: Get Appointment by ID
  await runTest('Get Appointment by ID', async () => {
    if (!createdAppointmentId) {
      return {
        success: false,
        message: 'No appointment ID available from creation test'
      };
    }

    try {
      const response = await axios.get(`${API_BASE}/appointments/${createdAppointmentId}`);

      if (response.data.success && response.data.data) {
        const appointment = response.data.data;
        const hasCorrectData = 
          appointment.patientWalletAddress === testData.patient.walletAddress.toLowerCase() &&
          appointment.doctorWalletAddress === testData.doctor.walletAddress.toLowerCase();

        return {
          success: hasCorrectData,
          message: hasCorrectData 
            ? 'Appointment retrieved with correct data'
            : 'Appointment retrieved but data mismatch'
        };
      } else {
        return {
          success: false,
          message: `Failed to get appointment: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API error: ${error.response?.data?.message || error.message}`
      };
    }
  });

  // Test 6: Verify Data Integrity (No "Unknown Doctor")
  await runTest('Verify Data Integrity', async () => {
    try {
      const response = await axios.get(`${API_BASE}/appointments`, {
        params: {
          userRole: 'patient',
          userId: testData.patient.walletAddress
        }
      });

      if (response.data.success) {
        const appointments = response.data.data || [];
        const hasUnknownDoctor = appointments.some(apt => 
          apt.doctorName === 'Unknown Doctor' || 
          apt.displayDoctor?.includes('Unknown Doctor')
        );
        
        const hasUnknownPatient = appointments.some(apt => 
          apt.patientName === 'Unknown Patient' || 
          apt.displayPatient?.includes('Unknown Patient')
        );

        const integrityGood = !hasUnknownDoctor && !hasUnknownPatient;

        return {
          success: integrityGood,
          message: integrityGood 
            ? 'All appointments have proper doctor and patient names'
            : `Data integrity issues: Unknown Doctor: ${hasUnknownDoctor}, Unknown Patient: ${hasUnknownPatient}`
        };
      } else {
        return {
          success: false,
          message: `Failed to fetch appointments for integrity check: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API error: ${error.response?.data?.message || error.message}`
      };
    }
  });

  // Test 7: Update Appointment
  await runTest('Update Appointment', async () => {
    if (!createdAppointmentId) {
      return {
        success: false,
        message: 'No appointment ID available for update test'
      };
    }

    try {
      const updateData = {
        reason: 'Updated test appointment reason',
        notes: 'Test update notes'
      };

      const response = await axios.put(`${API_BASE}/appointments/${createdAppointmentId}`, updateData);

      if (response.data.success) {
        return {
          success: true,
          message: 'Appointment updated successfully'
        };
      } else {
        return {
          success: false,
          message: `Failed to update appointment: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API error: ${error.response?.data?.message || error.message}`
      };
    }
  });

  // Test 8: Error Handling (Invalid Data)
  await runTest('Error Handling - Invalid Data', async () => {
    try {
      const invalidData = {
        patientWalletAddress: '', // Invalid empty wallet
        doctorWalletAddress: testData.doctor.walletAddress,
        appointmentDate: new Date().toISOString() // Missing required fields
      };

      const response = await axios.post(`${API_BASE}/appointments`, invalidData);

      // Should fail with 400 error
      return {
        success: false,
        message: 'API should have rejected invalid data but did not'
      };
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return {
          success: true,
          message: 'API correctly rejected invalid data with 400 error'
        };
      } else {
        return {
          success: false,
          message: `Unexpected error response: ${error.response?.status || error.message}`
        };
      }
    }
  });

  // Cleanup: Delete test appointment
  await runTest('Cleanup - Delete Test Appointment', async () => {
    if (!createdAppointmentId) {
      return {
        success: true,
        message: 'No test appointment to clean up'
      };
    }

    try {
      const response = await axios.delete(`${API_BASE}/appointments/${createdAppointmentId}`);

      if (response.data.success) {
        return {
          success: true,
          message: 'Test appointment cleaned up successfully'
        };
      } else {
        return {
          success: false,
          message: `Failed to delete test appointment: ${response.data.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Cleanup error: ${error.response?.data?.message || error.message}`
      };
    }
  });

  // Print final results
  console.log('\n📊 ========== TEST RESULTS ==========');
  console.log(`📊 Total tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  const overallSuccess = results.failed === 0;
  console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  return {
    success: overallSuccess,
    results
  };
};

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAppointmentFlow()
    .then((result) => {
      console.log('\n🎉 Test suite completed!');
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export default testAppointmentFlow;