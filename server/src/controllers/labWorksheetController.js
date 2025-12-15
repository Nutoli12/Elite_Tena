import db from '../models/index.js';
import { Op } from 'sequelize';

const { LabWorkflowOrder, LabWorksheet, SampleCollection, ProcessingRecord, User, LabWorkflowAccessLog } = db;

/**
 * Lab Worksheet Controller
 * Handles lab worksheet creation, sample collection, and processing workflow
 */

// Create lab worksheet
export const createLabWorksheet = async (req, res) => {
  try {
    const {
      labOrderId,
      accessionNumber,
      technicianId,
      sampleCollectionStatus = 'pending',
      processingStatus = 'queued',
      chainOfCustody = []
    } = req.body;

    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians can create worksheets'
      });
    }

    if (!labOrderId || !accessionNumber) {
      return res.status(400).json({
        success: false,
        message: 'Lab order ID and accession number are required'
      });
    }

    // Verify lab order exists
    const labOrder = await LabWorkflowOrder.findByPk(labOrderId, {
      include: [
        { model: User, as: 'patient' },
        { model: User, as: 'doctor' }
      ]
    });

    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }

    // Check if worksheet already exists for this order
    const existingWorksheet = await LabWorksheet.findOne({
      where: { labOrderId }
    });

    if (existingWorksheet) {
      return res.status(409).json({
        success: false,
        message: 'Worksheet already exists for this order'
      });
    }

    // Create worksheet
    const worksheet = await LabWorksheet.create({
      accessionNumber,
      labOrderId,
      technicianId: userWalletAddress.toLowerCase(),
      sampleCollectionStatus,
      processingStatus,
      chainOfCustody,
      createdAt: new Date()
    });

    // Update lab order status
    await labOrder.update({
      status: 'processing',
      statusChangedBy: userWalletAddress.toLowerCase()
    });

    // Log the creation
    await LabWorkflowAccessLog.logAccess({
      labOrderId: labOrder.id,
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole: 'lab_technician',
      action: 'create_worksheet',
      resourceType: 'worksheet',
      accessedData: {
        accessionNumber,
        worksheetId: worksheet.id
      },
      req
    });

    // Fetch complete worksheet with associations
    const completeWorksheet = await LabWorksheet.findByPk(worksheet.id, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient' },
            { model: User, as: 'doctor' }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['walletAddress', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Lab worksheet created successfully',
      data: {
        worksheet: completeWorksheet
      }
    });

  } catch (error) {
    console.error('Error creating lab worksheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lab worksheet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Record sample collection
export const recordSampleCollection = async (req, res) => {
  try {
    const {
      worksheetId,
      sampleType,
      collectionMethod,
      sampleVolume,
      containerType,
      storageLocation,
      collectedBy,
      collectionDateTime,
      barcode,
      specialHandling
    } = req.body;

    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians can record sample collection'
      });
    }

    // Find worksheet
    const worksheet = await LabWorksheet.findByPk(worksheetId);
    if (!worksheet) {
      return res.status(404).json({
        success: false,
        message: 'Worksheet not found'
      });
    }

    // Create sample collection record
    const sampleCollection = await SampleCollection.create({
      worksheetId,
      sampleType,
      collectionMethod,
      sampleVolume,
      containerType,
      storageLocation,
      collectedBy,
      collectionDateTime: new Date(collectionDateTime),
      barcode,
      specialHandling
    });

    // Update worksheet status
    await worksheet.update({
      sampleCollectionStatus: 'collected',
      sampleCollectedAt: new Date(),
      chainOfCustody: [
        ...worksheet.chainOfCustody,
        {
          timestamp: new Date(),
          action: 'sample_collected',
          performedBy: collectedBy,
          location: 'Collection Station',
          notes: `${sampleVolume}mL ${sampleType} collected`
        }
      ]
    });

    res.json({
      success: true,
      message: 'Sample collection recorded successfully',
      data: {
        sampleCollection,
        worksheet
      }
    });

  } catch (error) {
    console.error('Error recording sample collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record sample collection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Start processing
export const startProcessing = async (req, res) => {
  try {
    const {
      worksheetId,
      instrumentUsed,
      operatorId,
      startTime
    } = req.body;

    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians can start processing'
      });
    }

    // Find worksheet
    const worksheet = await LabWorksheet.findByPk(worksheetId);
    if (!worksheet) {
      return res.status(404).json({
        success: false,
        message: 'Worksheet not found'
      });
    }

    // Create processing record
    const processingRecord = await ProcessingRecord.create({
      worksheetId,
      instrumentId: instrumentUsed,
      operatorId: userWalletAddress.toLowerCase(),
      startTime: new Date(startTime),
      environmentalConditions: {
        temperature: 22.5,
        humidity: 45,
        recordedAt: new Date()
      }
    });

    // Update worksheet status
    await worksheet.update({
      processingStatus: 'in_progress',
      processingStartedAt: new Date(),
      instrumentUsed,
      chainOfCustody: [
        ...worksheet.chainOfCustody,
        {
          timestamp: new Date(),
          action: 'processing_started',
          performedBy: operatorId,
          location: 'Processing Lab',
          notes: `Processing started on ${instrumentUsed}`
        }
      ]
    });

    res.json({
      success: true,
      message: 'Processing started successfully',
      data: {
        processingRecord,
        worksheet
      }
    });

  } catch (error) {
    console.error('Error starting processing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start processing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get worksheet by ID
export const getLabWorksheet = async (req, res) => {
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

    const worksheet = await LabWorksheet.findByPk(id, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient' },
            { model: User, as: 'doctor' }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['walletAddress', 'name']
        },
        {
          model: SampleCollection,
          as: 'sampleCollections'
        },
        {
          model: ProcessingRecord,
          as: 'processingRecords'
        }
      ]
    });

    if (!worksheet) {
      return res.status(404).json({
        success: false,
        message: 'Worksheet not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      userRole === 'admin' ||
      userRole === 'lab_technician' ||
      worksheet.labOrder.patientWalletAddress === userWalletAddress.toLowerCase() ||
      worksheet.labOrder.doctorWalletAddress === userWalletAddress.toLowerCase();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        worksheet
      }
    });

  } catch (error) {
    console.error('Error fetching worksheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksheet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get worksheets with filtering
export const getLabWorksheets = async (req, res) => {
  try {
    const {
      status,
      technicianId,
      dateFrom,
      dateTo,
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
    
    if (status) where.processingStatus = status;
    if (technicianId) where.technicianId = technicianId;
    
    // Role-based filtering
    if (userRole === 'lab_technician') {
      where.technicianId = userWalletAddress.toLowerCase();
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: worksheets } = await LabWorksheet.findAndCountAll({
      where,
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient' },
            { model: User, as: 'doctor' }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['walletAddress', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        worksheets,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching worksheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksheets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};