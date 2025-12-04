import db from '../models/index.js';
const { LabResult, Patient, LabTechnician } = db;

/**
 * Get all lab results (with optional filtering)
 */
export const getLabResults = async (req, res) => {
  try {
    const { patientWallet } = req.query;

    console.log('🔍 Fetching lab results...');

    const where = {};
    if (patientWallet) {
      where.patientWalletAddress = patientWallet.toLowerCase();
    }

    const labResults = await LabResult.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['walletAddress']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${labResults.length} lab results`);

    res.json({
      success: true,
      data: labResults,
      count: labResults.length
    });
  } catch (error) {
    console.error('❌ Get lab results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lab results',
      message: error.message
    });
  }
};

/**
 * Get lab result by ID
 */
export const getLabResultById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching lab result:', id);

    const labResult = await LabResult.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['walletAddress']
        }
      ]
    });

    if (!labResult) {
      return res.status(404).json({
        success: false,
        error: 'Lab result not found',
        message: `No lab result found with id: ${id}`
      });
    }

    console.log('✅ Lab result found');

    res.json({
      success: true,
      data: labResult
    });
  } catch (error) {
    console.error('❌ Get lab result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lab result',
      message: error.message
    });
  }
};

/**
 * Create a new lab result
 */
export const createLabResult = async (req, res) => {
  try {
    const {
      patientWalletAddress,
      testType,
      testName,
      results,
      normalRange,
      unit,
      status,
      performedBy,
      testDate,
      notes
    } = req.body;

    console.log('📝 Creating lab result for patient:', patientWalletAddress);

    // Validate required fields
    if (!patientWalletAddress || !testType || !testName || !testDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'patientWalletAddress, testType, testName, and testDate are required'
      });
    }

    // Verify patient exists
    const patient = await Patient.findOne({
      where: { walletAddress: patientWalletAddress.toLowerCase() }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        message: `No patient found with wallet: ${patientWalletAddress}`
      });
    }

    // Create lab result
    const labResult = await LabResult.create({
      patientWalletAddress: patientWalletAddress.toLowerCase(),
      testType,
      testName,
      results,
      normalRange,
      unit,
      status: status || 'pending',
      performedBy,
      testDate,
      notes
    });

    console.log('✅ Lab result created:', labResult.id);

    res.status(201).json({
      success: true,
      message: 'Lab result created successfully',
      data: labResult
    });
  } catch (error) {
    console.error('❌ Create lab result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lab result',
      message: error.message
    });
  }
};

/**
 * Update a lab result
 */
export const updateLabResult = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🔄 Updating lab result:', id);

    const labResult = await LabResult.findByPk(id);

    if (!labResult) {
      return res.status(404).json({
        success: false,
        error: 'Lab result not found',
        message: `No lab result found with id: ${id}`
      });
    }

    await labResult.update(updates);

    console.log('✅ Lab result updated');

    res.json({
      success: true,
      message: 'Lab result updated successfully',
      data: labResult
    });
  } catch (error) {
    console.error('❌ Update lab result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lab result',
      message: error.message
    });
  }
};

/**
 * Delete a lab result
 */
export const deleteLabResult = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting lab result:', id);

    const labResult = await LabResult.findByPk(id);

    if (!labResult) {
      return res.status(404).json({
        success: false,
        error: 'Lab result not found'
      });
    }

    await labResult.destroy();

    console.log('✅ Lab result deleted');

    res.json({
      success: true,
      message: 'Lab result deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete lab result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lab result',
      message: error.message
    });
  }
};

/**
 * 🔬 NEW: Get patients with pending lab tests (REAL DATA)
 */
export const getPatientsWithPendingTests = async (req, res) => {
  try {
    console.log('🔍 Fetching patients with pending lab tests...');

    // Get all lab results with status 'ordered' or 'pending'
    const pendingTests = await LabResult.findAll({
      where: {
        status: ['ordered', 'pending']
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['walletAddress'],
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    console.log(`✅ Found ${pendingTests.length} pending lab tests`);

    // Group by patient
    const patientTests = {};
    pendingTests.forEach(test => {
      const patientWallet = test.patientWalletAddress;
      if (!patientTests[patientWallet]) {
        patientTests[patientWallet] = {
          patientWalletAddress: patientWallet,
          patientInfo: test.patient,
          pendingTests: []
        };
      }
      patientTests[patientWallet].pendingTests.push(test);
    });

    const result = Object.values(patientTests);

    res.json({
      success: true,
      data: result,
      count: result.length,
      totalTests: pendingTests.length
    });

  } catch (error) {
    console.error('❌ Get patients with pending tests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients with pending tests',
      message: error.message
    });
  }
};

/**
 * 🔬 NEW: Get lab orders for technician
 */
export const getLabOrders = async (req, res) => {
  try {
    const { status, technicianWallet } = req.query;

    console.log('🔍 Fetching lab orders...');

    const where = {};
    if (status) {
      where.status = status;
    }

    // Get lab results that need processing
    const labOrders = await LabResult.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['walletAddress'],
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${labOrders.length} lab orders`);

    res.json({
      success: true,
      data: labOrders,
      count: labOrders.length
    });

  } catch (error) {
    console.error('❌ Get lab orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lab orders',
      message: error.message
    });
  }
};

/**
 * 🔬 NEW: Upload lab results for patient
 */
export const uploadLabResults = async (req, res) => {
  try {
    const {
      patientWalletAddress,
      testId,
      results,
      notes,
      performedBy,
      attachments
    } = req.body;

    console.log('📤 Uploading lab results for:', patientWalletAddress);

    // Find the lab test
    const labTest = await LabResult.findOne({
      where: {
        id: testId,
        patientWalletAddress: patientWalletAddress.toLowerCase()
      }
    });

    if (!labTest) {
      return res.status(404).json({
        success: false,
        error: 'Lab test not found'
      });
    }

    // Update with results
    await labTest.update({
      results,
      notes,
      performedBy,
      status: 'completed',
      completedAt: new Date(),
      attachments
    });

    console.log('✅ Lab results uploaded successfully');

    // TODO: Send notification to patient and doctor
    // await NotificationService.createNotification(
    //   patientWalletAddress,
    //   'Lab Results Ready',
    //   `Your ${labTest.testName} results are now available`,
    //   'lab_result'
    // );

    res.json({
      success: true,
      message: 'Lab results uploaded successfully',
      data: labTest
    });

  } catch (error) {
    console.error('❌ Upload lab results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload lab results',
      message: error.message
    });
  }
};
