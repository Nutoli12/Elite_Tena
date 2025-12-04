import db from '../models/index.js';

const { User, Prescription } = db;

export const getPharmacists = async (req, res) => {
  try {
    const pharmacists = await User.findAll({
      where: { role: 'pharmacist' },
      attributes: ['walletAddress', 'email', 'isActive', 'createdAt']
    });

    res.json({
      success: true,
      pharmacists: pharmacists
    });
  } catch (error) {
    console.error('Get pharmacists error:', error);
    res.status(500).json({
      error: 'Failed to fetch pharmacists',
      message: error.message
    });
  }
};

export const createPharmacist = async (req, res) => {
  try {
    const { walletAddress, email, licenseNumber, pharmacyName } = req.body;

    // Check if user exists and is a pharmacist
    const user = await User.findOne({
      where: { 
        walletAddress: walletAddress.toLowerCase(),
        role: 'pharmacist'
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Pharmacist not found',
        message: 'No pharmacist user found with this wallet address'
      });
    }

    res.json({
      success: true,
      message: 'Pharmacist profile created (mock)',
      pharmacist: {
        walletAddress: user.walletAddress,
        email: user.email,
        licenseNumber,
        pharmacyName
      }
    });
  } catch (error) {
    console.error('Create pharmacist error:', error);
    res.status(500).json({
      error: 'Failed to create pharmacist profile',
      message: error.message
    });
  }
};

export const updatePharmacist = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    res.json({
      success: true,
      message: 'Pharmacist updated successfully',
      id,
      data: updateData
    });
  } catch (error) {
    console.error('Update pharmacist error:', error);
    res.status(500).json({
      error: 'Failed to update pharmacist',
      message: error.message
    });
  }
};

export const deletePharmacist = async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Pharmacist deleted successfully',
      id
    });
  } catch (error) {
    console.error('Delete pharmacist error:', error);
    res.status(500).json({
      error: 'Failed to delete pharmacist',
      message: error.message
    });
  }
};

export const dispensePrescription = async (req, res) => {
  try {
    const { prescriptionId, dispensedAt, notes } = req.body;

    // Find prescription
    const prescription = await Prescription.findByPk(prescriptionId);
    
    if (!prescription) {
      return res.status(404).json({
        error: 'Prescription not found',
        message: 'No prescription found with the provided ID'
      });
    }

    // Update prescription status
    await prescription.update({
      status: 'dispensed',
      dispensedBy: req.user.walletAddress,
      dispensedAt: dispensedAt || new Date(),
      pharmacyNotes: notes
    });

    res.json({
      success: true,
      message: 'Prescription dispensed successfully',
      prescription: {
        id: prescription.id,
        patientWallet: prescription.patientWallet,
        medication: prescription.medication,
        status: prescription.status,
        dispensedBy: prescription.dispensedBy,
        dispensedAt: prescription.dispensedAt
      }
    });
  } catch (error) {
    console.error('Dispense prescription error:', error);
    res.status(500).json({
      error: 'Failed to dispense prescription',
      message: error.message
    });
  }
};
