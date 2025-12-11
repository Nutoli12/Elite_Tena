/**
 * Appointment Workflow Routes
 * Complete appointment lifecycle from booking to completion
 * Integrates Smart Scheduling, Consultation, Video Calls, and Medical Records
 */

import express from 'express';
import AppointmentWorkflowManager from '../services/AppointmentWorkflowManager.js';
import { authenticateToken } from '../middleware/auth.js';
import db from '../models/index.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

/**
 * POST /api/appointment-workflow/:appointmentId/check-in
 * Patient checks in for appointment - starts the complete workflow
 */
router.post('/:appointmentId/check-in', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const checkInData = req.body;
    
    // Verify patient owns the appointment
    const appointment = await db.Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    if (appointment.patientWalletAddress !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }
    
    const result = await AppointmentWorkflowManager.startAppointmentWorkflow(
      appointmentId,
      checkInData
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/appointment-workflow/:appointmentId/start-consultation
 * Doctor starts consultation after patient consent
 */
router.post('/:appointmentId/start-consultation', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorWalletAddress = req.user.walletAddress;
    
    // Verify doctor owns the appointment
    const appointment = await db.Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    if (appointment.doctorWalletAddress !== doctorWalletAddress) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }
    
    const result = await AppointmentWorkflowManager.startConsultation(
      appointmentId,
      doctorWalletAddress
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Start consultation error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/appointment-workflow/:appointmentId/video-call
 * Initiate video call during consultation
 */
router.post('/:appointmentId/video-call', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const initiatorWallet = req.user.walletAddress;
    
    // Verify user is part of the appointment
    const appointment = await db.Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    const isAuthorized = appointment.patientWalletAddress === initiatorWallet ||
                        appointment.doctorWalletAddress === initiatorWallet;
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not part of this appointment'
      });
    }
    
    const result = await AppointmentWorkflowManager.initiateVideoCall(
      appointmentId,
      initiatorWallet
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Video call initiation error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/appointment-workflow/:appointmentId/complete
 * Complete consultation with medical records, prescriptions, follow-up
 */
router.post('/:appointmentId/complete', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const completionData = req.body;
    const doctorWalletAddress = req.user.walletAddress;
    
    // Verify doctor owns the appointment
    const appointment = await db.Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    if (appointment.doctorWalletAddress !== doctorWalletAddress) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }
    
    const result = await AppointmentWorkflowManager.completeConsultation(
      appointmentId,
      completionData
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Complete consultation error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appointment-workflow/:appointmentId/status
 * Get current workflow status and next steps
 */
router.get('/:appointmentId/status', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await db.Appointment.findByPk(appointmentId, {
      include: [
        { model: db.Patient, as: 'patient' },
        { model: db.Doctor, as: 'doctor' },
        { model: db.VideoCall, as: 'videoCall' }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    // Verify user is part of the appointment
    const isAuthorized = appointment.patientWalletAddress === req.user.walletAddress ||
                        appointment.doctorWalletAddress === req.user.walletAddress;
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not part of this appointment'
      });
    }
    
    // Get consent status
    const consentStatus = await AppointmentWorkflowManager.checkConsentStatus(
      appointment.patientWalletAddress,
      appointment.doctorWalletAddress
    );
    
    // Get queue status
    const queueStatus = await db.QueueEntry.findOne({
      where: { appointmentId },
      include: ['queue']
    });
    
    // Determine next steps based on current state
    const nextSteps = getNextSteps(appointment, consentStatus, req.user.role);
    
    res.json({
      success: true,
      appointment: {
        id: appointment.id,
        workflowState: appointment.workflowState,
        status: appointment.status,
        scheduledStartTime: appointment.scheduledStartTime,
        actualStartTime: appointment.actualStartTime,
        patient: appointment.patient,
        doctor: appointment.doctor,
        videoCall: appointment.videoCall
      },
      consentStatus,
      queueStatus,
      nextSteps
    });
    
  } catch (error) {
    console.error('Get workflow status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/appointment-workflow/:appointmentId/grant-consent
 * Patient grants consent for medical records access
 */
router.post('/:appointmentId/grant-consent', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const patientWallet = req.user.walletAddress;
    
    const appointment = await db.Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    if (appointment.patientWalletAddress !== patientWallet) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }
    
    // Grant consent
    await db.Consent.update(
      {
        status: 'granted',
        grantedAt: new Date()
      },
      {
        where: {
          appointmentId,
          patientWalletAddress: patientWallet,
          status: 'pending'
        }
      }
    );
    
    // Update appointment to ready for consultation
    await appointment.update({
      workflowState: AppointmentWorkflowManager.WORKFLOW_STATES.READY_FOR_CONSULTATION
    });
    
    // Notify doctor
    await AppointmentWorkflowManager.notifyDoctorPatientReady(appointment);
    
    res.json({
      success: true,
      message: 'Consent granted successfully',
      workflowState: AppointmentWorkflowManager.WORKFLOW_STATES.READY_FOR_CONSULTATION
    });
    
  } catch (error) {
    console.error('Grant consent error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appointment-workflow/doctor/:doctorWallet/active-consultations
 * Get doctor's active consultations and workflow states
 */
router.get('/doctor/:doctorWallet/active-consultations', async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    
    // Verify doctor access
    if (req.user.walletAddress !== doctorWallet && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const activeAppointments = await db.Appointment.findAll({
      where: {
        doctorWalletAddress: doctorWallet,
        workflowState: {
          [db.Sequelize.Op.in]: [
            AppointmentWorkflowManager.WORKFLOW_STATES.PATIENT_CHECKED_IN,
            AppointmentWorkflowManager.WORKFLOW_STATES.READY_FOR_CONSULTATION,
            AppointmentWorkflowManager.WORKFLOW_STATES.CONSULTATION_STARTED,
            AppointmentWorkflowManager.WORKFLOW_STATES.VIDEO_CALL_ACTIVE
          ]
        }
      },
      include: [
        { model: db.Patient, as: 'patient' },
        { model: db.QueueEntry, as: 'queueEntry', include: ['queue'] },
        { model: db.VideoCall, as: 'videoCall' }
      ],
      order: [['scheduledStartTime', 'ASC']]
    });
    
    res.json({
      success: true,
      activeConsultations: activeAppointments,
      count: activeAppointments.length
    });
    
  } catch (error) {
    console.error('Get active consultations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to determine next steps based on workflow state
 */
function getNextSteps(appointment, consentStatus, userRole) {
  const steps = [];
  
  switch (appointment.workflowState) {
    case AppointmentWorkflowManager.WORKFLOW_STATES.SCHEDULED:
      if (userRole === 'patient') {
        steps.push({
          action: 'check_in',
          title: 'Check In',
          description: 'Check in for your appointment'
        });
      }
      break;
      
    case AppointmentWorkflowManager.WORKFLOW_STATES.PATIENT_CHECKED_IN:
      if (!consentStatus.hasConsent && userRole === 'patient') {
        steps.push({
          action: 'grant_consent',
          title: 'Grant Access',
          description: 'Grant doctor access to your medical records'
        });
      }
      break;
      
    case AppointmentWorkflowManager.WORKFLOW_STATES.READY_FOR_CONSULTATION:
      if (userRole === 'doctor') {
        steps.push({
          action: 'start_consultation',
          title: 'Start Consultation',
          description: 'Begin the consultation with patient'
        });
      }
      break;
      
    case AppointmentWorkflowManager.WORKFLOW_STATES.CONSULTATION_STARTED:
      steps.push({
        action: 'video_call',
        title: 'Start Video Call',
        description: 'Initiate video consultation'
      });
      break;
      
    case AppointmentWorkflowManager.WORKFLOW_STATES.VIDEO_CALL_ACTIVE:
      if (userRole === 'doctor') {
        steps.push({
          action: 'complete_consultation',
          title: 'Complete Consultation',
          description: 'End consultation and create records'
        });
      }
      break;
  }
  
  return steps;
}

export default router;