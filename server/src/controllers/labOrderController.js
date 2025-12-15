import db from '../models/index.js';
import { Op } from 'sequelize';
import LabNotificationService from '../services/LabNotificationService.js';

const { LabWorkflowOrder, LabWorkflowResult, LabWorkflowTestCatalog, User, LabWorkflowAccessLog } = db;

/**
 * Lab Order Controller
 * Handles lab test ordering workflow for doctors
 */

// Create a new lab order
export const createLabOrder = async (req, res) => {
  try {
    const {
      patientWalletAddress,
      testCodes,
      priority = 'routine',
      sampleType,
      specialInstructions,
      collectionDate
    } = req.body;

    const doctorWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];

    if (!doctorWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Doctor authentication required'
      });
    }

    if (!patientWalletAddress || !testCodes || !Array.isArray(testCodes) || testCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient wallet address and test codes are required'
      });
    }

    // Verify patient exists
    const patient = await User.findOne({
      where: { walletAddress: patientWalletAddress.toLowerCase() }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify doctor exists and has permission
    const doctor = await User.findOne({
      where: { 
        walletAddress: doctorWalletAddress.toLowerCase(),
        role: 'doctor'
      }
    });

    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can create lab orders'
      });
    }

    // Validate test codes exist in catalog
    const validTests = await LabWorkflowTestCatalog.findAll({
      where: {
        testCode: { [Op.in]: testCodes },
        isActive: true
      }
    });

    if (validTests.length !== testCodes.length) {
      const validCodes = validTests.map(t => t.testCode);
      const invalidCodes = testCodes.filter(code => !validCodes.includes(code));
      
      return res.status(400).json({
        success: false,
        message: 'Invalid test codes',
        invalidCodes
      });
    }

    // Calculate estimated cost
    const totalCost = await LabWorkflowTestCatalog.calculateTotalPrice(testCodes);

    // Generate order number if not provided
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const orderNumber = `LAB-${year}${month}${day}-${timestamp}`;

    // Create lab order
    const labOrder = await LabWorkflowOrder.create({
      orderNumber,
      patientWalletAddress: patientWalletAddress.toLowerCase(),
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      testCodes,
      priority,
      sampleType,
      specialInstructions,
      collectionDate: collectionDate ? new Date(collectionDate) : null,
      statusChangedBy: doctorWalletAddress.toLowerCase()
    });

    // Log the creation
    await LabWorkflowAccessLog.logAccess({
      labOrderId: labOrder.id,
      userWalletAddress: doctorWalletAddress.toLowerCase(),
      userRole: 'doctor',
      action: 'create',
      resourceType: 'order',
      accessedData: {
        testCodes,
        priority,
        patientWalletAddress
      },
      req
    });

    // Fetch complete order with associations
    const completeOrder = await LabWorkflowOrder.findByPk(labOrder.id, {
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
      ]
    });

    // Get test details
    const testDetails = await LabWorkflowTestCatalog.getTestsByCodes(testCodes);

    // 📧 Send notifications to lab technicians
    try {
      const notificationResult = await LabNotificationService.notifyLabTechniciansNewOrder(
        completeOrder, 
        testDetails
      );
      
      if (notificationResult.success) {
        console.log(`✅ Notified ${notificationResult.techniciansNotified} lab technicians about new order ${completeOrder.orderNumber}`);
      } else {
        console.error('⚠️  Failed to send lab technician notifications:', notificationResult.error);
      }
    } catch (notificationError) {
      console.error('❌ Error sending lab technician notifications:', notificationError);
      // Don't fail the order creation if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Lab order created successfully',
      data: {
        labOrder: completeOrder,
        testDetails,
        estimatedCost: totalCost,
        estimatedCompletion: testDetails.map(test => 
          test.getEstimatedCompletionTime(priority)
        ),
        notificationsSent: true // Indicate notifications were attempted
      }
    });

  } catch (error) {
    console.error('Error creating lab order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lab order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get lab orders (with filtering)
export const getLabOrders = async (req, res) => {
  try {
    const {
      status,
      priority,
      patientWallet,
      doctorWallet,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Build where clause
    const where = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    // Role-based filtering
    if (userRole === 'doctor') {
      where.doctorWalletAddress = userWalletAddress.toLowerCase();
    } else if (userRole === 'patient') {
      where.patientWalletAddress = userWalletAddress.toLowerCase();
    } else if (userRole === 'lab_technician') {
      // Lab technicians can see orders that need processing
      // Include 'pending' orders so they appear in incoming queue
      where.status = { [Op.in]: ['pending', 'collected', 'processing'] };
    }

    // Additional filters (for admins or specific requests)
    if (patientWallet && (userRole === 'admin' || userRole === 'doctor')) {
      where.patientWalletAddress = patientWallet.toLowerCase();
    }
    if (doctorWallet && userRole === 'admin') {
      where.doctorWalletAddress = doctorWallet.toLowerCase();
    }

    // Date range filter
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: labOrders } = await LabWorkflowOrder.findAndCountAll({
      where,
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
        },
        {
          model: LabWorkflowResult,
          as: 'labResults',
          required: false,
          attributes: ['id', 'verificationStatus', 'hasCriticalValues', 'resultDate']
        }
      ],
      order: [
        ['priority', 'DESC'], // stat > urgent > routine
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset
    });

    // Log access
    await LabWorkflowAccessLog.logAccess({
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole,
      action: 'view',
      resourceType: 'order_list',
      accessedData: { filters: req.query },
      req
    });

    res.json({
      success: true,
      data: {
        labOrders,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching lab orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get specific lab order
export const getLabOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const labOrder = await LabWorkflowOrder.findByPk(id, {
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
        },
        {
          model: LabWorkflowResult,
          as: 'labResults',
          include: [
            {
              model: User,
              as: 'technician',
              attributes: ['walletAddress', 'name']
            }
          ]
        }
      ]
    });

    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      userRole === 'admin' ||
      labOrder.patientWalletAddress === userWalletAddress.toLowerCase() ||
      labOrder.doctorWalletAddress === userWalletAddress.toLowerCase() ||
      userRole === 'lab_technician';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get test details
    const testDetails = await LabWorkflowTestCatalog.getTestsByCodes(labOrder.testCodes);

    // Log access
    await LabWorkflowAccessLog.logAccess({
      labOrderId: labOrder.id,
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole,
      action: 'view',
      resourceType: 'order',
      accessedData: { orderId: id },
      req
    });

    res.json({
      success: true,
      data: {
        labOrder,
        testDetails
      }
    });

  } catch (error) {
    console.error('Error fetching lab order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update lab order status
export const updateLabOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const labOrder = await LabWorkflowOrder.findByPk(id);

    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }

    // Check permissions for status updates
    const canUpdate = 
      userRole === 'admin' ||
      (userRole === 'lab_technician' && ['collected', 'processing', 'completed'].includes(status)) ||
      (userRole === 'doctor' && labOrder.doctorWalletAddress === userWalletAddress.toLowerCase());

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update order status'
      });
    }

    // Update the order
    await labOrder.update({
      status,
      statusChangedBy: userWalletAddress.toLowerCase(),
      statusChangedAt: new Date()
    });

    // Log the update
    await LabWorkflowAccessLog.logAccess({
      labOrderId: labOrder.id,
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole,
      action: 'edit',
      resourceType: 'order',
      accessedData: {
        oldStatus: labOrder.status,
        newStatus: status,
        notes
      },
      req
    });

    res.json({
      success: true,
      message: 'Lab order status updated successfully',
      data: { labOrder }
    });

  } catch (error) {
    console.error('Error updating lab order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lab order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get lab order statistics
export const getLabOrderStats = async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress || !['admin', 'lab_technician', 'doctor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build base where clause based on role
    let baseWhere = {};
    if (userRole === 'doctor') {
      baseWhere.doctorWalletAddress = userWalletAddress.toLowerCase();
    }

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      urgentOrders,
      todayOrders
    ] = await Promise.all([
      LabWorkflowOrder.count({ where: baseWhere }),
      LabWorkflowOrder.count({ where: { ...baseWhere, status: 'pending' } }),
      LabWorkflowOrder.count({ where: { ...baseWhere, status: 'processing' } }),
      LabWorkflowOrder.count({ where: { ...baseWhere, status: 'completed' } }),
      LabWorkflowOrder.count({ where: { ...baseWhere, priority: { [Op.in]: ['urgent', 'stat'] } } }),
      LabWorkflowOrder.count({
        where: {
          ...baseWhere,
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        urgentOrders,
        todayOrders,
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching lab order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};