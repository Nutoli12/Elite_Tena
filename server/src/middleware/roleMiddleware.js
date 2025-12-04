import db from '../models/index.js';

/**
 * Role-based access control middleware
 */

// Check if user is a patient
export const patientMiddleware = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.walletAddress, {
      include: [{
        model: db.Patient,
        as: 'patientProfile'
      }]
    });

    if (!user || user.role !== 'patient' || !user.patientProfile) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Patient role required.'
      });
    }

    req.patient = user.patientProfile;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying patient role',
      error: error.message
    });
  }
};

// Check if user is a doctor
export const doctorMiddleware = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.walletAddress, {
      include: [{
        model: db.Doctor,
        as: 'doctorProfile'
      }]
    });

    if (!user || user.role !== 'doctor' || !user.doctorProfile) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Check if doctor is approved
    if (!user.doctorProfile.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor account pending approval.'
      });
    }

    req.doctor = user.doctorProfile;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying doctor role',
      error: error.message
    });
  }
};

// Check if user is an admin
export const adminMiddleware = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.walletAddress);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying admin role',
      error: error.message
    });
  }
};

// Check if user owns the resource or is admin
export const ownerOrAdminMiddleware = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.walletAddress);
    const resourceWallet = req.params.walletAddress;

    if (user.role === 'admin' || user.walletAddress === resourceWallet) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Resource ownership or admin role required.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying resource ownership',
      error: error.message
    });
  }
};
