import express from 'express';
import {
  createLabOrder,
  getLabOrders,
  getLabOrder,
  updateLabOrderStatus,
  getLabOrderStats
} from '../controllers/labOrderController.js';

import {
  createLabResultRecord,
  submitLabResults,
  releaseResultsToDoctor,
  doctorReviewLabResults,
  uploadLabResult,
  getLabResults,
  getLabResult,
  verifyLabResult,
  addToMedicalRecord,
  getCriticalResults
} from '../controllers/labResultController.js';

import {
  createLabWorksheet,
  recordSampleCollection,
  startProcessing,
  getLabWorksheet,
  getLabWorksheets
} from '../controllers/labWorksheetController.js';

import db from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();
const { LabWorkflowTestCatalog, LabWorkflowAccessLog } = db;

/**
 * Lab Workflow Routes
 * Complete lab technician workflow system
 */

// ========== LAB TEST CATALOG ROUTES ==========

// Get all active lab tests
router.get('/catalog', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let tests;
    if (search) {
      tests = await LabWorkflowTestCatalog.searchTests(search);
    } else if (category) {
      tests = await LabWorkflowTestCatalog.getTestsByCategory(category);
    } else {
      tests = await LabWorkflowTestCatalog.getActiveTests();
    }

    // Group by category for better organization
    const groupedTests = tests.reduce((acc, test) => {
      const category = test.testCategory || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(test);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        tests,
        groupedTests,
        categories: Object.keys(groupedTests)
      }
    });
  } catch (error) {
    console.error('Error fetching test catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test catalog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get test details by codes
router.post('/catalog/details', async (req, res) => {
  try {
    const { testCodes } = req.body;
    
    if (!testCodes || !Array.isArray(testCodes)) {
      return res.status(400).json({
        success: false,
        message: 'Test codes array is required'
      });
    }

    const tests = await LabWorkflowTestCatalog.getTestsByCodes(testCodes);
    const totalPrice = await LabWorkflowTestCatalog.calculateTotalPrice(testCodes);

    res.json({
      success: true,
      data: {
        tests,
        totalPrice,
        estimatedTime: Math.max(...tests.map(t => t.turnaroundTimeHours))
      }
    });
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== LAB ORDER ROUTES ==========

// Create new lab order (doctors only)
router.post('/orders', createLabOrder);

// Get lab orders (filtered by role)
router.get('/orders', getLabOrders);

// Get specific lab order
router.get('/orders/:id', getLabOrder);

// Update lab order status
router.patch('/orders/:id/status', updateLabOrderStatus);

// Get lab order statistics
router.get('/orders/stats/summary', getLabOrderStats);

// ========== LAB RESULT ROUTES (PROPER MEDICAL WORKFLOW) ==========

// STEP 1: Create lab result record (PROPER WORKFLOW)
router.post('/results/create-record', createLabResultRecord);

// STEP 2: Submit lab results for validation
router.post('/results/submit', submitLabResults);

// STEP 3: Release results to doctor (technician releases, NOT completes)
router.post('/results/release-to-doctor', releaseResultsToDoctor);

// STEP 4: Doctor review and completion (DOCTOR completes, not technician)
router.post('/results/doctor-review', doctorReviewLabResults);

// ========== LEGACY LAB RESULT ROUTES (DEPRECATED) ==========

// Upload lab results (DEPRECATED - use proper workflow above)
router.post('/results', uploadLabResult);

// Get lab results (filtered by role)
router.get('/results', getLabResults);

// Get specific lab result
router.get('/results/:id', getLabResult);

// Verify lab result (lab technicians/admins only)
router.patch('/results/:id/verify', verifyLabResult);

// Add result to medical record (doctors only)
router.post('/results/:id/medical-record', addToMedicalRecord);

// Get critical results needing attention
router.get('/results/critical/alerts', getCriticalResults);

// ========== LAB WORKSHEET ROUTES (PROPER MEDICAL WORKFLOW) ==========

// Create lab worksheet (Step 1: After order received)
router.post('/worksheets', createLabWorksheet);

// Record sample collection (Step 2: Sample collected)
router.post('/worksheets/:id/sample-collection', recordSampleCollection);

// Start processing (Step 3: Begin analysis)
router.post('/worksheets/:id/start-processing', startProcessing);

// Get specific worksheet
router.get('/worksheets/:id', getLabWorksheet);

// Get worksheets with filtering
router.get('/worksheets', getLabWorksheets);

// ========== LAB TECHNICIAN DASHBOARD ROUTES ==========

// Get technician dashboard data
router.get('/technician/dashboard', async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [
      pendingOrders,
      processingOrders,
      completedToday,
      criticalResults,
      recentActivity
    ] = await Promise.all([
      // Pending orders (orders ready for technician processing)
      db.LabWorkflowOrder.findAll({
        where: { 
          status: { [Op.in]: ['pending', 'collected'] }
        },
        include: [
          {
            model: db.User,
            as: 'patient',
            attributes: ['walletAddress', 'name', 'email']
          },
          {
            model: db.User,
            as: 'doctor',
            attributes: ['walletAddress', 'name', 'email']
          }
        ],
        order: [
          ['priority', 'DESC'], // stat > urgent > routine
          ['created_at', 'ASC']
        ],
        limit: 10
      }),
      
      // Currently processing orders
      db.LabWorkflowOrder.getOrdersByStatus('processing', { limit: 10 }),
      
      // Completed today
      db.LabWorkflowResult.count({
        where: {
          created_at: {
            [db.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Critical results needing attention
      db.LabWorkflowResult.getCriticalResults({ limit: 5 }),
      
      // Recent activity
      LabWorkflowAccessLog.getRecentActivity(20)
    ]);

    res.json({
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
    });

  } catch (error) {
    console.error('Error fetching technician dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get technician work queue
router.get('/technician/queue', async (req, res) => {
  try {
    const { priority, status } = req.query;
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Default to showing orders ready for technician processing
    const where = {};
    if (status) {
      where.status = status;
    } else {
      // Show orders that are ready for technician work (pending or collected)
      where.status = { [Op.in]: ['pending', 'collected'] };
    }
    
    if (priority) where.priority = priority;

    const orders = await db.LabWorkflowOrder.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'patient',
          attributes: ['walletAddress', 'name']
        },
        {
          model: db.User,
          as: 'doctor',
          attributes: ['walletAddress', 'name']
        }
      ],
      order: [
        ['priority', 'DESC'], // stat > urgent > routine
        ['created_at', 'ASC'] // oldest first
      ]
    });

    // Get test details for each order
    const ordersWithTests = await Promise.all(
      orders.map(async (order) => {
        const testDetails = await LabWorkflowTestCatalog.getTestsByCodes(order.testCodes);
        return {
          ...order.toJSON(),
          testDetails
        };
      })
    );

    res.json({
      success: true,
      data: {
        orders: ordersWithTests,
        count: ordersWithTests.length
      }
    });

  } catch (error) {
    console.error('Error fetching work queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work queue',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== PATIENT SELECTION ROUTES ==========

// Get doctor's patients (from appointments) for lab order selection
router.get('/patients', async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];

    if (!['doctor', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Only doctors can access their patients'
      });
    }

    const { search, limit = 50 } = req.query;
    
    // For doctors, only show patients from their appointments
    const doctorWallet = userRole === 'admin' ? req.query.doctorWallet : userWalletAddress?.toLowerCase();

    if (!doctorWallet) {
      return res.status(400).json({
        success: false,
        message: 'Doctor wallet address required'
      });
    }

    try {
      // Get unique patients from doctor's appointments
      // Try different possible field names and statuses
      const appointments = await db.Appointment.findAll({
        where: {
          doctorWalletAddress: doctorWallet
          // Remove status filter for now to see all appointments
        },
        attributes: ['patientWalletAddress'],
        raw: true
      });

      if (appointments.length === 0) {
        return res.json({
          success: true,
          data: {
            patients: [],
            count: 0,
            hasMore: false,
            message: 'No patients found. Patients will appear here after they book appointments with you.'
          }
        });
      }

      // Get unique patient wallet addresses from appointments
      const uniquePatientWallets = [...new Set(appointments.map(apt => apt.patientWalletAddress))];

      // Fetch patient details
      const patients = await db.User.findAll({
        where: {
          walletAddress: {
            [db.Sequelize.Op.in]: uniquePatientWallets
          },
          role: 'patient'
        },
        attributes: [
          'walletAddress',
          'email',
          'name',
          'profileData',
          'createdAt'
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });



      // Format patient data for frontend
      const formattedPatients = patients.map(patient => {
        // Try to get name from different sources
        let fullName = 'Unknown Patient';
        
        if (patient.name) {
          fullName = patient.name;
        } else if (patient.profileData) {
          const profileData = typeof patient.profileData === 'string' 
            ? JSON.parse(patient.profileData) 
            : patient.profileData;
          
          if (profileData.fullName) {
            fullName = profileData.fullName;
          } else if (profileData.firstName && profileData.lastName) {
            fullName = `${profileData.firstName} ${profileData.lastName}`;
          } else if (profileData.name) {
            fullName = profileData.name;
          }
        }
        
        // Fallback to email if no name found
        if (fullName === 'Unknown Patient' && patient.email) {
          fullName = patient.email.split('@')[0];
        }
        
        const patientData = {
          walletAddress: patient.walletAddress,
          email: patient.email,
          fullName,
          createdAt: patient.createdAt,
          // Display format for dropdown
          displayName: `${fullName} (${patient.walletAddress.slice(0, 8)}...${patient.walletAddress.slice(-6)})`,
          searchText: `${fullName} ${patient.email} ${patient.walletAddress}`.toLowerCase()
        };

        // Apply search filter if provided
        if (search && !patientData.searchText.includes(search.toLowerCase())) {
          return null;
        }

        return patientData;
      }).filter(Boolean); // Remove null entries from search filter

      res.json({
        success: true,
        data: {
          patients: formattedPatients,
          count: formattedPatients.length,
          hasMore: formattedPatients.length >= parseInt(limit),
          doctorWallet,
          totalAppointmentPatients: uniquePatientWallets.length
        }
      });

    } catch (dbError) {
      console.error('Database error fetching doctor patients:', dbError);
      
      // No fallback - return empty list if database query fails
      res.json({
        success: true,
        data: {
          patients: [],
          count: 0,
          hasMore: false,
          message: 'No patients found. Patients will appear here after they book appointments with you.',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
          doctorWallet
        }
      });
    }

  } catch (error) {
    console.error('Error fetching doctor patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor patients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== DOCTOR DASHBOARD ROUTES ==========

// Get doctor lab overview
router.get('/doctor/overview', async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (userRole !== 'doctor' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const doctorWallet = userRole === 'admin' ? req.query.doctorWallet : userWalletAddress.toLowerCase();

    const [
      pendingOrders,
      completedResults,
      criticalResults,
      recentOrders
    ] = await Promise.all([
      // Pending orders
      db.LabWorkflowOrder.count({
        where: {
          doctorWalletAddress: doctorWallet,
          status: { [db.Sequelize.Op.in]: ['pending', 'collected', 'processing'] }
        }
      }),
      
      // Completed results ready for review
      db.LabWorkflowResult.count({
        include: [{
          model: db.LabWorkflowOrder,
          as: 'labOrder',
          where: { doctorWalletAddress: doctorWallet }
        }],
        where: { verificationStatus: 'verified' }
      }),
      
      // Critical results needing attention
      db.LabWorkflowResult.findAll({
        where: { hasCriticalValues: true },
        include: [{
          model: db.LabWorkflowOrder,
          as: 'labOrder',
          where: { doctorWalletAddress: doctorWallet },
          include: [
            { model: db.User, as: 'patient', attributes: ['walletAddress', 'name', 'email'] }
          ]
        }],
        limit: 5,
        order: [['created_at', 'DESC']]
      }),
      
      // Recent orders
      db.LabWorkflowOrder.getOrdersByDoctor(doctorWallet, { limit: 10 })
    ]);

    res.json({
      success: true,
      data: {
        statistics: {
          pendingOrders,
          completedResults,
          criticalResultsCount: criticalResults.length
        },
        alerts: {
          criticalResults
        },
        recentOrders
      }
    });

  } catch (error) {
    console.error('Error fetching doctor lab overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== PATIENT ROUTES ==========

// Get patient lab history
router.get('/patient/history', async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const patientWallet = userRole === 'patient' 
      ? userWalletAddress.toLowerCase() 
      : req.query.patientWallet?.toLowerCase();

    if (!patientWallet) {
      return res.status(400).json({
        success: false,
        message: 'Patient wallet address required'
      });
    }

    // Check access permissions
    if (userRole === 'patient' && patientWallet !== userWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [orders, results] = await Promise.all([
      db.LabWorkflowOrder.getOrdersByPatient(patientWallet),
      db.LabWorkflowResult.getResultsByPatient(patientWallet)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        results,
        summary: {
          totalOrders: orders.length,
          completedResults: results.length,
          pendingOrders: orders.filter(o => o.status !== 'completed').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching patient lab history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== AUDIT & REPORTING ROUTES ==========

// Get access logs
router.get('/audit/access-logs', async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!['admin', 'lab_technician'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      labResultId,
      labOrderId,
      userWalletAddress,
      action,
      startDate,
      endDate,
      limit = 100
    } = req.query;

    const accessLogs = await LabWorkflowAccessLog.getAccessHistory({
      labResultId,
      labOrderId,
      userWalletAddress,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit)
    });

    const summary = await LabWorkflowAccessLog.getAccessSummary({
      labResultId,
      labOrderId,
      userWalletAddress,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.json({
      success: true,
      data: {
        accessLogs,
        summary
      }
    });

  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch access logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;