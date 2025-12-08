import db from '../models/index.js';
const { MedicalRecord, Patient, Doctor } = db;

/**
 * Get all medical records (admin only - no patient filter)
 */
export const getAllMedicalRecords = async (req, res) => {
  try {
    // Get requesting user from header
    const requestingWallet = req.headers['x-wallet-address'];

    console.log('🔍 Fetching all medical records...');
    console.log('🔍 Requested by:', requestingWallet);

    // Check if requesting user is authenticated
    if (!requestingWallet) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be authenticated to view all medical records'
      });
    }

    // Check if requesting user is an admin
    const { User } = db;
    const requestingUser = await User.findOne({
      where: { walletAddress: requestingWallet.toLowerCase() }
    });

    if (!requestingUser) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'Invalid authentication credentials'
      });
    }

    if (requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Only administrators can view all medical records'
      });
    }

    console.log('✅ Admin access granted');

    const records = await MedicalRecord.findAll({
      include: [
        {
          model: Patient,
          as: 'patient',
          required: false,
          attributes: ['walletAddress']
        },
        {
          model: Doctor,
          as: 'doctor',
          required: false,
          attributes: ['walletAddress', 'specialization']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100 // Limit for performance
    });

    console.log(`✅ Found ${records.length} medical records`);

    res.json({
      success: true,
      data: records,
      count: records.length,
      message: 'Admin view: All medical records'
    });
  } catch (error) {
    console.error('❌ Get all medical records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical records',
      message: error.message
    });
  }
};

/**
 * Get medical records for a patient
 */
export const getMedicalRecords = async (req, res) => {
  try {
    const { patientWallet } = req.params;
    const normalizedWallet = patientWallet.toLowerCase().trim();

    // Get requesting user from header (in production, this would come from JWT token)
    const requestingWallet = req.headers['x-wallet-address'];

    console.log('🔍 Fetching medical records for:', normalizedWallet);
    console.log('🔍 Requested by:', requestingWallet);

    // Check if requesting user has permission
    let userRole = null;
    let recordTypeFilter = null;

    if (requestingWallet) {
      const normalizedRequestingWallet = requestingWallet.toLowerCase().trim();

      // Get requesting user's role
      const { User, Consent } = db;
      const requestingUser = await User.findOne({
        where: { walletAddress: normalizedRequestingWallet }
      });

      if (requestingUser) {
        userRole = requestingUser.role;
        console.log('🔍 Requesting user role:', userRole);
      }

      // Allow if requesting their own records
      if (normalizedRequestingWallet === normalizedWallet) {
        console.log('✅ User accessing their own records');
        // Allow access - continue to fetch records
      } else if (userRole === 'admin') {
        // Admins can access any records
        console.log('👑 Admin access granted');
      } else if (userRole === 'pharmacist') {
        // Pharmacists can only see prescription-related records
        console.log('💊 Pharmacist access - filtering to prescription records only');
        recordTypeFilter = 'prescription';
      } else if (userRole === 'doctor') {
        // Check if doctor has consent
        const consent = await Consent.findOne({
          where: {
            patientWalletAddress: normalizedWallet,
            doctorWalletAddress: normalizedRequestingWallet,
            status: 'active'
          }
        });

        if (!consent) {
          console.log('❌ No active consent found for doctor to access patient records');
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            message: 'You do not have consent to access these medical records. Please request access from the patient.'
          });
        }

        // Check if consent is expired
        if (consent.isExpired && consent.isExpired()) {
          console.log('❌ Consent has expired');
          return res.status(403).json({
            success: false,
            error: 'Consent expired',
            message: 'Your access consent has expired. Please request new access from the patient.'
          });
        }

        console.log('✅ Doctor has active consent to access records');
      } else {
        // Other roles trying to access someone else's records
        console.log('❌ Unauthorized access attempt by role:', userRole);
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'You do not have permission to access these medical records'
        });
      }
    } else {
      // No authentication provided - deny access
      return res.status(403).json({
        success: false,
        error: 'Consent required',
        message: 'Authentication required to access medical records'
      });
    }

    // Build query with role-based filtering
    const whereClause = {
      [db.Sequelize.Op.and]: [
        db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('patientWalletAddress')),
          normalizedWallet
        )
      ]
    };

    // Apply record type filter for pharmacists
    if (recordTypeFilter) {
      whereClause[db.Sequelize.Op.and].push({ recordType: recordTypeFilter });
    }

    const records = await MedicalRecord.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          required: false,
          attributes: ['walletAddress']
        },
        {
          model: Doctor,
          as: 'doctor',
          required: false,
          attributes: ['walletAddress', 'specialization']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${records.length} medical records`);

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('❌ Get medical records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical records',
      message: error.message
    });
  }
};

/**
 * Create a new medical record
 */
export const createMedicalRecord = async (req, res) => {
  try {
    // Support wallet from either URL path or request body
    const patientWalletFromPath = req.params.patientWallet;
    const {
      patientWalletAddress,
      doctorWalletAddress,
      recordType,
      title,
      description,
      diagnosis,
      symptoms,
      visitDate,
      ipfsHash,
      fileUrl,
      isEncrypted
    } = req.body;

    // Use wallet from path if provided, otherwise from body
    const finalPatientWallet = patientWalletFromPath || patientWalletAddress;

    console.log('📝 Creating medical record for patient:', finalPatientWallet);

    // Validate required fields
    if (!finalPatientWallet || !doctorWalletAddress || !recordType || !title || !visitDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'patientWalletAddress, doctorWalletAddress, recordType, title, and visitDate are required'
      });
    }

    // Verify patient exists
    const patient = await Patient.findOne({
      where: { walletAddress: finalPatientWallet.toLowerCase() }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        message: `No patient found with wallet: ${finalPatientWallet}`
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

    // Create medical record
    const record = await MedicalRecord.create({
      patientWalletAddress: finalPatientWallet.toLowerCase(),
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      recordType,
      title,
      description,
      diagnosis,
      symptoms: symptoms || [],
      visitDate,
      ipfsHash,
      fileUrl,
      isEncrypted: isEncrypted !== undefined ? isEncrypted : true
    });

    console.log('✅ Medical record created:', record.id);

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: record
    });
  } catch (error) {
    console.error('❌ Create medical record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create medical record',
      message: error.message
    });
  }
};

/**
 * Update a medical record
 */
export const updateMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🔄 Updating medical record:', id);

    const record = await MedicalRecord.findByPk(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found',
        message: `No medical record found with id: ${id}`
      });
    }

    await record.update(updates);

    console.log('✅ Medical record updated');

    res.json({
      success: true,
      message: 'Medical record updated successfully',
      data: record
    });
  } catch (error) {
    console.error('❌ Update medical record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update medical record',
      message: error.message
    });
  }
};

/**
 * Delete a medical record
 */
export const deleteMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting medical record:', id);

    const record = await MedicalRecord.findByPk(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }

    await record.destroy();

    console.log('✅ Medical record deleted');

    res.json({
      success: true,
      message: 'Medical record deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete medical record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete medical record',
      message: error.message
    });
  }
};
