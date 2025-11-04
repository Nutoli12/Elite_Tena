import { Session } from '../models/Session.js';
import { Web3Service } from '../utils/web3.js';

// Middleware to require authentication
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }

    const session = await Session.validate(token);

    if (!session) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please login again'
      });
    }

    // Attach user data to request
    req.user = {
      walletAddress: session.wallet_address,
      role: session.role,
      specialization: session.specialization
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

// Middleware to require specific role
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to require doctor approval
export const requireDoctorApproval = async (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return next();
  }

  try {
    const isApproved = await Web3Service.isDoctorApproved(req.user.walletAddress);
    
    if (!isApproved) {
      return res.status(403).json({
        error: 'Doctor not approved',
        message: 'Your account is pending administrator approval'
      });
    }

    next();
  } catch (error) {
    console.error('Doctor approval check failed:', error);
    res.status(500).json({
      error: 'Approval check failed',
      message: 'Unable to verify doctor status'
    });
  }
};

// Optional auth middleware (attaches user if available)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const session = await Session.validate(token);
      if (session) {
        req.user = {
          walletAddress: session.wallet_address,
          role: session.role,
          specialization: session.specialization
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
