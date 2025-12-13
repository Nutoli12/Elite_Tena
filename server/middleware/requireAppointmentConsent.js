import db from '../src/models/index.js';
const { Appointment, AppointmentConsent } = db;

/**
 * Enhanced middleware to check appointment-specific consent before allowing consultation actions
 * This builds on top of the existing consent system with appointment-specific workflow
 */
export const requireAppointmentConsent = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const userWallet = req.user?.walletAddress || req.body.userWallet;
    const userRole = req.user?.role || req.body.userRole;

    console.log('🔒 Checking appointment-specific consent...', {
      appointmentId,
      userWallet,
      userRole,
      path: req.path,
      method: req.method
    });

    if (!appointmentId) {
      return res.status(400).json({
        error: 'Appointment ID required',
        message: 'appointmentId parameter is required for consent check'
      });
    }

    // Get appointment with consent information
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: AppointmentConsent,
          as: 'appointmentConsent',
          required: false
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: 'No appointment found with the provided ID'
      });
    }

    // Check if consultation requires consent
    if (!appointment.requiresConsent) {
      console.log('✅ Appointment does not require consent - allowing access');
      req.appointment = appointment;
      return next();
    }

    // Check appointment workflow state
    if (appointment.workflowState === 'scheduled' || appointment.workflowState === 'awaiting_consent') {
      return res.status(403).json({
        error: 'CONSENT_REQUIRED',
        message: 'Patient consent is required before starting consultation',
        workflowState: appointment.workflowState,
        consentStatus: appointment.consentStatus,
        action: userRole === 'doctor' ? 'request_consent' : 'grant_consent',
        appointmentId: appointment.id,
        nextStep: getNextStepMessage(appointment.workflowState, userRole)
      });
    }

    // Check if consent is granted and active
    if (appointment.workflowState !== 'consent_granted') {
      return res.status(403).json({
        error: 'CONSENT_NOT_GRANTED',
        message: 'Patient consent has not been granted for this appointment',
        workflowState: appointment.workflowState,
        consentStatus: appointment.consentStatus,
        appointmentId: appointment.id
      });
    }

    // Verify appointment consent exists and is active
    const appointmentConsent = appointment.appointmentConsent;
    if (!appointmentConsent) {
      return res.status(403).json({
        error: 'CONSENT_RECORD_MISSING',
        message: 'No consent record found for this appointment',
        appointmentId: appointment.id
      });
    }

    if (!appointmentConsent.isActive()) {
      const reason = appointmentConsent.status === 'denied' ? 'Consent was denied by patient' :
                    appointmentConsent.status === 'revoked' ? 'Consent was revoked by patient' :
                    appointmentConsent.isExpired() ? 'Consent has expired' : 'Consent is not active';

      return res.status(403).json({
        error: 'CONSENT_NOT_ACTIVE',
        message: reason,
        consentStatus: appointmentConsent.status,
        expiresAt: appointmentConsent.expiresAt,
        appointmentId: appointment.id
      });
    }

    // Check specific permissions based on endpoint
    const requiredPermission = getRequiredPermission(req.path, req.method);
    if (requiredPermission && !appointmentConsent.canPerformAction(requiredPermission)) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Consent does not grant '${requiredPermission}' permission`,
        requiredPermission,
        grantedPermissions: appointmentConsent.permissions,
        appointmentId: appointment.id
      });
    }

    // Attach appointment and consent to request for use in controllers
    req.appointment = appointment;
    req.appointmentConsent = appointmentConsent;

    console.log('✅ Appointment consent check passed');
    next();
  } catch (error) {
    console.error('❌ Appointment consent check failed:', error);
    res.status(500).json({ 
      error: 'Consent check failed', 
      message: error.message 
    });
  }
};

/**
 * Middleware specifically for video call access with appointment consent
 */
export const requireAppointmentVideoCallConsent = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    
    const appointmentConsent = await AppointmentConsent.findByAppointment(appointmentId);

    if (!appointmentConsent) {
      return res.status(404).json({
        error: 'Appointment consent not found'
      });
    }

    if (!appointmentConsent.isActive()) {
      return res.status(403).json({
        error: 'Consent required for video consultation',
        message: 'Patient must grant consent before video call can begin',
        consentStatus: appointmentConsent.status
      });
    }

    // Check video call permission
    if (!appointmentConsent.canPerformAction('allow_video_call')) {
      return res.status(403).json({
        error: 'Video call permission not granted',
        message: 'Patient has not granted permission for video calls in this appointment'
      });
    }

    req.appointmentConsent = appointmentConsent;
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
 * Middleware specifically for chat access with appointment consent
 */
export const requireAppointmentChatConsent = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    
    const appointmentConsent = await AppointmentConsent.findByAppointment(appointmentId);

    if (!appointmentConsent) {
      return res.status(404).json({
        error: 'Appointment consent not found'
      });
    }

    if (!appointmentConsent.isActive()) {
      return res.status(403).json({
        error: 'Consent required for chat consultation',
        message: 'Patient must grant consent before chat can begin',
        consentStatus: appointmentConsent.status
      });
    }

    // Check chat permission
    if (!appointmentConsent.canPerformAction('allow_chat')) {
      return res.status(403).json({
        error: 'Chat permission not granted',
        message: 'Patient has not granted permission for chat consultations in this appointment'
      });
    }

    req.appointmentConsent = appointmentConsent;
    next();
  } catch (error) {
    console.error('❌ Chat consent check failed:', error);
    res.status(500).json({ 
      error: 'Chat consent check failed', 
      message: error.message 
    });
  }
};

/**
 * Middleware for prescription writing with appointment consent
 */
export const requireAppointmentPrescriptionConsent = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    
    const appointmentConsent = await AppointmentConsent.findByAppointment(appointmentId);

    if (!appointmentConsent || !appointmentConsent.isActive()) {
      return res.status(403).json({
        error: 'Active consent required for prescription writing',
        message: 'Patient consent is required before writing prescriptions'
      });
    }

    if (!appointmentConsent.canPerformAction('allow_prescription_write')) {
      return res.status(403).json({
        error: 'Prescription writing permission not granted',
        message: 'Patient has not granted permission for prescription writing in this appointment'
      });
    }

    req.appointmentConsent = appointmentConsent;
    next();
  } catch (error) {
    console.error('❌ Prescription consent check failed:', error);
    res.status(500).json({ 
      error: 'Prescription consent check failed', 
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
    return 'allow_video_call';
  }
  
  // Chat permissions
  if (path.includes('/chat') || path.includes('/message')) {
    return 'allow_chat';
  }
  
  // Prescription permissions
  if (path.includes('/prescriptions') && method === 'POST') {
    return 'allow_prescription_write';
  }
  
  // Lab test ordering permissions
  if (path.includes('/lab-results') && method === 'POST') {
    return 'allow_lab_test_order';
  }
  
  // Medical records viewing permissions
  if (path.includes('/medical-records') && method === 'GET') {
    return 'allow_medical_history_view';
  }
  
  // Consultation/diagnosis permissions
  if (path.includes('/consultation') || path.includes('/diagnosis')) {
    return 'allow_diagnosis_recording';
  }
  
  // General consultation permission for other endpoints
  return 'allow_consultation';
}

/**
 * Helper function to provide next step message based on workflow state
 */
function getNextStepMessage(workflowState, userRole) {
  if (workflowState === 'scheduled' && userRole === 'doctor') {
    return 'Request consent from patient to begin consultation';
  }
  if (workflowState === 'awaiting_consent' && userRole === 'patient') {
    return 'Review and grant consent to allow doctor to start consultation';
  }
  if (workflowState === 'awaiting_consent' && userRole === 'doctor') {
    return 'Waiting for patient to grant consent';
  }
  return 'Complete the consent process to proceed';
}

export default requireAppointmentConsent;