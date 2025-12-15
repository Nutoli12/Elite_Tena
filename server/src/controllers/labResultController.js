import db from '../models/index.js';
import { Op } from 'sequelize';
import LabNotificationService from '../services/LabNotificationService.js';

const { LabWorkflowResult, LabWorkflowOrder, LabWorkflowTestCatalog, User, LabWorkflowAccessLog, MedicalRecord } = db;

// STEP 1: CREATE LAB RESULT RECORD (PROPER MEDICAL WORKFLOW)
export const createLabResultRecord = async (req, res) => {
  try {
    const { labOrderId, technicianId, testCodes } = req.body;
    const technicianWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!technicianWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians can create result records'
      });
    }

    // Verify lab order exists and is ready
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

    if (!['collected', 'pending'].includes(labOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Lab order is not ready for result creation'
      });
    }

    // Check if result record already exists
    const existingResult = await LabWorkflowResult.findOne({
      where: { labOrderId }
    });

    if (existingResult) {
      return res.status(409).json({
        success: false,
        message: 'Result record already exists for this order'
      });
    }

    // Create empty result record
    const resultRecord = await LabWorkflowResult.create({
      labOrderId,
      technicianWalletAddress: technicianWalletAddress.toLowerCase(),
      status: 'draft', // NOT 'completed'!
      resultData: {}, // Empty - to be filled
      interpretation: '',
      technicianNotes: '',
      verificationStatus: 'pending',
      hasCriticalValues: false,
      criticalValues: [],
      reportFiles: [],
      rawDataFiles: []
    });

    // Update order status to processing
    await labOrder.update({
      status: 'processing',
      processingStartedAt: new Date(),
      statusChangedBy: technicianWalletAddress.toLowerCase()
    });

    // Log the creation
    await LabWorkflowAccessLog.logAccess({
      labResultId: resultRecord.id,
      labOrderId: labOrder.id,
      userWalletAddress: technicianWalletAddress.toLowerCase(),
      userRole: 'lab_technician',
      action: 'create_record',
      resourceType: 'result',
      accessedData: { testCodes },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Result record created successfully. Begin data entry.',
      data: {
        resultRecord,
        labOrder
      }
    });

  } catch (error) {
    console.error('Error creating lab result record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lab result record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// STEP 2: SUBMIT LAB RESULTS FOR VALIDATION
export const submitLabResults = async (req, res) => {
  try {
    const {
      resultRecordId,
      resultData,
      interpretation,
      technicianNotes,
      qualityChecks,
      reportFiles = [],
      rawDataFiles = []
    } = req.body;

    const technicianWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!technicianWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians can submit results'
      });
    }

    // Find the result record
    const resultRecord = await LabWorkflowResult.findByPk(resultRecordId, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient' },
            { model: User, as: 'doctor' }
          ]
        }
      ]
    });

    if (!resultRecord) {
      return res.status(404).json({
        success: false,
        message: 'Result record not found'
      });
    }

    if (resultRecord.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Result record is not in draft status'
      });
    }

    // Validate results
    const validation = await validateLabResults(resultData, resultRecord.labOrder.testCodes);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Update result record
    await resultRecord.update({
      resultData,
      interpretation,
      technicianNotes,
      qualityChecks,
      reportFiles,
      rawDataFiles,
      status: 'submitted',
      submittedAt: new Date(),
      hasCriticalValues: validation.criticalValues.length > 0,
      criticalValues: validation.criticalValues
    });

    // Log submission
    await LabWorkflowAccessLog.logAccess({
      labResultId: resultRecord.id,
      labOrderId: resultRecord.labOrderId,
      userWalletAddress: technicianWalletAddress.toLowerCase(),
      userRole: 'lab_technician',
      action: 'submit_results',
      resourceType: 'result',
      accessedData: {
        hasCriticalValues: validation.criticalValues.length > 0,
        criticalCount: validation.criticalValues.length
      },
      req
    });

    res.json({
      success: true,
      message: 'Results submitted for validation',
      data: {
        resultRecord,
        validation
      }
    });

  } catch (error) {
    console.error('Error submitting lab results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit lab results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// STEP 3: RELEASE RESULTS TO DOCTOR (NOT "COMPLETE")
export const releaseResultsToDoctor = async (req, res) => {
  try {
    const { resultRecordId, finalValidation } = req.body;
    const technicianWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!technicianWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians can release results'
      });
    }

    // Find the result record
    const resultRecord = await LabWorkflowResult.findByPk(resultRecordId, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient' },
            { model: User, as: 'doctor' }
          ]
        }
      ]
    });

    if (!resultRecord) {
      return res.status(404).json({
        success: false,
        message: 'Result record not found'
      });
    }

    if (resultRecord.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Results must be submitted before release'
      });
    }

    // Final validation
    if (finalValidation) {
      const validation = await validateLabResults(resultRecord.resultData, resultRecord.labOrder.testCodes);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Final validation failed',
          errors: validation.errors
        });
      }
    }

    // Update result status to RELEASED (not completed!)
    await resultRecord.update({
      status: 'released',
      releasedAt: new Date(),
      releasedBy: technicianWalletAddress.toLowerCase(),
      verificationStatus: 'technician_verified'
    });

    // Update order status to results_released (NOT completed!)
    await resultRecord.labOrder.update({
      status: 'results_released', // Doctor must review before completion
      statusChangedBy: technicianWalletAddress.toLowerCase()
    });

    // Get test details for notification
    const testDetails = await LabWorkflowTestCatalog.getTestsByCodes(resultRecord.labOrder.testCodes);

    // Send notification to doctor
    try {
      const notificationResult = await LabNotificationService.notifyDoctorResultsReleased(
        resultRecord,
        testDetails
      );
      
      if (notificationResult.success) {
        console.log(`✅ Notified Dr. ${resultRecord.labOrder.doctor?.name} about released results`);
      }
    } catch (notificationError) {
      console.error('❌ Error sending doctor notification:', notificationError);
    }

    // Log the release
    await LabWorkflowAccessLog.logAccess({
      labResultId: resultRecord.id,
      labOrderId: resultRecord.labOrderId,
      userWalletAddress: technicianWalletAddress.toLowerCase(),
      userRole: 'lab_technician',
      action: 'release_to_doctor',
      resourceType: 'result',
      accessedData: {
        doctorWallet: resultRecord.labOrder.doctorWalletAddress,
        hasCriticalValues: resultRecord.hasCriticalValues
      },
      req
    });

    res.json({
      success: true,
      message: `Results released to Dr. ${resultRecord.labOrder.doctor?.name}. Doctor must review before completion.`,
      data: {
        resultRecord,
        doctorNotified: true,
        nextStep: 'doctor_review_required'
      }
    });

  } catch (error) {
    console.error('Error releasing results to doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release results to doctor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// STEP 4: DOCTOR REVIEW & COMPLETION (DOCTOR COMPLETES, NOT TECHNICIAN)
export const doctorReviewLabResults = async (req, res) => {
  try {
    const { resultRecordId, action, doctorNotes, doctorInterpretation } = req.body;
    const doctorWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!doctorWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'doctor' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can review and complete results'
      });
    }

    if (!['accept', 'request_correction'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "accept" or "request_correction"'
      });
    }

    // Find the result record
    const resultRecord = await LabWorkflowResult.findByPk(resultRecordId, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient' },
            { model: User, as: 'doctor' }
          ]
        }
      ]
    });

    if (!resultRecord) {
      return res.status(404).json({
        success: false,
        message: 'Result record not found'
      });
    }

    if (resultRecord.status !== 'released') {
      return res.status(400).json({
        success: false,
        message: 'Results must be released before doctor review'
      });
    }

    // Check if doctor has permission
    if (userRole === 'doctor' && resultRecord.labOrder.doctorWalletAddress !== doctorWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Only the ordering doctor can review these results'
      });
    }

    if (action === 'accept') {
      // Doctor accepts - NOW the order can be completed
      await resultRecord.update({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: doctorWalletAddress.toLowerCase(),
        doctorInterpretation,
        doctorNotes
      });

      // NOW the order becomes completed (by doctor, not technician)
      await resultRecord.labOrder.update({
        status: 'completed',
        completedAt: new Date(),
        completedBy: doctorWalletAddress.toLowerCase() // DOCTOR completes, not technician
      });

      // Log completion
      await LabWorkflowAccessLog.logAccess({
        labResultId: resultRecord.id,
        labOrderId: resultRecord.labOrderId,
        userWalletAddress: doctorWalletAddress.toLowerCase(),
        userRole: 'doctor',
        action: 'complete_order',
        resourceType: 'result',
        accessedData: { doctorNotes, doctorInterpretation },
        req
      });

      res.json({
        success: true,
        message: 'Results accepted and order completed successfully',
        data: {
          resultRecord,
          orderCompleted: true
        }
      });

    } else if (action === 'request_correction') {
      // Doctor requests correction
      await resultRecord.update({
        status: 'correction_requested',
        correctionRequestedAt: new Date(),
        correctionRequestedBy: doctorWalletAddress.toLowerCase(),
        correctionNotes: doctorNotes
      });

      // Update order status
      await resultRecord.labOrder.update({
        status: 'correction_needed',
        statusChangedBy: doctorWalletAddress.toLowerCase()
      });

      res.json({
        success: true,
        message: 'Correction requested. Results sent back to technician.',
        data: {
          resultRecord,
          correctionRequested: true
        }
      });
    }

  } catch (error) {
    console.error('Error in doctor review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process doctor review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// VALIDATION HELPER FUNCTION
const validateLabResults = async (resultData, testCodes) => {
  const errors = [];
  const warnings = [];
  const criticalValues = [];

  // Check 1: Required fields
  const emptyResults = testCodes.filter(testCode => !resultData[testCode]?.value?.trim());
  if (emptyResults.length > 0) {
    errors.push(`Missing values for tests: ${emptyResults.join(', ')}`);
  }

  // Check 2: Value ranges and critical detection
  for (const [testCode, testResult] of Object.entries(resultData)) {
    if (testResult.value) {
      const numValue = parseFloat(testResult.value);
      
      if (!isNaN(numValue)) {
        // Critical value thresholds
        const criticalRanges = {
          'GLUCOSE': { low: 40, high: 400 },
          'TROPONIN': { low: 0, high: 0.4 },
          'CREATININE': { low: 0, high: 5.0 }
        };

        // Normal ranges
        const normalRanges = {
          'GLUCOSE': { low: 70, high: 100 },
          'TROPONIN': { low: 0, high: 0.04 },
          'CREATININE': { low: 0.6, high: 1.2 }
        };

        if (criticalRanges[testCode]) {
          const critical = criticalRanges[testCode];
          if (numValue <= critical.low || numValue >= critical.high) {
            criticalValues.push({
              testCode,
              testName: getTestDisplayName(testCode),
              value: testResult.value,
              unit: testResult.unit,
              severity: 'critical'
            });
          }
        }

        if (normalRanges[testCode]) {
          const normal = normalRanges[testCode];
          if (numValue < normal.low || numValue > normal.high) {
            warnings.push(`${getTestDisplayName(testCode)}: ${testResult.value} ${testResult.unit} is outside normal range`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    criticalValues,
    requiresReview: criticalValues.length > 0 || warnings.length > 0
  };
};

const getTestDisplayName = (testCode) => {
  const names = {
    'CBC': 'Complete Blood Count',
    'CHEM': 'Basic Metabolic Panel',
    'LIPID': 'Lipid Profile',
    'GLUCOSE': 'Glucose Level',
    'TROPONIN': 'Troponin I Quantitative',
    'MALARIA': 'Malaria Parasite (Microscopy)',
    'URINALYSIS': 'Urinalysis Complete',
    'HBA1C': 'Hemoglobin A1c',
    'TSH': 'Thyroid Stimulating Hormone',
    'CREATININE': 'Serum Creatinine'
  };
  return names[testCode] || testCode;
};

/**
 * Lab Result Controller
 * Handles lab result upload, verification, and management for technicians
 */

// Upload lab results
export const uploadLabResult = async (req, res) => {
  try {
    const {
      labOrderId,
      resultData,
      interpretation,
      technicianNotes,
      reportFiles = [],
      rawDataFiles = []
    } = req.body;

    const technicianWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!technicianWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'lab_technician' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians can upload results'
      });
    }

    if (!labOrderId || !resultData) {
      return res.status(400).json({
        success: false,
        message: 'Lab order ID and result data are required'
      });
    }

    // Verify lab order exists and is ready for results
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

    if (!['collected', 'processing'].includes(labOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Lab order is not ready for results upload'
      });
    }

    // Check if results already exist
    const existingResult = await LabWorkflowResult.findOne({
      where: { labOrderId }
    });

    if (existingResult) {
      return res.status(409).json({
        success: false,
        message: 'Results already exist for this order. Use update endpoint instead.'
      });
    }

    // Get reference ranges from test catalog
    const testDetails = await LabWorkflowTestCatalog.getTestsByCodes(labOrder.testCodes);
    const referenceRanges = {};
    
    testDetails.forEach(test => {
      if (test.referenceRanges) {
        referenceRanges[test.testCode] = test.referenceRanges;
      }
    });

    // Detect critical values from result data
    const criticalValues = [];
    let hasCriticalValues = false;

    for (const [testCode, testResult] of Object.entries(resultData)) {
      if (testResult.status === 'critical') {
        criticalValues.push({
          testCode,
          testName: testDetails.find(t => t.testCode === testCode)?.testName || testCode,
          value: testResult.value,
          unit: testResult.unit,
          referenceRange: testResult.referenceRange,
          severity: 'critical'
        });
        hasCriticalValues = true;
      }
    }

    // Create lab result
    const labResult = await LabWorkflowResult.create({
      labOrderId,
      technicianWalletAddress: technicianWalletAddress.toLowerCase(),
      resultData,
      interpretation,
      technicianNotes,
      referenceRanges,
      reportFiles,
      rawDataFiles,
      hasCriticalValues,
      criticalValues
    });

    // Update lab order status
    await labOrder.update({
      status: 'completed',
      statusChangedBy: technicianWalletAddress.toLowerCase()
    });

    // Log the upload
    await LabWorkflowAccessLog.logAccess({
      labResultId: labResult.id,
      labOrderId: labOrder.id,
      userWalletAddress: technicianWalletAddress.toLowerCase(),
      userRole: 'lab_technician',
      action: 'upload',
      resourceType: 'result',
      accessedData: {
        testCodes: labOrder.testCodes,
        hasCriticalValues: labResult.hasCriticalValues
      },
      req
    });

    // Fetch complete result with associations
    const completeResult = await LabWorkflowResult.findByPk(labResult.id, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'email'] },
            { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'email'] }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['walletAddress', 'name']
        }
      ]
    });

    // 📧 Send notification to the ordering doctor
    try {
      const notificationResult = await LabNotificationService.notifyDoctorResultsUploaded(
        completeResult, 
        testDetails
      );
      
      if (notificationResult.success) {
        console.log(`✅ Notified Dr. ${completeResult.labOrder.doctor?.name} about uploaded results for order ${completeResult.labOrder.orderNumber}`);
      } else {
        console.error('⚠️  Failed to send doctor notification:', notificationResult.error);
      }
    } catch (notificationError) {
      console.error('❌ Error sending doctor notification:', notificationError);
      // Don't fail the upload if notifications fail
    }

    res.status(201).json({
      success: true,
      message: `Lab results uploaded successfully! Dr. ${completeResult.labOrder.doctor?.name || 'the ordering doctor'} has been notified.`,
      data: {
        labResult: completeResult,
        criticalValuesDetected: labResult.hasCriticalValues,
        summary: labResult.generateSummary(),
        doctorNotified: true,
        doctorInfo: {
          name: completeResult.labOrder.doctor?.name,
          email: completeResult.labOrder.doctor?.email
        }
      }
    });

  } catch (error) {
    console.error('Error uploading lab result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload lab results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get lab results (with filtering)
export const getLabResults = async (req, res) => {
  try {
    const {
      patientWallet,
      doctorWallet,
      labOrderId,
      verificationStatus,
      hasCriticalValues,
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
    
    if (labOrderId) where.labOrderId = labOrderId;
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (hasCriticalValues !== undefined) where.hasCriticalValues = hasCriticalValues === 'true';

    // Date range filter
    if (startDate || endDate) {
      where.resultDate = {};
      if (startDate) where.resultDate[Op.gte] = new Date(startDate);
      if (endDate) where.resultDate[Op.lte] = new Date(endDate);
    }

    // Build include clause with role-based filtering
    const include = [
      {
        model: LabWorkflowOrder,
        as: 'labOrder',
        include: [
          { model: User, as: 'patient', attributes: ['walletAddress', 'name'] },
          { model: User, as: 'doctor', attributes: ['walletAddress', 'name'] }
        ]
      },
      {
        model: User,
        as: 'technician',
        attributes: ['walletAddress', 'name']
      }
    ];

    // Role-based access control
    if (userRole === 'patient') {
      include[0].where = { patientWalletAddress: userWalletAddress.toLowerCase() };
    } else if (userRole === 'doctor') {
      include[0].where = { doctorWalletAddress: userWalletAddress.toLowerCase() };
    }

    // Additional filters for specific requests
    if (patientWallet && (userRole === 'admin' || userRole === 'doctor' || userRole === 'lab_technician')) {
      include[0].where = { ...include[0].where, patientWalletAddress: patientWallet.toLowerCase() };
    }
    if (doctorWallet && (userRole === 'admin' || userRole === 'lab_technician')) {
      include[0].where = { ...include[0].where, doctorWalletAddress: doctorWallet.toLowerCase() };
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: labResults } = await LabWorkflowResult.findAndCountAll({
      where,
      include,
      order: [['resultDate', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Log access
    await LabWorkflowAccessLog.logAccess({
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole,
      action: 'view',
      resourceType: 'result_list',
      accessedData: { filters: req.query },
      req
    });

    res.json({
      success: true,
      data: {
        labResults,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching lab results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get specific lab result
export const getLabResult = async (req, res) => {
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

    const labResult = await LabWorkflowResult.findByPk(id, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'email'] },
            { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'email'] }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['walletAddress', 'name']
        }
      ]
    });

    if (!labResult) {
      return res.status(404).json({
        success: false,
        message: 'Lab result not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      userRole === 'admin' ||
      labResult.labOrder.patientWalletAddress === userWalletAddress.toLowerCase() ||
      labResult.labOrder.doctorWalletAddress === userWalletAddress.toLowerCase() ||
      userRole === 'lab_technician';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get test details and validation
    const testDetails = await LabWorkflowTestCatalog.getTestsByCodes(labResult.labOrder.testCodes);
    const validation = {};
    
    testDetails.forEach(test => {
      if (labResult.resultData[test.testCode]) {
        validation[test.testCode] = test.validateResult(labResult.resultData[test.testCode]);
      }
    });

    // Log access
    await LabWorkflowAccessLog.logAccess({
      labResultId: labResult.id,
      labOrderId: labResult.labOrderId,
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole,
      action: 'view',
      resourceType: 'result',
      accessedData: { resultId: id },
      req
    });

    res.json({
      success: true,
      data: {
        labResult,
        testDetails,
        validation,
        summary: labResult.generateSummary()
      }
    });

  } catch (error) {
    console.error('Error fetching lab result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab result',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify lab result
export const verifyLabResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, verificationNotes } = req.body;
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!['admin', 'lab_technician'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only lab technicians and admins can verify results'
      });
    }

    if (!['verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status'
      });
    }

    const labResult = await LabWorkflowResult.findByPk(id);

    if (!labResult) {
      return res.status(404).json({
        success: false,
        message: 'Lab result not found'
      });
    }

    // Update verification
    await labResult.update({
      verificationStatus,
      verificationNotes,
      verifiedBy: userWalletAddress.toLowerCase(),
      verifiedAt: new Date()
    });

    // Log the verification
    await LabWorkflowAccessLog.logAccess({
      labResultId: labResult.id,
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole,
      action: 'verify',
      resourceType: 'result',
      accessedData: {
        verificationStatus,
        verificationNotes
      },
      req
    });

    res.json({
      success: true,
      message: 'Lab result verification updated successfully',
      data: { labResult }
    });

  } catch (error) {
    console.error('Error verifying lab result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify lab result',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add result to medical record
export const addToMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorInterpretation, clinicalNotes } = req.body;
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'doctor' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can add results to medical records'
      });
    }

    const labResult = await LabWorkflowResult.findByPk(id, {
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient' },
            { model: User, as: 'doctor' }
          ]
        }
      ]
    });

    if (!labResult) {
      return res.status(404).json({
        success: false,
        message: 'Lab result not found'
      });
    }

    // Check if doctor has permission (must be the ordering doctor or admin)
    if (userRole === 'doctor' && labResult.labOrder.doctorWalletAddress !== userWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Only the ordering doctor can add this result to medical records'
      });
    }

    // Create medical record entry
    const medicalRecord = await MedicalRecord.create({
      patientWalletAddress: labResult.labOrder.patientWalletAddress,
      doctorWalletAddress: userWalletAddress.toLowerCase(),
      recordType: 'lab_result',
      title: `Lab Results - ${labResult.labOrder.orderNumber}`,
      content: {
        labOrderId: labResult.labOrderId,
        labResultId: labResult.id,
        testCodes: labResult.labOrder.testCodes,
        resultData: labResult.resultData,
        doctorInterpretation,
        clinicalNotes,
        criticalValues: labResult.criticalValues,
        resultDate: labResult.resultDate
      },
      metadata: {
        source: 'lab_workflow',
        orderNumber: labResult.labOrder.orderNumber,
        technicianWallet: labResult.technicianWalletAddress
      }
    });

    // Log the action
    await LabWorkflowAccessLog.logAccess({
      labResultId: labResult.id,
      userWalletAddress: userWalletAddress.toLowerCase(),
      userRole,
      action: 'add_to_medical_record',
      resourceType: 'result',
      accessedData: {
        medicalRecordId: medicalRecord.id,
        doctorInterpretation,
        clinicalNotes
      },
      req
    });

    res.json({
      success: true,
      message: 'Lab result added to medical record successfully',
      data: {
        medicalRecord,
        labResult
      }
    });

  } catch (error) {
    console.error('Error adding result to medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add result to medical record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get critical results that need attention
export const getCriticalResults = async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!['admin', 'lab_technician', 'doctor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const criticalResults = await LabWorkflowResult.getCriticalResults({
      include: [
        {
          model: LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: User, as: 'patient', attributes: ['walletAddress', 'name'] },
            { model: User, as: 'doctor', attributes: ['walletAddress', 'name'] }
          ],
          ...(userRole === 'doctor' && {
            where: { doctorWalletAddress: userWalletAddress.toLowerCase() }
          })
        }
      ]
    });

    res.json({
      success: true,
      data: {
        criticalResults,
        count: criticalResults.length
      }
    });

  } catch (error) {
    console.error('Error fetching critical results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch critical results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};