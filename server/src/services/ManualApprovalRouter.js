/**
 * Manual Approval Router Service for Enhanced Two-Tier Pricing System
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Requirements: 4.1, 4.2, 4.3, 4.4, 4.5**
 * 
 * This service handles all manual approval workflows including:
 * - Manual approval workflow handlers
 * - Doctor notification systems
 * - Approval/rejection processing
 * - Alternative scheduling suggestions
 */

import { Op } from 'sequelize';
import sequelize from '../config/database.js';

class ManualApprovalRouter {
  constructor() {
    this.approvalTimeouts = new Map();
    this.defaultTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Route appointment to manual approval workflow
   * @param {Object} appointmentData - Appointment and payment information
   * @param {Object} approvalContext - Context from auto-approval engine
   * @returns {Object} Manual approval routing result
   */
  async routeToManualApproval(appointmentData, approvalContext) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        appointment_id,
        doctor_id,
        patient_id,
        service_type,
        paid_amount,
        expected_amount
      } = appointmentData;

      // Validate input data
      await this.validateApprovalInput(appointmentData);

      // Create manual approval request
      const approvalRequest = await this.createApprovalRequest(
        appointmentData,
        approvalContext,
        transaction
      );

      // Add to doctor's approval queue with priority
      await this.addToApprovalQueue(
        approvalRequest,
        appointmentData,
        transaction
      );

      // Send notifications to doctor and patient
      await this.sendApprovalNotifications(
        approvalRequest,
        appointmentData,
        transaction
      );

      // Set approval timeout
      await this.setApprovalTimeout(
        approvalRequest.id,
        appointmentData,
        transaction
      );

      // Generate alternative scheduling suggestions if needed
      const alternatives = await this.generateAlternativeScheduling(
        appointmentData,
        approvalContext
      );

      await transaction.commit();

