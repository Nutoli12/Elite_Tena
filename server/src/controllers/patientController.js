import db from "../models/index.js";
const { Patient, User } = db;

export const getPatients = async (req, res) => {
  try {
    console.log('🔍 Fetching all patients...');
    
    const patients = await Patient.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['walletAddress', 'email', 'role', 'profileData', 'isActive']
      }]
    });

    console.log(`✅ Found ${patients.length} patients`);
    
    res.json({
      success: true,
      data: patients,
      count: patients.length
    });
  } catch (error) {
    console.error('❌ Get patients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients',
      message: error.message
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    const normalizedWallet = id.toLowerCase().trim();
    
    console.log('🔍 Searching for patient:', normalizedWallet);
    
    // Case-insensitive search using Sequelize
    const patient = await Patient.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('Patient.walletAddress')),
        normalizedWallet
      ),
      include: [{
        model: User,
        as: 'user',
        attributes: ['walletAddress', 'email', 'role', 'profileData', 'isActive']
      }]
    });

    if (!patient) {
      console.log('❌ No patient found with wallet:', normalizedWallet);
      
      // Check if user exists but patient record is missing
      const user = await User.findOne({
        where: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('walletAddress')),
          normalizedWallet
        )
      });
      
      if (user && user.role === 'patient') {
        return res.status(404).json({
          success: false,
          error: 'Patient profile incomplete',
          message: 'User exists but patient profile is missing. Please contact support.',
          debug: {
            userExists: true,
            patientProfileExists: false,
            walletAddress: user.walletAddress
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        message: `No patient found with wallet: ${normalizedWallet}`
      });
    }

    console.log('✅ Patient found:', patient.walletAddress);
    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('❌ Get patient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient',
      message: error.message
    });
  }
};

// Remove all mock functions - keep only real database operations