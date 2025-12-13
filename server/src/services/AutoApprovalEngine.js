/**
 * Auto-Approval Engine Service for Enhanced Two-Tier Pricing System
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Requirements: 3.1, 3.2, 3.3, 4.1**
 * 
 * This service handles all auto-approval logic including:
 * - Exact price matching validation
 * - Approval path determination
 * - Auto-approval execution workflows
 * - Manual approval routing
 */

import { Op } from 'sequelize';
import sequelize from '../config/database.js';

class AutoApprovalEngine {
  constructor() {
    this.approvalCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes for approval decisions
  }

  /**
   * Process appointment approval based on payment and pricing configuration
   * @param {Object} appointmentData - Appointment and payment information
   * @returns {Object} Approval decision and routing information
   */
  async processApproval(appointmentData) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        appointment_id,
        doctor_id,
        patient_id,
        service_type,
        paid_amount,
        payment_method = 'chapa'
      } = appointmentData;

      // Validate input data
      await this.validateApprovalInput(appointmentData);

      // Get doctor's pricing configuration
      const pricingConfig = await this.getDoctorPricingConfig(doctor_id, service_type);
      
      // Check auto-approval eligibility
      const eligibilityResult = await this.checkAutoApprovalEligibility(
        doctor_id,
        service_type,
        paid_amount,
        pricingConfig
      );

      // Validate wallet capability for premium services
      let walletValidation = { capable: true };
      if (eligibilityResult.payment_destination === 'doctor_wallet') {
        walletValidation = await this.validateWalletCapability(doctor_id, service_type);
      }

      // Determine final approval decision
      const approvalDecision = await this.determineApprovalPath(
        eligibilityResult,
        walletValidation,
        appointmentData
      );

      // Execute the approval workflow
      const executionResult = await this.executeApprovalWorkflow(
        approvalDecision,
        appointmentData,
        transaction
      );

      // Log the approval decision for audit trail
      await this.logApprovalDecision({
        appointment_id,
        doctor_id,
        patient_id,
        service_type,
        paid_amount,
        pricing_config: pricingConfig,
        eligibility_result: eligibilityResult,
        wallet_validation: walletValidation,
        approval_decision: approvalDecision,
        execution_result: executionResult
      }, transaction);

      await transaction.commit();

      return {
        success: true,
        approval_decision: approvalDecision,
        execution_result: executionResult,
        routing_info: {
          payment_destination: approvalDecision.payment_destination,
          approval_method: approvalDecision.approval_method,
          requires_manual_review: approvalDecision.approval_method !== 'auto_approved'
        }
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error processing approval:', error);
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
      throw new Error('Missing required appointment data for approval processing');
    }

    if (!['in_person', 'video_call', 'chat'].includes(service_type)) {
      throw new Error('Invalid service type');
    }

    if (typeof paid_amount !== 'number' || paid_amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    // Verify appointment exists and is in correct state
    const { default: Appointment } = await import('../models/Appointment.js');
    const appointment = await Appointment.findByPk(appointment_id);
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'pending_approval') {
      throw new Error(`Appointment is not in pending approval state. Current status: ${appointment.status}`);
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
   * Get doctor's pricing configuration for the service
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @returns {Object} Pricing configuration
   */
  async getDoctorPricingConfig(doctorId, serviceType) {
    try {
      const { default: EnhancedDoctorServiceFees } = await import('../models/EnhancedDoctorServiceFees.js');
      
      const pricingConfig = await EnhancedDoctorServiceFees.findOne({
        where: {
          doctor_id: doctorId,
          service_type: serviceType,
          is_active: true
        }
      });

      if (!pricingConfig) {
        // Return default configuration for standard services
        if (serviceType === 'in_person') {
          return {
            service_type: 'in_person',
            fee_amount: 400.00,
            fee_set_by: 'admin',
            is_auto_approve: false,
            is_default: true
          };
        }
        
        throw new Error(`No pricing configuration found for ${serviceType} service`);
      }

      return {
        id: pricingConfig.id,
        service_type: pricingConfig.service_type,
        fee_amount: parseFloat(pricingConfig.fee_amount),
        fee_set_by: pricingConfig.fee_set_by,
        is_auto_approve: pricingConfig.is_auto_approve,
        is_default: false,
        updated_at: pricingConfig.updated_at
      };
    } catch (error) {
      console.error('Error getting doctor pricing config:', error);
      throw error;
    }
  }

  /**
   * Check auto-approval eligibility based on pricing and payment
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @param {number} paidAmount - Amount paid by patient
   * @param {Object} pricingConfig - Doctor's pricing configuration
   * @returns {Object} Eligibility result
   */
  async checkAutoApprovalEligibility(doctorId, serviceType, paidAmount, pricingConfig) {
    try {
      const exactMatch = Math.abs(parseFloat(paidAmount) - parseFloat(pricingConfig.fee_amount)) < 0.01;
      const isPremiumService = pricingConfig.fee_set_by === 'doctor';
      const autoApproveEnabled = pricingConfig.is_auto_approve;

      // Auto-approval logic based on design requirements
      if (isPremiumService && exactMatch && autoApproveEnabled) {
        return {
          eligible: true,
          reason: 'Premium service with exact fee payment - auto-approved',
          decision: 'auto_approved',
          payment_destination: 'doctor_wallet',
          fee_amount: pricingConfig.fee_amount,
          is_exact_match: true,
          approval_confidence: 'high'
        };
      }

      if (!isPremiumService) {
        return {
          eligible: false,
          reason: 'Standard service requires manual doctor approval',
          decision: 'manual_review',
          payment_destination: 'system_wallet',
          fee_amount: pricingConfig.fee_amount,
          is_exact_match: exactMatch,
          approval_confidence: 'n/a'
        };
      }

      if (!exactMatch) {
        const difference = parseFloat(paidAmount) - parseFloat(pricingConfig.fee_amount);
        const percentageDiff = Math.abs(difference / pricingConfig.fee_amount) * 100;
        
        return {
          eligible: false,
          reason: `Payment amount (${paidAmount} ETB) does not match doctor's fee (${pricingConfig.fee_amount} ETB)`,
          decision: 'manual_review',
          payment_destination: 'system_wallet',
          fee_amount: pricingConfig.fee_amount,
          is_exact_match: false,
          payment_difference: difference,
          percentage_difference: percentageDiff,
          approval_confidence: 'low'
        };
      }

      return {
        eligible: false,
        reason: 'Auto-approval not enabled for this service configuration',
        decision: 'manual_review',
        payment_destination: 'system_wallet',
        fee_amount: pricingConfig.fee_amount,
        is_exact_match: exactMatch,
        approval_confidence: 'medium'
      };
    } catch (error) {
      console.error('Error checking auto-approval eligibility:', error);
      throw error;
    }
  }

  /**
   * Validate wallet capability for premium services
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @returns {Object} Wallet validation result
   */
  async validateWalletCapability(doctorId, serviceType) {
    try {
      // Standard services don't require wallet validation
      if (serviceType === 'in_person') {
        return {
          capable: true,
          reason: 'Standard service uses system wallet',
          wallet_required: false
        };
      }

      const { default: DoctorWalletConfig } = await import('../models/DoctorWalletConfig.js');
      
      const walletConfig = await DoctorWalletConfig.findOne({
        where: {
          doctor_id: doctorId,
          is_active: true
        }
      });

      if (!walletConfig) {
        return {
          capable: false,
          reason: 'No wallet configuration found for premium services',
          wallet_required: true,
          missing_config: true
        };
      }

      if (!walletConfig.is_verified) {
        return {
          capable: false,
          reason: 'Wallet configuration not verified for premium services',
          wallet_required: true,
          verification_required: true
        };
      }

      const paymentMethod = walletConfig.getPreferredPaymentMethod();
      if (!paymentMethod) {
        return {
          capable: false,
          reason: 'No valid payment method configured in wallet',
          wallet_required: true,
          payment_method_required: true
        };
      }

      return {
        capable: true,
        reason: 'Verified wallet with valid payment method',
        wallet_required: true,
        payment_method: paymentMethod,
        wallet_id: walletConfig.id
      };
    } catch (error) {
      console.error('Error validating wallet capability:', error);
      return {
        capable: false,
        reason: 'Error during wallet validation',
        wallet_required: true,
        validation_error: true
      };
    }
  }

  /**
   * Determine the final approval path based on eligibility and wallet validation
   * @param {Object} eligibilityResult - Auto-approval eligibility result
   * @param {Object} walletValidation - Wallet validation result
   * @param {Object} appointmentData - Original appointment data
   * @returns {Object} Final approval decision
   */
  async determineApprovalPath(eligibilityResult, walletValidation, appointmentData) {
    try {
      // If not eligible for auto-approval, route to manual review
      if (!eligibilityResult.eligible) {
        return {
          approval_method: 'manual_review',
          payment_destination: 'system_wallet',
          reason: eligibilityResult.reason,
          requires_doctor_action: true,
          estimated_review_time: this.getEstimatedReviewTime(appointmentData.service_type),
          fallback_reason: 'eligibility_check_failed'
        };
      }

      // If eligible but wallet not capable, fallback to system wallet
      if (eligibilityResult.payment_destination === 'doctor_wallet' && !walletValidation.capable) {
        return {
          approval_method: 'manual_review',
          payment_destination: 'system_wallet',
          reason: `Auto-approval eligible but ${walletValidation.reason}`,
          requires_doctor_action: true,
          estimated_review_time: this.getEstimatedReviewTime(appointmentData.service_type),
          fallback_reason: 'wallet_validation_failed',
          original_eligibility: eligibilityResult
        };
      }

      // Full auto-approval path
      return {
        approval_method: 'auto_approved',
        payment_destination: eligibilityResult.payment_destination,
        reason: eligibilityResult.reason,
        requires_doctor_action: false,
        estimated_review_time: 0,
        wallet_info: walletValidation.capable ? walletValidation : null,
        confidence_level: eligibilityResult.approval_confidence
      };
    } catch (error) {
      console.error('Error determining approval path:', error);
      throw error;
    }
  }

  /**
   * Execute the approval workflow based on the decision
   * @param {Object} approvalDecision - Final approval decision
   * @param {Object} appointmentData - Original appointment data
   * @param {Object} transaction - Database transaction
   * @returns {Object} Execution result
   */
  async executeApprovalWorkflow(approvalDecision, appointmentData, transaction) {
    try {
      const { appointment_id, doctor_id, patient_id } = appointmentData;

      if (approvalDecision.approval_method === 'auto_approved') {
        // Execute auto-approval workflow
        return await this.executeAutoApproval(
          approvalDecision,
          appointmentData,
          transaction
        );
      } else {
        // Execute manual review workflow
        return await this.executeManualReviewWorkflow(
          approvalDecision,
          appointmentData,
          transaction
        );
      }
    } catch (error) {
      console.error('Error executing approval workflow:', error);
      throw error;
    }
  }

  /**
   * Execute auto-approval workflow
   * @param {Object} approvalDecision - Approval decision
   * @param {Object} appointmentData - Appointment data
   * @param {Object} transaction - Database transaction
   * @returns {Object} Auto-approval execution result
   */
  async executeAutoApproval(approvalDecision, appointmentData, transaction) {
    try {
      const { appointment_id, doctor_id, patient_id } = appointmentData;

      // Update appointment status to approved
      const { default: Appointment } = await import('../models/Appointment.js');
      await Appointment.update({
        status: 'approved',
        approval_method: 'auto_approved',
        approved_at: new Date(),
        payment_status: 'completed'
      }, {
        where: { id: appointment_id },
        transaction
      });

      // Create payment transaction record
      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      const paymentTransaction = await EnhancedPaymentTransaction.create({
        appointment_id,
        patient_id,
        doctor_id,
        service_type: appointmentData.service_type,
        amount: appointmentData.paid_amount,
        expected_amount: approvalDecision.fee_amount || appointmentData.paid_amount,
        payment_destination: approvalDecision.payment_destination,
        approval_method: 'auto_approved',
        transaction_status: 'completed',
        completed_at: new Date()
      }, { transaction });

      // Send notifications
      await this.sendAutoApprovalNotifications(appointmentData, approvalDecision, transaction);

      return {
        execution_type: 'auto_approved',
        appointment_status: 'approved',
        payment_transaction_id: paymentTransaction.id,
        payment_destination: approvalDecision.payment_destination,
        notifications_sent: true,
        processing_time: new Date(),
        next_steps: this.getAutoApprovalNextSteps(appointmentData.service_type)
      };
    } catch (error) {
      console.error('Error executing auto-approval:', error);
      throw error;
    }
  }

  /**
   * Execute manual review workflow
   * @param {Object} approvalDecision - Approval decision
   * @param {Object} appointmentData - Appointment data
   * @param {Object} transaction - Database transaction
   * @returns {Object} Manual review execution result
   */
  async executeManualReviewWorkflow(approvalDecision, appointmentData, transaction) {
    try {
      const { appointment_id, doctor_id, patient_id } = appointmentData;

      // Update appointment status to pending doctor review
      const { default: Appointment } = await import('../models/Appointment.js');
      await Appointment.update({
        status: 'pending_doctor_review',
        approval_method: 'manual_review',
        review_required_at: new Date(),
        payment_status: 'held_in_escrow'
      }, {
        where: { id: appointment_id },
        transaction
      });

      // Create payment transaction record (held in system wallet)
      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      const paymentTransaction = await EnhancedPaymentTransaction.create({
        appointment_id,
        patient_id,
        doctor_id,
        service_type: appointmentData.service_type,
        amount: appointmentData.paid_amount,
        expected_amount: approvalDecision.fee_amount || appointmentData.paid_amount,
        payment_destination: 'system_wallet',
        approval_method: 'manual_review',
        transaction_status: 'pending'
      }, { transaction });

      // Add to doctor's approval queue
      await this.addToApprovalQueue(appointmentData, approvalDecision, transaction);

      // Send notifications for manual review
      await this.sendManualReviewNotifications(appointmentData, approvalDecision, transaction);

      return {
        execution_type: 'manual_review',
        appointment_status: 'pending_doctor_review',
        payment_transaction_id: paymentTransaction.id,
        payment_destination: 'system_wallet',
        estimated_review_time: approvalDecision.estimated_review_time,
        notifications_sent: true,
        processing_time: new Date(),
        next_steps: this.getManualReviewNextSteps(approvalDecision)
      };
    } catch (error) {
      console.error('Error executing manual review workflow:', error);
      throw error;
    }
  }

  /**
   * Add appointment to doctor's approval queue
   * @param {Object} appointmentData - Appointment data
   * @param {Object} approvalDecision - Approval decision
   * @param {Object} transaction - Database transaction
   */
  async addToApprovalQueue(appointmentData, approvalDecision, transaction) {
    try {
      // This would integrate with the existing appointment queue system
      // For now, we'll create a simple queue entry
      
      const { default: QueueEntry } = await import('../models/QueueEntry.js');
      await QueueEntry.create({
        appointment_id: appointmentData.appointment_id,
        doctor_id: appointmentData.doctor_id,
        patient_id: appointmentData.patient_id,
        queue_type: 'approval_required',
        priority: this.calculateApprovalPriority(appointmentData, approvalDecision),
        status: 'waiting',
        created_at: new Date()
      }, { transaction });
    } catch (error) {
      console.error('Error adding to approval queue:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Calculate approval priority based on various factors
   * @param {Object} appointmentData - Appointment data
   * @param {Object} approvalDecision - Approval decision
   * @returns {number} Priority score (1-10, higher = more urgent)
   */
  calculateApprovalPriority(appointmentData, approvalDecision) {
    let priority = 5; // Base priority

    // Higher priority for exact payment matches
    if (approvalDecision.is_exact_match) {
      priority += 2;
    }

    // Higher priority for premium services
    if (['video_call', 'chat'].includes(appointmentData.service_type)) {
      priority += 1;
    }

    // Lower priority for significant payment mismatches
    if (approvalDecision.percentage_difference && approvalDecision.percentage_difference > 20) {
      priority -= 2;
    }

    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Send notifications for auto-approved appointments
   * @param {Object} appointmentData - Appointment data
   * @param {Object} approvalDecision - Approval decision
   * @param {Object} transaction - Database transaction
   */
  async sendAutoApprovalNotifications(appointmentData, approvalDecision, transaction) {
    try {
      const { default: Notification } = await import('../models/Notification.js');

      // Notify patient
      await Notification.create({
        userId: appointmentData.patient_id,
        type: 'appointment_approved',
        title: 'Appointment Approved',
        message: `Your ${appointmentData.service_type.replace('_', ' ')} appointment has been automatically approved.`,
        data: {
          appointment_id: appointmentData.appointment_id,
          approval_method: 'auto_approved',
          service_type: appointmentData.service_type
        },
        priority: 'high'
      }, { transaction });

      // Notify doctor
      await Notification.create({
        userId: appointmentData.doctor_id,
        type: 'appointment_auto_approved',
        title: 'New Appointment Auto-Approved',
        message: `A ${appointmentData.service_type.replace('_', ' ')} appointment has been automatically approved and added to your schedule.`,
        data: {
          appointment_id: appointmentData.appointment_id,
          patient_id: appointmentData.patient_id,
          approval_method: 'auto_approved',
          payment_destination: approvalDecision.payment_destination
        },
        priority: 'medium'
      }, { transaction });
    } catch (error) {
      console.error('Error sending auto-approval notifications:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Send notifications for manual review appointments
   * @param {Object} appointmentData - Appointment data
   * @param {Object} approvalDecision - Approval decision
   * @param {Object} transaction - Database transaction
   */
  async sendManualReviewNotifications(appointmentData, approvalDecision, transaction) {
    try {
      const { default: Notification } = await import('../models/Notification.js');

      // Notify patient
      await Notification.create({
        userId: appointmentData.patient_id,
        type: 'appointment_pending_review',
        title: 'Appointment Pending Review',
        message: `Your ${appointmentData.service_type.replace('_', ' ')} appointment is pending doctor review. You'll be notified once approved.`,
        data: {
          appointment_id: appointmentData.appointment_id,
          estimated_review_time: approvalDecision.estimated_review_time,
          reason: approvalDecision.reason
        },
        priority: 'medium'
      }, { transaction });

      // Notify doctor
      await Notification.create({
        userId: appointmentData.doctor_id,
        type: 'appointment_review_required',
        title: 'Appointment Review Required',
        message: `A ${appointmentData.service_type.replace('_', ' ')} appointment requires your review and approval.`,
        data: {
          appointment_id: appointmentData.appointment_id,
          patient_id: appointmentData.patient_id,
          paid_amount: appointmentData.paid_amount,
          reason: approvalDecision.reason
        },
        priority: 'high'
      }, { transaction });
    } catch (error) {
      console.error('Error sending manual review notifications:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Get estimated review time based on service type
   * @param {string} serviceType - Service type
   * @returns {number} Estimated review time in minutes
   */
  getEstimatedReviewTime(serviceType) {
    const reviewTimes = {
      'in_person': 30,    // 30 minutes for in-person
      'video_call': 15,   // 15 minutes for video calls
      'chat': 10          // 10 minutes for chat
    };

    return reviewTimes[serviceType] || 20;
  }

  /**
   * Get next steps for auto-approved appointments
   * @param {string} serviceType - Service type
   * @returns {Array} Next steps
   */
  getAutoApprovalNextSteps(serviceType) {
    const baseSteps = [
      'Appointment confirmed and added to schedule',
      'Payment processed successfully'
    ];

    const serviceSpecificSteps = {
      'video_call': ['Video call link will be sent before appointment'],
      'chat': ['Chat session will be available at appointment time'],
      'in_person': ['Please arrive 15 minutes early for check-in']
    };

    return [...baseSteps, ...(serviceSpecificSteps[serviceType] || [])];
  }

  /**
   * Get next steps for manual review appointments
   * @param {Object} approvalDecision - Approval decision
   * @returns {Array} Next steps
   */
  getManualReviewNextSteps(approvalDecision) {
    const steps = [
      'Doctor will review your appointment request',
      `Estimated review time: ${approvalDecision.estimated_review_time} minutes`,
      'You will be notified once the doctor responds'
    ];

    if (approvalDecision.fallback_reason === 'wallet_validation_failed') {
      steps.push('Payment is held securely until approval');
    }

    return steps;
  }

  /**
   * Log approval decision for audit trail
   * @param {Object} logData - Data to log
   * @param {Object} transaction - Database transaction
   */
  async logApprovalDecision(logData, transaction) {
    try {
      const { default: PricingAuditLog } = await import('../models/PricingAuditLog.js');
      
      await PricingAuditLog.create({
        doctor_id: logData.doctor_id,
        service_type: logData.service_type,
        action_type: 'approval_decision',
        old_amount: null,
        new_amount: logData.paid_amount,
        changed_by: 'system',
        change_reason: `Approval decision: ${logData.approval_decision.approval_method}`,
        approval_context: {
          eligibility_result: logData.eligibility_result,
          wallet_validation: logData.wallet_validation,
          approval_decision: logData.approval_decision,
          execution_result: logData.execution_result
        }
      }, { transaction });
    } catch (error) {
      console.error('Error logging approval decision:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Get approval statistics for analytics
   * @param {Object} filters - Filter options
   * @returns {Object} Approval statistics
   */
  async getApprovalStatistics(filters = {}) {
    try {
      const { doctorId, serviceType, timeRange = 30 } = filters;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      
      let whereClause = {
        created_at: { [Op.gte]: startDate }
      };

      if (doctorId) whereClause.doctor_id = doctorId;
      if (serviceType) whereClause.service_type = serviceType;

      const stats = await EnhancedPaymentTransaction.findAll({
        where: whereClause,
        attributes: [
          'approval_method',
          'service_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('AVG', sequelize.col('amount')), 'avg_amount'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
        ],
        group: ['approval_method', 'service_type'],
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

export default AutoApprovalEngine;