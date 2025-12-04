import db from "../models/index.js";
const { Doctor } = db;

// Mock doctor controller with test data
export const getDoctors = async (req, res) => {
  console.log('Get doctors called');
  res.json({
    success: true,
    doctors: [
      {
        id: 1,
        walletAddress: '0xTestDoctor123',
        name: 'Test Doctor 1',
        email: 'doctor1@test.com',
        createdAt: new Date().toISOString()
      },
      {
        id: 2, 
        walletAddress: '0xTestDoctor456',
        name: 'Test Doctor 2',
        email: 'doctor2@test.com',
        createdAt: new Date().toISOString()
      }
    ]
  });
};

export const createDoctor = async (req, res) => {
  console.log('Create doctor called with:', req.body);
  res.status(201).json({
    success: true,
    message: 'Doctor created successfully',
    doctor: {
      id: Math.floor(Math.random() * 1000),
      ...req.body,
      createdAt: new Date().toISOString()
    }
  });
};

export const updateDoctor = async (req, res) => {
  console.log('Update doctor called with:', req.params, req.body);
  res.json({
    success: true,
    message: 'Doctor updated successfully',
    id: req.params.id,
    data: req.body
  });
};

export const deleteDoctor = async (req, res) => {
  console.log('Delete doctor called with:', req.params);
  res.json({
    success: true,
    message: 'Doctor deleted successfully',
    id: req.params.id
  });
};

// Get individual doctor by ID or wallet address
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    let doctor;
    
    // Clean the wallet address - remove newlines and trim
    const cleanId = id.trim().replace(/\n/g, '');
    
    // Check if it's a wallet address (starts with 0x)
    if (cleanId.startsWith('0x')) {
      // Use case-insensitive search for wallet addresses
      doctor = await Doctor.findOne({ 
        where: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('walletAddress')),
          db.sequelize.fn('LOWER', cleanId)
        )
      });
    } else {
      doctor = await Doctor.findByPk(cleanId);
    }
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Doctor not found',
        message: `No doctor found with ID/wallet: ${cleanId}`
      });
    }
    
    res.json({
      success: true,
      data: doctor
    });
    
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
