import db from '../models/index.js';
const { Prescription, Patient, Doctor } = db;

/**
 * Get all prescriptions (with optional filtering)
 */
export const getPrescriptions = async (req, res) => {
  try {
    // Support wallet from either URL path or query parameter
    const patientWalletFromPath = req.params.patientWallet;
    const { patientWallet, doctorWallet } = req.query;

    const finalPatientWallet = patientWalletFromPath || patientWallet;

    console.log('🔍 Fetching prescriptions...');

    const where = {};
    if (finalPatientWallet) {
      where.patientWalletAddress = finalPatientWallet.toLowerCase();
    }
    if (doctorWallet) {
      where.doctorWalletAddress = doctorWallet.toLowerCase();
    }

    const prescriptions = await Prescription.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['walletAddress']
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['walletAddress', 'specialization']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${prescriptions.length} prescriptions`);

    res.json({
      success: true,
      data: prescriptions,
      count: prescriptions.length
    });
  } catch (error) {
    console.error('❌ Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prescriptions',
      message: error.message
    });
  }
};

/**
 * Get prescription by ID
 */
export const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching prescription:', id);

    const prescription = await Prescription.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['walletAddress']
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['walletAddress', 'specialization']
        }
      ]
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found',
        message: `No prescription found with id: ${id}`
      });
    }

    console.log('✅ Prescription found');

    res.json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('❌ Get prescription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prescription',
      message: error.message
    });
  }
};

/**
 * Create a new prescription
 */
export const createPrescription = async (req, res) => {
  try {
    const {
      patientWalletAddress,
      doctorWalletAddress,
      medicationName,
      dosage,
      frequency,
      duration,
      instructions,
      quantity,
      refills,
      issueDate,
      expiryDate
    } = req.body;

    console.log('📝 Creating prescription for patient:', patientWalletAddress);

    // Validate required fields
    if (!patientWalletAddress || !doctorWalletAddress || !medicationName || !dosage || !frequency || !duration || !quantity || !issueDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'patientWalletAddress, doctorWalletAddress, medicationName, dosage, frequency, duration, quantity, issueDate, and expiryDate are required'
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

    // Verify doctor exists
    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWalletAddress.toLowerCase() }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found',
        message: `No doctor found with wallet: ${doctorWalletAddress}`
      });
    }

    // Create prescription
    const prescription = await Prescription.create({
      patientWalletAddress: patientWalletAddress.toLowerCase(),
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      medicationName,
      dosage,
      frequency,
      duration,
      instructions,
      quantity,
      refills: refills || 0,
      issueDate,
      expiryDate,
      isFilled: false
    });

    console.log('✅ Prescription created:', prescription.id);

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: prescription
    });
  } catch (error) {
    console.error('❌ Create prescription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prescription',
      message: error.message
    });
  }
};

/**
 * Update a prescription
 */
export const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🔄 Updating prescription:', id);

    const prescription = await Prescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found',
        message: `No prescription found with id: ${id}`
      });
    }

    await prescription.update(updates);

    console.log('✅ Prescription updated');

    res.json({
      success: true,
      message: 'Prescription updated successfully',
      data: prescription
    });
  } catch (error) {
    console.error('❌ Update prescription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prescription',
      message: error.message
    });
  }
};

/**
 * Delete a prescription
 */
export const deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting prescription:', id);

    const prescription = await Prescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    await prescription.destroy();

    console.log('✅ Prescription deleted');

    res.json({
      success: true,
      message: 'Prescription deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete prescription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prescription',
      message: error.message
    });
  }
};

/**
 * 💊 NEW: Get pending prescriptions for pharmacy (REAL DATA)
 */
export const getPendingPrescriptions = async (req, res) => {
  try {
    console.log('🔍 Fetching pending prescriptions for pharmacy...');

    const pendingPrescriptions = await Prescription.findAll({
      where: {
        status: ['active', 'pending']
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
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['walletAddress', 'specialization'],
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

    console.log(`✅ Found ${pendingPrescriptions.length} pending prescriptions`);

    res.json({
      success: true,
      data: pendingPrescriptions,
      count: pendingPrescriptions.length
    });

  } catch (error) {
    console.error('❌ Get pending prescriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending prescriptions',
      message: error.message
    });
  }
};

/**
 * 💊 NEW: Dispense prescription
 */
export const dispensePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      pharmacistWallet, 
      dispensedQuantity, 
      dispensedDate, 
      notes,
      batchNumber,
      expiryDate 
    } = req.body;

    console.log('💊 Dispensing prescription:', id);

    const prescription = await Prescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    if (prescription.status === 'dispensed') {
      return res.status(400).json({
        success: false,
        error: 'Prescription already dispensed'
      });
    }

    // Update prescription status
    await prescription.update({
      status: 'dispensed',
      dispensedBy: pharmacistWallet,
      dispensedQuantity: dispensedQuantity || prescription.quantity,
      dispensedDate: dispensedDate || new Date(),
      dispensingNotes: notes,
      batchNumber,
      medicationExpiryDate: expiryDate
    });

    console.log('✅ Prescription dispensed successfully');

    // TODO: Send notification to patient
    // await NotificationService.createNotification(
    //   prescription.patientWalletAddress,
    //   'Prescription Ready',
    //   `Your prescription for ${prescription.medicationName} has been dispensed`,
    //   'prescription'
    // );

    res.json({
      success: true,
      message: 'Prescription dispensed successfully',
      data: prescription
    });

  } catch (error) {
    console.error('❌ Dispense prescription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dispense prescription',
      message: error.message
    });
  }
};

/**
 * 💊 NEW: Get prescription history for pharmacy
 */
export const getPharmacyHistory = async (req, res) => {
  try {
    const { pharmacistWallet, status, startDate, endDate } = req.query;

    console.log('🔍 Fetching pharmacy history...');

    const where = {};
    if (pharmacistWallet) {
      where.dispensedBy = pharmacistWallet.toLowerCase();
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where.dispensedDate = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const prescriptions = await Prescription.findAll({
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
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['walletAddress', 'specialization']
        }
      ],
      order: [['dispensedDate', 'DESC']]
    });

    console.log(`✅ Found ${prescriptions.length} pharmacy records`);

    res.json({
      success: true,
      data: prescriptions,
      count: prescriptions.length
    });

  } catch (error) {
    console.error('❌ Get pharmacy history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pharmacy history',
      message: error.message
    });
  }
};

/**
 * 💊 NEW: Verify prescription before dispensing
 */
export const verifyPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Verifying prescription:', id);

    const prescription = await Prescription.findByPk(id, {
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
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['walletAddress', 'specialization'],
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        }
      ]
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Check if prescription is valid
    const now = new Date();
    const expiryDate = new Date(prescription.expiryDate);
    const isExpired = now > expiryDate;
    const isAlreadyDispensed = prescription.status === 'dispensed';

    const verification = {
      isValid: !isExpired && !isAlreadyDispensed,
      isExpired,
      isAlreadyDispensed,
      daysUntilExpiry: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
      warnings: []
    };

    if (isExpired) {
      verification.warnings.push('Prescription has expired');
    }
    if (isAlreadyDispensed) {
      verification.warnings.push('Prescription already dispensed');
    }

    res.json({
      success: true,
      data: {
        prescription,
        verification
      }
    });

  } catch (error) {
    console.error('❌ Verify prescription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify prescription',
      message: error.message
    });
  }
};
