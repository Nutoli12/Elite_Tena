import db from '../models/index.js';
const { Appointment, Consent, Sequelize } = db;

/**
 * Middleware to check consent before allowing consultation actions
 * This middleware enforces the consent-first consultation flow
 */
export const requireConsentForConsultation = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const userWallet = req.user?.walletAddress || req.body.userWallet;
    const userRole = req.user?.role || req.body.userRole;

    console.log('🔒 Checking consent for consultation access...', {
      appointmentId,
      userWallet,
      userRole,
      path: req.path,
      method: req.method
    });

    // Get appointment with consent information
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [{
        model: Consent,
        as: 'consent',
        where: { 
          status: 'active',
          expiresAt: {
            [Sequelize.Op.gt]: new Date()
          }
        },
        required: false
      }]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: 'No appointment found with the provided ID'
      });
    }

    // Check if consultation requires consent
    if (appointment.requiresConsent && appointment.workflowState !== 'consent_granted') {
      return res.status(403).json({
        error: 'Consent required',
        message: 'Patient consent is required before starting consultation',
        workflowState: appointment.workflowState,
        action: userRole === 'doctor' ? 'request_consent' : 'grant_consent',
        appointmentId: appointment.id
      });
    }

    // Check specific permissions based on endpoint
    const requiredPermission = getRequiredPermission(req.path, req.method);
    if (requiredPermission && appointment.consent) {
      const hasPermission = appointment.consent.permissions[requiredPermission];
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Consent does not grant ${requiredPermission} permission`,
          requiredPermission,
          grantedPermissions: appointment.consent.permissions
        });
      }
    }

    // Attach appointment to request for use in controllers
    req.appointment = appointment;
    req.consent = appointment.consent;

    console.log('✅ Consent check passed');
    next();
  } catch (error) {
    console.error('❌ Consent check failed:', error);
    res.status(500).json({ 
      error: 'Consent check failed', 
      message: error.message 
    });
  }
};

/**
 * Helper function to determine required permission based on endpoint
 */
function getRequiredPermission(path, method) {
  // Video call permissions
  if (path.includes('/video-call') || path.includes('/video')) {
    return 'canVideoCall';
  }
  
  // Chat permissions
  if (path.includes('/chat') || path.includes('/message')) {
    return 'canChat';
  }
  
  // Prescription permissions
  if (path.includes('/prescriptions') && method === 'POST') {
    return 'canWritePrescriptions';
  }
  
  // Lab test ordering permissions
  if (path.includes('/lab-results') && method === 'POST') {
    return 'canOrderTests';
  }
  
  // Medical records viewing permissions
  if (path.includes('/medical-records') && method === 'GET') {
    return 'canViewHistory';
  }
  
  // Consultation notes permissions
  if (path.includes('/consultation') && method === 'POST') {
    return 'canViewHistory'; // Basic consultation requires history access
  }
  
  return null; // No specific permission required
}

/**
 * Middleware specifically for video call access
 */
export const requireVideoCallConsent = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [{
        model: Consent,
        as: 'consent',
        where: { 
          status: 'active',
          expiresAt: {
            [Sequelize.Op.gt]: new Date()
          }
        },
        required: false
      }]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    // Check workflow state
    if (appointment.workflowState !== 'consent_granted') {
      return res.status(403).json({
        error: 'Consent required for video consultation',
        message: 'Patient must grant consent before video call can begin',
        workflowState: appointment.workflowState
      });
    }

    // Check video call permission
    if (!appointment.consent?.permissions?.canVideoCall) {
      return res.status(403).json({
        error: 'Video call permission not granted',
        message: 'Patient has not granted permission for video calls'
      });
    }

    req.appointment = appointment;
    next();
  } catch (error) {
    console.error('❌ Video call consent check failed:', error);
    res.status(500).json({ 
      error: 'Video call consent check failed', 
      message: error.message 
    });
  }
};

/**
 * Middleware specifically for chat access
 */
export const requireChatConsent = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [{
        model: Consent,
        as: 'consent',
        where: { 
          status: 'active',
          expiresAt: {
            [Sequelize.Op.gt]: new Date()
          }
        },
        required: false
      }]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    // Check workflow state
    if (appointment.workflowState !== 'consent_granted') {
      return res.status(403).json({
        error: 'Consent required for chat consultation',
        message: 'Patient must grant consent before chat can begin',
        workflowState: appointment.workflowState
      });
    }

    // Check chat permission
    if (!appointment.consent?.permissions?.canChat) {
      return res.status(403).json({
        error: 'Chat permission not granted',
        message: 'Patient has not granted permission for chat consultations'
      });
    }

    req.appointment = appointment;
    next();
  } catch (error) {
    console.error('❌ Chat consent check failed:', error);
    res.status(500).json({ 
      error: 'Chat consent check failed', 
      message: error.message 
    });
  }
};

export default requireConsentForConsultation;