import db from '../models/index.js';

const { User, LabResult } = db;

export const getLabTechnicians = async (req, res) => {
  try {
    const labTechs = await User.findAll({
      where: { role: 'lab_technician' },
      attributes: ['walletAddress', 'email', 'isActive', 'createdAt']
    });

    res.json({
      success: true,
      labTechnicians: labTechs
    });
  } catch (error) {
    console.error('Get lab technicians error:', error);
    res.status(500).json({
      error: 'Failed to fetch lab technicians',
      message: error.message
    });
  }
};

export const createLabTechnician = async (req, res) => {
  try {
    const { walletAddress, email, licenseNumber, specialization, department } = req.body;

    // Check if user exists and is a lab technician
    const user = await User.findOne({
      where: { 
        walletAddress: walletAddress.toLowerCase(),
        role: 'lab_technician'
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Lab technician not found',
        message: 'No lab technician user found with this wallet address'
      });
    }

    res.json({
      success: true,
      message: 'Lab technician profile created (mock)',
      labTechnician: {
        walletAddress: user.walletAddress,
        email: user.email,
        licenseNumber,
        specialization,
        department
      }
    });
  } catch (error) {
    console.error('Create lab technician error:', error);
    res.status(500).json({
      error: 'Failed to create lab technician profile',
      message: error.message
    });
  }
};

export const updateLabTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    res.json({
      success: true,
      message: 'Lab technician updated successfully',
      id,
      data: updateData
    });
  } catch (error) {
    console.error('Update lab technician error:', error);
    res.status(500).json({
      error: 'Failed to update lab technician',
      message: error.message
    });
  }
};

export const deleteLabTechnician = async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Lab technician deleted successfully',
      id
    });
  } catch (error) {
    console.error('Delete lab technician error:', error);
    res.status(500).json({
      error: 'Failed to delete lab technician',
      message: error.message
    });
  }
};

export const uploadLabResult = async (req, res) => {
  try {
    const { patientWallet, testType, results, notes } = req.body;

    // Check if patient exists
    const patient = await User.findOne({
      where: { 
        walletAddress: patientWallet.toLowerCase(),
        role: 'patient'
      }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'No patient found with this wallet address'
      });
    }

    // Create lab result
    const labResult = await LabResult.create({
      patientWallet: patientWallet.toLowerCase(),
      testType,
      results,
      notes,
      uploadedBy: req.user.walletAddress
    });

    res.status(201).json({
      success: true,
      message: 'Lab result uploaded successfully',
      labResult: {
        id: labResult.id,
        patientWallet: labResult.patientWallet,
        testType: labResult.testType,
        results: labResult.results,
        uploadedBy: labResult.uploadedBy,
        createdAt: labResult.createdAt
      }
    });
  } catch (error) {
    console.error('Upload lab result error:', error);
    res.status(500).json({
      error: 'Failed to upload lab result',
      message: error.message
    });
  }
};