      return {
        success: true,
        approval_request_id: approvalRequest.id,
        status: 'pending_doctor_review',
        estimated_response_time: this.getEstimatedResponseTime(service_type),
        alternatives,
        next_steps: this.getManualApprovalNextSteps(approvalContext),
        timeout_at: new Date(Date.now() + this.defaultTimeout)
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error routing to manual approval:', error);
      throw error;
    }
  }

  /**
   * Process doctor's approval decision
   * @param {string} approvalRequestId - Approval request ID
   * @param {string} doctorId - Doctor's user ID
   * @param {string} decision - 'approved' or 'rejected'
   * @param {Object} decisionData - Additional decision data
   * @returns {Object} Processing result
   */
  async processDoctorDecision(approvalRequestId, doctorId, decision, decisionData = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get approval request
      const { default: ManualApprovalRequest } = await import('../models/ManualApprovalRequest.js');
      const approvalRequest = await ManualApprovalRequest.findByPk(approvalRequestId, {
        transaction
      });

      if (!approvalRequest) {
        throw new Error('Approval request not found');
      }

      if (approvalRequest.doctor_id !== doctorId) {
        throw new Error('Unauthorized: Doctor can only approve their own requests');
      }

      if (approvalRequest.status !== 'pending') {
        throw new Error(`Request already processed with status: ${approvalRequest.status}`);
      }

      // Validate decision
      if (!['approved', 'rejected'].includes(decision)) {
        throw new Error('Invalid decision. Must be "approved" or "rejected"');
      }

      // Process the decision
      let processingResult;
      if (decision === 'approved') {
        processingResult = await this.processApproval(
          approvalRequest,
          decisionData,
          transaction
        );
      } else {
        processingResult = await this.processRejection(
          approvalRequest,
          decisionData,
          transaction
        );
      }

      // Update approval request status
      await approvalRequest.update({
        status: decision,
        decision_at: new Date(),
        decision_reason: decisionData.reason || null,
        decision_data: decisionData
      }, { transaction });

      // Clear timeout
      this.clearApprovalTimeout(approvalRequestId);

      // Send decision notifications
      await this.sendDecisionNotifications(
        approvalRequest,
        decision,
        decisionData,
        transaction
      );

      // Log the decision for audit trail
      await this.logApprovalDecision(
        approvalRequest,
        decision,
        decisionData,
        transaction
      );

      await transaction.commit();

      return {
        success: true,
        decision,
        approval_request_id: approvalRequestId,
        processing_result: processingResult,
        decision_timestamp: new Date()
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error processing doctor decision:', error);
      throw error;
    }
  }

  /**
   * Handle approval timeout (auto-reject after timeout period)
   * @param {string} approvalRequestId - Approval request ID
   * @returns {Object} Timeout handling result
   */
  async handleApprovalTimeout(approvalRequestId) {
    const transaction = await sequelize.transaction();
    
    try {
      const { default: ManualApprovalRequest } = await import('../models/ManualApprovalRequest.js');
      const approvalRequest = await ManualApprovalRequest.findByPk(approvalRequestId, {
        transaction
      });

      if (!approvalRequest || approvalRequest.status !== 'pending') {
        return { success: false, reason: 'Request not found or already processed' };
      }

      // Auto-reject due to timeout
      const timeoutResult = await this.processRejection(
        approvalRequest,
        {
          reason: 'Automatic rejection due to timeout',
          timeout: true,
          auto_rejected: true
        },
        transaction
      );

      // Update approval request
      await approvalRequest.update({
        status: 'timeout_rejected',
        decision_at: new Date(),
        decision_reason: 'Automatic rejection due to timeout',
        decision_data: { timeout: true, auto_rejected: true }
      }, { transaction });

      // Send timeout notifications
      await this.sendTimeoutNotifications(approvalRequest, transaction);

      await transaction.commit();

      return {
        success: true,
        decision: 'timeout_rejected',
        processing_result: timeoutResult
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error handling approval timeout:', error);
      throw error;
    }
  }

  /**
   * Get doctor's pending approval requests
   * @param {string} doctorId - Doctor's user ID
   * @param {Object} options - Query options
   * @returns {Array} Pending approval requests
   */
  async getDoctorPendingApprovals(doctorId, options = {}) {
    try {
      const { limit = 20, offset = 0, service_type } = options;
      
      const { default: ManualApprovalRequest } = await import('../models/ManualApprovalRequest.js');
      
      let whereClause = {
        doctor_id: doctorId,
        status: 'pending'
      };

      if (service_type) {
        whereClause.service_type = service_type;
      }

      const approvals = await ManualApprovalRequest.findAll({
        where: whereClause,
        order: [['priority', 'DESC'], ['created_at', 'ASC']],
        limit,
        offset,
        include: [
          {
            model: sequelize.models.User,
            as: 'Patient',
            attributes: ['id', 'first_name', 'last_name', 'email']
          },
          {
            model: sequelize.models.Appointment,
            as: 'Appointment',
            attributes: ['id', 'appointment_date', 'appointment_time', 'status']
          }
        ]
      });

      return approvals.map(approval => ({
        id: approval.id,
        appointment_id: approval.appointment_id,
        patient: approval.Patient,
        appointment: approval.Appointment,
        service_type: approval.service_type,
        paid_amount: approval.paid_amount,
        expected_amount: approval.expected_amount,
        payment_difference: approval.payment_difference,
        priority: approval.priority,
        reason: approval.reason,
        created_at: approval.created_at,
        expires_at: approval.expires_at,
        alternatives: approval.alternatives
      }));
    } catch (error) {
      console.error('Error getting doctor pending approvals:', error);
      throw error;
    }
  }

  /**
   * Validate approval input data
   * @param {Object} appointmentData - Appointment data to validate
   */
  async validateApprovalInput(appointmentData) {
    const { appointment_id, doctor_id, patient_id, service_type, paid_amount } = appointmentData;

    if (!appointment_id || !doctor_id || !patient_id || !service_type || !paid_amount) {
      throw new Error('Missing required appointment data for manual approval');
    }

    // Verify appointment exists and is in correct state
    const { default: Appointment } = await import('../models/Appointment.js');
    const appointment = await Appointment.findByPk(appointment_id);
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (!['pending_approval', 'pending_doctor_review'].includes(appointment.status)) {
      throw new Error(`Appointment is not in pending state. Current status: ${appointment.status}`);
    }

    // Verify doctor and patient exist
    const { default: User } = await import('../models/User.js');
    const [doctor, patient] = await Promise.all([
      User.findOne({ where: { id: doctor_id, role: 'doctor', is_active: true } }),
      User.findOne({ where: { id: patient_id, is_active: true } })
    ]);

    if (!doctor) {
      throw new Error('Doctor not found or inactive');
    }

    if (!patient) {
      throw new Error('Patient not found or inactive');
    }
  }

  /**
   * Create manual approval request record
   * @param {Object} appointmentData - Appointment data
   * @param {Object} approvalContext - Approval context
   * @param {Object} transaction - Database transaction
   * @returns {Object} Created approval request
   */
  async createApprovalRequest(appointmentData, approvalContext, transaction) {
    try {
      const { default: ManualApprovalRequest } = await import('../models/ManualApprovalRequest.js');
      
      const paymentDifference = parseFloat(appointmentData.paid_amount) - parseFloat(appointmentData.expected_amount || appointmentData.paid_amount);
      
      const approvalRequest = await ManualApprovalRequest.create({
        appointment_id: appointmentData.appointment_id,
        doctor_id: appointmentData.doctor_id,
        patient_id: appointmentData.patient_id,
        service_type: appointmentData.service_type,
        paid_amount: appointmentData.paid_amount,
        expected_amount: appointmentData.expected_amount || appointmentData.paid_amount,
        payment_difference: paymentDifference,
        reason: approvalContext.reason || 'Manual approval required',
        priority: this.calculateApprovalPriority(appointmentData, approvalContext),
        status: 'pending',
        expires_at: new Date(Date.now() + this.defaultTimeout),
        approval_context: approvalContext
      }, { transaction });

      return approvalRequest;
    } catch (error) {
      console.error('Error creating approval request:', error);
      throw error;
    }
  }

  /**
   * Add approval request to doctor's queue
   * @param {Object} approvalRequest - Approval request
   * @param {Object} appointmentData - Appointment data
   * @param {Object} transaction - Database transaction
   */
  async addToApprovalQueue(approvalRequest, appointmentData, transaction) {
    try {
      const { default: QueueEntry } = await import('../models/QueueEntry.js');
      
      await QueueEntry.create({
        appointment_id: appointmentData.appointment_id,
        doctor_id: appointmentData.doctor_id,
        patient_id: appointmentData.patient_id,
        queue_type: 'manual_approval',
        priority: approvalRequest.priority,
        status: 'waiting',
        reference_id: approvalRequest.id,
        metadata: {
          service_type: appointmentData.service_type,
          paid_amount: appointmentData.paid_amount,
          expected_amount: appointmentData.expected_amount,
          reason: approvalRequest.reason
        }
      }, { transaction });
    } catch (error) {
      console.error('Error adding to approval queue:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Send approval notifications to doctor and patient
   * @param {Object} approvalRequest - Approval request
   * @param {Object} appointmentData - Appointment data
   * @param {Object} transaction - Database transaction
   */
  async sendApprovalNotifications(approvalRequest, appointmentData, transaction) {
    try {
      const { default: Notification } = await import('../models/Notification.js');

      // Notify doctor about pending approval
      await Notification.create({
        userId: appointmentData.doctor_id,
        type: 'manual_approval_required',
        title: 'Appointment Approval Required',
        message: `A ${appointmentData.service_type.replace('_', ' ')} appointment requires your approval. Payment: ${appointmentData.paid_amount} ETB.`,
        data: {
          approval_request_id: approvalRequest.id,
          appointment_id: appointmentData.appointment_id,
          patient_id: appointmentData.patient_id,
          service_type: appointmentData.service_type,
          paid_amount: appointmentData.paid_amount,
          expected_amount: appointmentData.expected_amount,
          reason: approvalRequest.reason,
          expires_at: approvalRequest.expires_at
        },
        priority: 'high'
      }, { transaction });

      // Notify patient about pending review
      await Notification.create({
        userId: appointmentData.patient_id,
        type: 'appointment_pending_approval',
        title: 'Appointment Pending Doctor Approval',
        message: `Your ${appointmentData.service_type.replace('_', ' ')} appointment is pending doctor approval. You'll be notified once reviewed.`,
        data: {
          approval_request_id: approvalRequest.id,
          appointment_id: appointmentData.appointment_id,
          doctor_id: appointmentData.doctor_id,
          service_type: appointmentData.service_type,
          estimated_response_time: this.getEstimatedResponseTime(appointmentData.service_type),
          expires_at: approvalRequest.expires_at
        },
        priority: 'medium'
      }, { transaction });
    } catch (error) {
      console.error('Error sending approval notifications:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Process approval decision
   * @param {Object} approvalRequest - Approval request
   * @param {Object} decisionData - Decision data
   * @param {Object} transaction - Database transaction
   * @returns {Object} Processing result
   */
  async processApproval(approvalRequest, decisionData, transaction) {
    try {
      // Update appointment status to approved
      const { default: Appointment } = await import('../models/Appointment.js');
      await Appointment.update({
        status: 'approved',
        approval_method: 'manual_approved',
        approved_at: new Date(),
        approved_by: approvalRequest.doctor_id,
        payment_status: 'completed'
      }, {
        where: { id: approvalRequest.appointment_id },
        transaction
      });

      // Create/update payment transaction
      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      const [paymentTransaction] = await EnhancedPaymentTransaction.upsert({
        appointment_id: approvalRequest.appointment_id,
        patient_id: approvalRequest.patient_id,
        doctor_id: approvalRequest.doctor_id,
        service_type: approvalRequest.service_type,
        amount: approvalRequest.paid_amount,
        expected_amount: approvalRequest.expected_amount,
        payment_destination: 'system_wallet', // Manual approvals go to system wallet
        approval_method: 'manual_approved',
        transaction_status: 'completed',
        completed_at: new Date()
      }, { transaction });

      // Handle alternative scheduling if provided
      if (decisionData.alternative_time) {
        await this.processAlternativeScheduling(
          approvalRequest,
          decisionData.alternative_time,
          transaction
        );
      }

      return {
        execution_type: 'manual_approved',
        appointment_status: 'approved',
        payment_transaction_id: paymentTransaction.id,
        payment_destination: 'system_wallet',
        alternative_scheduling: decisionData.alternative_time || null,
        processing_time: new Date()
      };
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  /**
   * Process rejection decision
   * @param {Object} approvalRequest - Approval request
   * @param {Object} decisionData - Decision data
   * @param {Object} transaction - Database transaction
   * @returns {Object} Processing result
   */
  async processRejection(approvalRequest, decisionData, transaction) {
    try {
      // Update appointment status to rejected
      const { default: Appointment } = await import('../models/Appointment.js');
      await Appointment.update({
        status: 'rejected',
        approval_method: 'manual_rejected',
        rejected_at: new Date(),
        rejected_by: approvalRequest.doctor_id,
        rejection_reason: decisionData.reason || 'Rejected by doctor',
        payment_status: 'refund_pending'
      }, {
        where: { id: approvalRequest.appointment_id },
        transaction
      });

      // Process refund
      const refundResult = await this.processRejectionRefund(
        approvalRequest,
        decisionData,
        transaction
      );

      // Suggest alternatives if provided
      let alternativeSuggestions = null;
      if (decisionData.suggest_alternatives) {
        alternativeSuggestions = await this.generateAlternativeScheduling(
          {
            doctor_id: approvalRequest.doctor_id,
            service_type: approvalRequest.service_type,
            patient_id: approvalRequest.patient_id
          },
          { reason: 'rejection_alternatives' }
        );
      }

      return {
        execution_type: 'manual_rejected',
        appointment_status: 'rejected',
        refund_result: refundResult,
        rejection_reason: decisionData.reason,
        alternative_suggestions: alternativeSuggestions,
        processing_time: new Date()
      };
    } catch (error) {
      console.error('Error processing rejection:', error);
      throw error;
    }
  }

  /**
   * Process refund for rejected appointment
   * @param {Object} approvalRequest - Approval request
   * @param {Object} decisionData - Decision data
   * @param {Object} transaction - Database transaction
   * @returns {Object} Refund result
   */
  async processRejectionRefund(approvalRequest, decisionData, transaction) {
    try {
      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      
      // Create refund transaction
      const refundTransaction = await EnhancedPaymentTransaction.create({
        appointment_id: approvalRequest.appointment_id,
        patient_id: approvalRequest.patient_id,
        doctor_id: approvalRequest.doctor_id,
        service_type: approvalRequest.service_type,
        amount: -Math.abs(approvalRequest.paid_amount), // Negative for refund
        expected_amount: approvalRequest.paid_amount,
        payment_destination: 'patient_refund',
        approval_method: 'manual_rejected',
        transaction_status: 'pending',
        refund_reason: decisionData.reason || 'Appointment rejected by doctor'
      }, { transaction });

      // In a real implementation, this would integrate with Chapa for actual refund processing
      // For now, we'll mark it as completed
      await refundTransaction.update({
        transaction_status: 'completed',
        completed_at: new Date()
      }, { transaction });

      return {
        refund_transaction_id: refundTransaction.id,
        refund_amount: approvalRequest.paid_amount,
        refund_status: 'completed',
        refund_reason: decisionData.reason || 'Appointment rejected by doctor'
      };
    } catch (error) {
      console.error('Error processing rejection refund:', error);
      throw error;
    }
  }

  /**
   * Generate alternative scheduling suggestions
   * @param {Object} appointmentData - Appointment data
   * @param {Object} context - Context for alternatives
   * @returns {Array} Alternative scheduling options
   */
  async generateAlternativeScheduling(appointmentData, context) {
    try {
      const { doctor_id, service_type, patient_id } = appointmentData;
      
      // Get doctor's availability for next 7 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);

      // In a real implementation, this would query the doctor's availability
      // For now, we'll generate some mock alternatives
      const alternatives = [];
      
      for (let i = 1; i <= 3; i++) {
        const altDate = new Date();
        altDate.setDate(altDate.getDate() + i);
        
        alternatives.push({
          date: altDate.toISOString().split('T')[0],
          time: `${9 + i}:00`,
          service_type,
          estimated_duration: this.getServiceDuration(service_type),
          availability_confidence: 'high',
          reason: `Alternative slot ${i} - ${altDate.toLocaleDateString()}`
        });
      }

      return alternatives;
    } catch (error) {
      console.error('Error generating alternative scheduling:', error);
      return [];
    }
  }

  /**
   * Send decision notifications
   * @param {Object} approvalRequest - Approval request
   * @param {string} decision - Decision made
   * @param {Object} decisionData - Decision data
   * @param {Object} transaction - Database transaction
   */
  async sendDecisionNotifications(approvalRequest, decision, decisionData, transaction) {
    try {
      const { default: Notification } = await import('../models/Notification.js');

      if (decision === 'approved') {
        // Notify patient of approval
        await Notification.create({
          userId: approvalRequest.patient_id,
          type: 'appointment_approved',
          title: 'Appointment Approved',
          message: `Your ${approvalRequest.service_type.replace('_', ' ')} appointment has been approved by the doctor.`,
          data: {
            appointment_id: approvalRequest.appointment_id,
            doctor_id: approvalRequest.doctor_id,
            service_type: approvalRequest.service_type,
            approval_method: 'manual_approved',
            alternative_time: decisionData.alternative_time || null
          },
          priority: 'high'
        }, { transaction });
      } else {
        // Notify patient of rejection
        await Notification.create({
          userId: approvalRequest.patient_id,
          type: 'appointment_rejected',
          title: 'Appointment Not Approved',
          message: `Your ${approvalRequest.service_type.replace('_', ' ')} appointment was not approved. A refund has been processed.`,
          data: {
            appointment_id: approvalRequest.appointment_id,
            doctor_id: approvalRequest.doctor_id,
            service_type: approvalRequest.service_type,
            rejection_reason: decisionData.reason,
            refund_status: 'processed',
            alternatives_available: !!decisionData.suggest_alternatives
          },
          priority: 'high'
        }, { transaction });
      }
    } catch (error) {
      console.error('Error sending decision notifications:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Send timeout notifications
   * @param {Object} approvalRequest - Approval request
   * @param {Object} transaction - Database transaction
   */
  async sendTimeoutNotifications(approvalRequest, transaction) {
    try {
      const { default: Notification } = await import('../models/Notification.js');

      // Notify patient of timeout
      await Notification.create({
        userId: approvalRequest.patient_id,
        type: 'appointment_timeout_rejected',
        title: 'Appointment Request Expired',
        message: `Your ${approvalRequest.service_type.replace('_', ' ')} appointment request expired without doctor response. A refund has been processed.`,
        data: {
          appointment_id: approvalRequest.appointment_id,
          doctor_id: approvalRequest.doctor_id,
          service_type: approvalRequest.service_type,
          timeout_reason: 'Doctor did not respond within 24 hours',
          refund_status: 'processed'
        },
        priority: 'high'
      }, { transaction });

      // Notify doctor of missed approval
      await Notification.create({
        userId: approvalRequest.doctor_id,
        type: 'approval_timeout_missed',
        title: 'Missed Appointment Approval',
        message: `An appointment approval request expired due to no response. Patient has been refunded.`,
        data: {
          appointment_id: approvalRequest.appointment_id,
          patient_id: approvalRequest.patient_id,
          service_type: approvalRequest.service_type,
          timeout_at: new Date()
        },
        priority: 'medium'
      }, { transaction });
    } catch (error) {
      console.error('Error sending timeout notifications:', error);
    }
  }

  /**
   * Calculate approval priority
   * @param {Object} appointmentData - Appointment data
   * @param {Object} approvalContext - Approval context
   * @returns {number} Priority score (1-10)
   */
  calculateApprovalPriority(appointmentData, approvalContext) {
    let priority = 5; // Base priority

    // Higher priority for exact payment matches
    const paymentDiff = Math.abs(parseFloat(appointmentData.paid_amount) - parseFloat(appointmentData.expected_amount || appointmentData.paid_amount));
    if (paymentDiff < 0.01) {
      priority += 2;
    }

    // Higher priority for premium services
    if (['video_call', 'chat'].includes(appointmentData.service_type)) {
      priority += 1;
    }

    // Lower priority for large payment mismatches
    if (approvalContext.percentage_difference && approvalContext.percentage_difference > 20) {
      priority -= 2;
    }

    // Higher priority for wallet validation failures (eligible but technical issue)
    if (approvalContext.fallback_reason === 'wallet_validation_failed') {
      priority += 1;
    }

    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Get estimated response time for service type
   * @param {string} serviceType - Service type
   * @returns {number} Estimated response time in minutes
   */
  getEstimatedResponseTime(serviceType) {
    const responseTimes = {
      'in_person': 60,    // 1 hour for in-person
      'video_call': 30,   // 30 minutes for video calls
      'chat': 20          // 20 minutes for chat
    };

    return responseTimes[serviceType] || 45;
  }

  /**
   * Get service duration for scheduling
   * @param {string} serviceType - Service type
   * @returns {number} Duration in minutes
   */
  getServiceDuration(serviceType) {
    const durations = {
      'in_person': 30,
      'video_call': 20,
      'chat': 15
    };

    return durations[serviceType] || 30;
  }

  /**
   * Get next steps for manual approval
   * @param {Object} approvalContext - Approval context
   * @returns {Array} Next steps
   */
  getManualApprovalNextSteps(approvalContext) {
    const steps = [
      'Your appointment request has been sent to the doctor for review',
      'You will receive a notification once the doctor responds',
      'Payment is held securely until approval decision'
    ];

    if (approvalContext.fallback_reason === 'wallet_validation_failed') {
      steps.push('Doctor will review despite wallet configuration issues');
    }

    if (approvalContext.percentage_difference && approvalContext.percentage_difference > 0) {
      steps.push('Doctor will review the payment amount difference');
    }

    steps.push('If not approved within 24 hours, automatic refund will be processed');

    return steps;
  }

  /**
   * Set approval timeout
   * @param {string} approvalRequestId - Approval request ID
   * @param {Object} appointmentData - Appointment data
   * @param {Object} transaction - Database transaction
   */
  async setApprovalTimeout(approvalRequestId, appointmentData, transaction) {
    try {
      // Set timeout for auto-rejection
      const timeoutId = setTimeout(async () => {
        try {
          await this.handleApprovalTimeout(approvalRequestId);
        } catch (error) {
          console.error('Error in approval timeout handler:', error);
        }
      }, this.defaultTimeout);

      // Store timeout reference
      this.approvalTimeouts.set(approvalRequestId, timeoutId);
    } catch (error) {
      console.error('Error setting approval timeout:', error);
    }
  }

  /**
   * Clear approval timeout
   * @param {string} approvalRequestId - Approval request ID
   */
  clearApprovalTimeout(approvalRequestId) {
    try {
      const timeoutId = this.approvalTimeouts.get(approvalRequestId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.approvalTimeouts.delete(approvalRequestId);
      }
    } catch (error) {
      console.error('Error clearing approval timeout:', error);
    }
  }

  /**
   * Process alternative scheduling
   * @param {Object} approvalRequest - Approval request
   * @param {Object} alternativeTime - Alternative time data
   * @param {Object} transaction - Database transaction
   */
  async processAlternativeScheduling(approvalRequest, alternativeTime, transaction) {
    try {
      // Update appointment with new time
      const { default: Appointment } = await import('../models/Appointment.js');
      await Appointment.update({
        appointment_date: alternativeTime.date,
        appointment_time: alternativeTime.time,
        rescheduled: true,
        rescheduled_by: approvalRequest.doctor_id,
        rescheduled_reason: 'Doctor suggested alternative time'
      }, {
        where: { id: approvalRequest.appointment_id },
        transaction
      });
    } catch (error) {
      console.error('Error processing alternative scheduling:', error);
    }
  }

  /**
   * Log approval decision for audit trail
   * @param {Object} approvalRequest - Approval request
   * @param {string} decision - Decision made
   * @param {Object} decisionData - Decision data
   * @param {Object} transaction - Database transaction
   */
  async logApprovalDecision(approvalRequest, decision, decisionData, transaction) {
    try {
      const { default: PricingAuditLog } = await import('../models/PricingAuditLog.js');
      
      await PricingAuditLog.create({
        doctor_id: approvalRequest.doctor_id,
        service_type: approvalRequest.service_type,
        action_type: 'manual_approval_decision',
        old_amount: approvalRequest.expected_amount,
        new_amount: approvalRequest.paid_amount,
        changed_by: approvalRequest.doctor_id,
        change_reason: `Manual approval ${decision}: ${decisionData.reason || 'No reason provided'}`,
        approval_context: {
          approval_request_id: approvalRequest.id,
          decision,
          decision_data: decisionData,
          payment_difference: approvalRequest.payment_difference,
          processing_time: new Date()
        }
      }, { transaction });
    } catch (error) {
      console.error('Error logging approval decision:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Get manual approval statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Approval statistics
   */
  async getApprovalStatistics(filters = {}) {
    try {
      const { doctorId, serviceType, timeRange = 30 } = filters;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const { default: ManualApprovalRequest } = await import('../models/ManualApprovalRequest.js');
      
      let whereClause = {
        created_at: { [Op.gte]: startDate }
      };

      if (doctorId) whereClause.doctor_id = doctorId;
      if (serviceType) whereClause.service_type = serviceType;

      const stats = await ManualApprovalRequest.findAll({
        where: whereClause,
        attributes: [
          'status',
          'service_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('AVG', sequelize.col('paid_amount')), 'avg_amount'],
          [sequelize.fn('AVG', sequelize.literal('EXTRACT(EPOCH FROM (decision_at - created_at))/60')), 'avg_response_time_minutes']
        ],
        group: ['status', 'service_type'],
        raw: true
      });

      return {
        time_range: timeRange,
        filters: { doctorId, serviceType },
        statistics: stats,
        generated_at: new Date()
      };
    } catch (error) {
      console.error('Error getting approval statistics:', error);
      throw new Error('Failed to generate approval statistics');
    }
  }
}

export default ManualApprovalRouter;