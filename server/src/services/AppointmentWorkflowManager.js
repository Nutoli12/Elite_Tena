/**
 * AppointmentWorkflowManager - Complete Appointment Lifecycle Integration
 * Integrates Smart Scheduling with Consultation, Video Calls, and Medical Records
 * Handles the complete patient journey from booking to completion
 */

import db from '../models/index.js';
import DynamicDurationManager from './DynamicDurationManager.js';
import QueueService from './QueueService.js';
import EnhancedNotificationService from './enhancedNotificationService.js';
import { getIO } from './socketService.js';
import { v4 as uuidv4 } from 'uuid';

class AppointmentWorkflowManager {
  /**
   * Complete appointment workflow states
   */
  static WORKFLOW_STATES = {
    SCHEDULED: 'scheduled',
    PATIENT_CHECKED_IN: 'patient_checked_in',
    READY_FOR_CONSULTATION: 'ready_for_consultation',
    CONSULTATION_STARTED: 'consultation_started',
    VIDEO_CALL_ACTIVE: 'video_call_active',
    CONSULTATION_COMPLETED: 'consultation_completed',
    FOLLOW_UP_SCHEDULED: 'follow_up_scheduled',
    COMPLETED: 'completed'
  };

  /**
   * Start the complete appointment workflow when patient checks in
   * @param {string} appointmentId - Appointment ID
   * @param {Object} checkInData - Check-in data
   * @returns {Promise<Object>} Workflow result
   */
  async startAppointmentWorkflow(appointmentId, checkInData = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      console.log(`🏥 Starting appointment workflow for: ${appointmentId}`);
      
      // 1. Check patient into queue
      await QueueService.checkInPatient(appointmentId);
      
      // 2. Update appointment status
      const appointment = await db.Appointment.findByPk(appointmentId, {
        include: ['patient', 'doctor'],
        transaction
      });
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      await appointment.update({
        workflowState: this.WORKFLOW_STATES.PATIENT_CHECKED_IN,
        checkInStatus: 'checked_in',
        checkedInAt: new Date(),
        checkInNotes: checkInData.notes || null
      }, { transaction });
      
      // 3. Check consent status
      const consentStatus = await this.checkConsentStatus(
        appointment.patientWalletAddress,
        appointment.doctorWalletAddress,
        transaction
      );
      
      if (!consentStatus.hasConsent) {
        // Request consent if not granted
        await this.requestConsent(appointment, transaction);
        
        await transaction.commit();
        return {
          success: true,
          workflowState: 'awaiting_consent',
          appointment: await appointment.reload(),
          consentRequired: true,
          message: 'Patient checked in, awaiting consent for medical records access'
        };
      }
      
      // 4. Mark as ready for consultation
      await appointment.update({
        workflowState: this.WORKFLOW_STATES.READY_FOR_CONSULTATION
      }, { transaction });
      
      // 5. Notify doctor
      await this.notifyDoctorPatientReady(appointment);
      
      await transaction.commit();
      
      return {
        success: true,
        workflowState: this.WORKFLOW_STATES.READY_FOR_CONSULTATION,
        appointment: await appointment.reload({ include: ['patient', 'doctor'] }),
        consentStatus,
        message: 'Patient ready for consultation'
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Start consultation after consent is granted
   * @param {string} appointmentId - Appointment ID
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @returns {Promise<Object>} Consultation start result
   */
  async startConsultation(appointmentId, doctorWalletAddress) {
    const transaction = await db.sequelize.transaction();
    
    try {
      console.log(`🩺 Starting consultation for appointment: ${appointmentId}`);
      
      // 1. Start appointment tracking (Smart Scheduling)
      const appointmentResult = await DynamicDurationManager.startAppointment(appointmentId);
      
      // 2. Update workflow state
      await appointmentResult.update({
        workflowState: this.WORKFLOW_STATES.CONSULTATION_STARTED,
        consultationStartedAt: new Date()
      }, { transaction });
      
      // 3. Create consultation session
      const consultationSession = await db.ConsultationSession.create({
        appointmentId,
        doctorWalletAddress,
        patientWalletAddress: appointmentResult.patientWalletAddress,
        sessionId: `consultation-${uuidv4()}`,
        status: 'active',
        startedAt: new Date()
      }, { transaction });
      
      // 4. Update queue status
      await QueueService.startAppointment(appointmentId);
      
      // 5. Notify patient consultation started
      await this.notifyConsultationStarted(appointmentResult);
      
      await transaction.commit();
      
      return {
        success: true,
        workflowState: this.WORKFLOW_STATES.CONSULTATION_STARTED,
        appointment: await appointmentResult.reload({ include: ['patient', 'doctor'] }),
        consultationSession,
        message: 'Consultation started successfully'
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Initiate video call during consultation
   * @param {string} appointmentId - Appointment ID
   * @param {string} initiatorWallet - Initiator wallet address
   * @returns {Promise<Object>} Video call result
   */
  async initiateVideoCall(appointmentId, initiatorWallet) {
    try {
      console.log(`📹 Initiating video call for appointment: ${appointmentId}`);
      
      const appointment = await db.Appointment.findByPk(appointmentId, {
        include: ['patient', 'doctor']
      });
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      // Determine receiver based on initiator
      const receiverWallet = initiatorWallet.toLowerCase() === appointment.doctorWalletAddress.toLowerCase()
        ? appointment.patientWalletAddress
        : appointment.doctorWalletAddress;
      
      // Generate unique room ID
      const roomId = `room-${appointmentId}-${Date.now()}`;
      
      // Create video call record
      const videoCall = await db.VideoCall.create({
        roomId,
        initiatorWallet: initiatorWallet.toLowerCase(),
        receiverWallet: receiverWallet.toLowerCase(),
        appointmentId,
        status: 'initiated',
        callType: 'consultation',
        initiatedAt: new Date()
      });
      
      // Update appointment workflow state
      await appointment.update({
        workflowState: this.WORKFLOW_STATES.VIDEO_CALL_ACTIVE,
        videoCallId: videoCall.id
      });
      
      // Notify receiver about incoming call
      await this.notifyIncomingVideoCall(appointment, videoCall, receiverWallet);
      
      return {
        success: true,
        videoCall,
        roomId,
        appointment: await appointment.reload(),
        message: 'Video call initiated'
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Complete consultation and appointment
   * @param {string} appointmentId - Appointment ID
   * @param {Object} completionData - Completion data
   * @returns {Promise<Object>} Completion result
   */
  async completeConsultation(appointmentId, completionData = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      console.log(`✅ Completing consultation for appointment: ${appointmentId}`);
      
      // 1. Complete appointment tracking (Smart Scheduling)
      const completionResult = await DynamicDurationManager.completeAppointment(appointmentId);
      
      // 2. Update workflow state
      await completionResult.appointment.update({
        workflowState: this.WORKFLOW_STATES.CONSULTATION_COMPLETED,
        consultationCompletedAt: new Date(),
        consultationNotes: completionData.notes || null,
        diagnosis: completionData.diagnosis || null,
        treatmentPlan: completionData.treatmentPlan || null
      }, { transaction });
      
      // 3. End video call if active
      if (completionResult.appointment.videoCallId) {
        await this.endVideoCall(completionResult.appointment.videoCallId, transaction);
      }
      
      // 4. Create medical record entry
      if (completionData.createMedicalRecord) {
        await this.createConsultationMedicalRecord(
          completionResult.appointment,
          completionData,
          transaction
        );
      }
      
      // 5. Create prescriptions if provided
      if (completionData.prescriptions && completionData.prescriptions.length > 0) {
        await this.createPrescriptions(
          completionResult.appointment,
          completionData.prescriptions,
          transaction
        );
      }
      
      // 6. Schedule follow-up if needed
      if (completionData.scheduleFollowUp) {
        await this.scheduleFollowUp(
          completionResult.appointment,
          completionData.followUpData,
          transaction
        );
      }
      
      // 7. Update final workflow state
      await completionResult.appointment.update({
        workflowState: this.WORKFLOW_STATES.COMPLETED,
        status: 'completed'
      }, { transaction });
      
      // 8. Update queue
      await QueueService.updateQueuePosition(appointmentId);
      
      // 9. Notify patient of completion
      await this.notifyConsultationCompleted(completionResult.appointment, completionData);
      
      await transaction.commit();
      
      return {
        success: true,
        workflowState: this.WORKFLOW_STATES.COMPLETED,
        appointment: await completionResult.appointment.reload({ include: ['patient', 'doctor'] }),
        durationResult: completionResult,
        message: 'Consultation completed successfully'
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check consent status between patient and doctor
   * @param {string} patientWallet - Patient wallet address
   * @param {string} doctorWallet - Doctor wallet address
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Consent status
   */
  async checkConsentStatus(patientWallet, doctorWallet, transaction = null) {
    const consent = await db.Consent.findOne({
      where: {
        patientWalletAddress: patientWallet.toLowerCase(),
        doctorWalletAddress: doctorWallet.toLowerCase(),
        status: 'granted',
        expiresAt: {
          [db.Sequelize.Op.gt]: new Date()
        }
      },
      transaction
    });
    
    return {
      hasConsent: !!consent,
      consent,
      isExpired: consent ? new Date() > consent.expiresAt : false
    };
  }

  /**
   * Request consent for medical records access
   * @param {Object} appointment - Appointment object
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Consent request
   */
  async requestConsent(appointment, transaction) {
    const consentRequest = await db.Consent.create({
      patientWalletAddress: appointment.patientWalletAddress,
      doctorWalletAddress: appointment.doctorWalletAddress,
      appointmentId: appointment.id,
      requestedAt: new Date(),
      status: 'pending',
      purpose: 'consultation',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }, { transaction });
    
    // Notify patient about consent request
    await EnhancedNotificationService.createNotification({
      recipientWalletAddress: appointment.patientWalletAddress,
      type: 'consent_request',
      title: 'Medical Records Access Request',
      message: `Dr. ${appointment.doctor.name} is requesting access to your medical records for your upcoming consultation.`,
      data: {
        appointmentId: appointment.id,
        consentId: consentRequest.id,
        doctorName: appointment.doctor.name
      }
    });
    
    return consentRequest;
  }

  /**
   * Create medical record from consultation
   * @param {Object} appointment - Appointment object
   * @param {Object} data - Medical record data
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Medical record
   */
  async createConsultationMedicalRecord(appointment, data, transaction) {
    return await db.MedicalRecord.create({
      patientWalletAddress: appointment.patientWalletAddress,
      doctorWalletAddress: appointment.doctorWalletAddress,
      appointmentId: appointment.id,
      recordType: 'consultation',
      diagnosis: data.diagnosis,
      symptoms: data.symptoms,
      treatment: data.treatmentPlan,
      notes: data.notes,
      vitalSigns: data.vitalSigns,
      recordDate: new Date(),
      isBlockchainStored: false // Will be stored to blockchain later
    }, { transaction });
  }

  /**
   * Create prescriptions from consultation
   * @param {Object} appointment - Appointment object
   * @param {Array} prescriptions - Prescription data array
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Array>} Created prescriptions
   */
  async createPrescriptions(appointment, prescriptions, transaction) {
    const createdPrescriptions = [];
    
    for (const prescriptionData of prescriptions) {
      const prescription = await db.Prescription.create({
        patientWalletAddress: appointment.patientWalletAddress,
        doctorWalletAddress: appointment.doctorWalletAddress,
        appointmentId: appointment.id,
        medicationName: prescriptionData.medicationName,
        dosage: prescriptionData.dosage,
        frequency: prescriptionData.frequency,
        duration: prescriptionData.duration,
        instructions: prescriptionData.instructions,
        status: 'active',
        prescribedAt: new Date()
      }, { transaction });
      
      createdPrescriptions.push(prescription);
    }
    
    return createdPrescriptions;
  }

  /**
   * End video call
   * @param {string} videoCallId - Video call ID
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Updated video call
   */
  async endVideoCall(videoCallId, transaction) {
    const videoCall = await db.VideoCall.findByPk(videoCallId, { transaction });
    
    if (videoCall) {
      await videoCall.update({
        status: 'ended',
        endedAt: new Date()
      }, { transaction });
    }
    
    return videoCall;
  }

  /**
   * Schedule follow-up appointment
   * @param {Object} appointment - Current appointment
   * @param {Object} followUpData - Follow-up data
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Follow-up appointment
   */
  async scheduleFollowUp(appointment, followUpData, transaction) {
    return await db.FollowUp.create({
      originalAppointmentId: appointment.id,
      patientWalletAddress: appointment.patientWalletAddress,
      doctorWalletAddress: appointment.doctorWalletAddress,
      scheduledDate: followUpData.scheduledDate,
      reason: followUpData.reason || 'Follow-up consultation',
      status: 'scheduled',
      createdAt: new Date()
    }, { transaction });
  }

  // Notification methods
  async notifyDoctorPatientReady(appointment) {
    await EnhancedNotificationService.createNotification({
      recipientWalletAddress: appointment.doctorWalletAddress,
      type: 'patient_ready',
      title: 'Patient Ready for Consultation',
      message: `${appointment.patient.name} has checked in and is ready for consultation.`,
      data: { appointmentId: appointment.id }
    });
  }

  async notifyConsultationStarted(appointment) {
    await EnhancedNotificationService.createNotification({
      recipientWalletAddress: appointment.patientWalletAddress,
      type: 'consultation_started',
      title: 'Consultation Started',
      message: `Your consultation with Dr. ${appointment.doctor.name} has begun.`,
      data: { appointmentId: appointment.id }
    });
  }

  async notifyIncomingVideoCall(appointment, videoCall, receiverWallet) {
    const io = getIO();
    io.to(`user_${receiverWallet}`).emit('incoming_video_call', {
      callId: videoCall.id,
      roomId: videoCall.roomId,
      appointmentId: appointment.id,
      callerName: videoCall.initiatorWallet === appointment.doctorWalletAddress 
        ? appointment.doctor.name 
        : appointment.patient.name
    });
  }

  async notifyConsultationCompleted(appointment, completionData) {
    await EnhancedNotificationService.createNotification({
      recipientWalletAddress: appointment.patientWalletAddress,
      type: 'consultation_completed',
      title: 'Consultation Completed',
      message: `Your consultation with Dr. ${appointment.doctor.name} has been completed.`,
      data: {
        appointmentId: appointment.id,
        hasPrescriptions: completionData.prescriptions?.length > 0,
        hasFollowUp: !!completionData.scheduleFollowUp
      }
    });
  }
}

export default new AppointmentWorkflowManager();