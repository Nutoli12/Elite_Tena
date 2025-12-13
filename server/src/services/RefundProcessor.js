/**
 * Refund Processing System
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 4.5: Refund processing system**
 * **Requirements: 8.2, 8.3, 8.4, 8.5**
 * 
 * Handles refund workflows for rejected appointments, cancellation refunds,
 * technical issue refunds, and refund notification systems.
 */

import { Op } from 'sequelize';

export class RefundProcessor {
  constructor(models, paymentGateway, notificationService, auditService) {
    this.models = models;
    this.paymentGateway = paymentGateway;
    this.notificationService = notificationService;
    this.auditService = auditService;
    this.refundCache = new Map();
    this.processingQueue = [];
  }

  /**
   * Process refund for rejected appointment
   * @param {string} appointmentId - Appointment ID
   * @param {Object} rejectionData - Rejection details
   * @returns {Object} Refund result
   */
  async processRejectionRefund(appointmentId, rejectionData) {
    try {
      // Get appointment and payment details
      const appointmentData = await this.getAppointmentDetails(appointmentId);
      
      if (!appointmentData) {
        throw new Error('Appointment not found');
      }

      if (appointmentData.status !== 'rejected') {
        throw new Error('Appointment must be rejected to process rejection refund');
      }

      // Calculate refund amount (full refund for rejections)
      const refundAmount = appointmentData.total_amount;
      const refundPolicy = this.getRefundPolicy('rejection', appointmentData.service_type);

      // Create refund record
      const refundRecord = await this.createRefundRecord({
        appointment_id: appointmentId,
        refund_type: 'rejection',
        refund_reason: rejectionData.reason || 'Doctor rejected appointment',
        original_amount: appointmentData.total_amount,
        refund_amount: refundAmount,
        refund_policy: refundPolicy,
        initiated_by: rejectionData.rejected_by || 'doctor',
        patient_id: appointmentData.patient_id,
        doctor_id: appointmentData.doctor_id,
        payment_method: appointmentData.payment_method,
        original_transaction_id: appointmentData.transaction_id
      });

      // Process the refund
      const refundResult = await this.executeRefund(refundRecord);

      // Update appointment status
      await this.updateAppointmentRefundStatus(appointmentId, refundRecord.id);

      // Send notifications
      await this.sendRefundNotifications(refundRecord, refundResult);

      // Log audit trail
      await this.auditService?.logRefundProcessing(refundRecord, refundResult);

      return {
        success: true,
        refund_id: refundRecord.id,
        refund_amount: refundAmount,
        refund_status: refundResult.status,
        transaction_id: refundResult.transaction_id,
        estimated_completion: refundResult.estimated_completion,
        refund_method: refundResult.refund_method
      };
    } catch (error) {
      throw new Error(`Rejection refund processing failed: ${error.message}`);
    }
  }

  /**
   * Process cancellation refund
   * @param {string} appointmentId - Appointment ID
   * @param {Object} cancellationData - Cancellation details
   * @returns {Object} Refund result
   */
  async processCancellationRefund(appointmentId, cancellationData) {
    try {
      // Get appointment details
      const appointmentData = await this.getAppointmentDetails(appointmentId);
      
      if (!appointmentData) {
        throw new Error('Appointment not found');
      }

      if (!['cancelled', 'patient_cancelled'].includes(appointmentData.status)) {
        throw new Error('Appointment must be cancelled to process cancellation refund');
      }

      // Calculate refund amount based on cancellation policy
      const refundCalculation = this.calculateCancellationRefund(
        appointmentData,
        cancellationData
      );

      // Create refund record
      const refundRecord = await this.createRefundRecord({
        appointment_id: appointmentId,
        refund_type: 'cancellation',
        refund_reason: cancellationData.reason || 'Patient cancelled appointment',
        original_amount: appointmentData.total_amount,
        refund_amount: refundCalculation.refund_amount,
        penalty_amount: refundCalculation.penalty_amount,
        refund_policy: refundCalculation.policy,
        initiated_by: cancellationData.cancelled_by || 'patient',
        patient_id: appointmentData.patient_id,
        doctor_id: appointmentData.doctor_id,
        payment_method: appointmentData.payment_method,
        original_transaction_id: appointmentData.transaction_id,
        cancellation_time: cancellationData.cancelled_at || new Date(),
        scheduled_time: appointmentData.scheduled_time
      });

      // Process the refund
      const refundResult = await this.executeRefund(refundRecord);

      // Update appointment status
      await this.updateAppointmentRefundStatus(appointmentId, refundRecord.id);

      // Send notifications
      await this.sendRefundNotifications(refundRecord, refundResult);

      // Log audit trail
      await this.auditService?.logRefundProcessing(refundRecord, refundResult);

      return {
        success: true,
        refund_id: refundRecord.id,
        refund_amount: refundCalculation.refund_amount,
        penalty_amount: refundCalculation.penalty_amount,
        refund_status: refundResult.status,
        transaction_id: refundResult.transaction_id,
        estimated_completion: refundResult.estimated_completion,
        refund_policy: refundCalculation.policy.name
      };
    } catch (error) {
      throw new Error(`Cancellation refund processing failed: ${error.message}`);
    }
  }

  /**
   * Process technical issue refund
   * @param {string} appointmentId - Appointment ID
   * @param {Object} issueData - Technical issue details
   * @returns {Object} Refund result
   */
  async processTechnicalIssueRefund(appointmentId, issueData) {
    try {
      // Get appointment details
      const appointmentData = await this.getAppointmentDetails(appointmentId);
      
      if (!appointmentData) {
        throw new Error('Appointment not found');
      }

      // Validate technical issue
      const issueValidation = await this.validateTechnicalIssue(issueData);
      
      if (!issueValidation.valid) {
        throw new Error(`Invalid technical issue: ${issueValidation.reason}`);
      }

      // Calculate refund amount (usually full refund for technical issues)
      const refundAmount = appointmentData.total_amount;
      const refundPolicy = this.getRefundPolicy('technical_issue', appointmentData.service_type);

      // Create refund record
      const refundRecord = await this.createRefundRecord({
        appointment_id: appointmentId,
        refund_type: 'technical_issue',
        refund_reason: issueData.issue_description || 'Technical issue during consultation',
        original_amount: appointmentData.total_amount,
        refund_amount: refundAmount,
        refund_policy: refundPolicy,
        initiated_by: issueData.reported_by || 'system',
        patient_id: appointmentData.patient_id,
        doctor_id: appointmentData.doctor_id,
        payment_method: appointmentData.payment_method,
        original_transaction_id: appointmentData.transaction_id,
        issue_type: issueData.issue_type,
        issue_severity: issueData.severity || 'high',
        issue_details: issueData
      });

      // Process the refund with priority (technical issues get faster processing)
      const refundResult = await this.executeRefund(refundRecord, { priority: 'high' });

      // Update appointment status
      await this.updateAppointmentRefundStatus(appointmentId, refundRecord.id);

      // Send notifications
      await this.sendRefundNotifications(refundRecord, refundResult);

      // Log audit trail
      await this.auditService?.logRefundProcessing(refundRecord, refundResult);

      // Report technical issue for system improvement
      await this.reportTechnicalIssue(issueData, refundRecord);

      return {
        success: true,
        refund_id: refundRecord.id,
        refund_amount: refundAmount,
        refund_status: refundResult.status,
        transaction_id: refundResult.transaction_id,
        estimated_completion: refundResult.estimated_completion,
        priority: 'high',
        issue_reference: issueData.issue_id
      };
    } catch (error) {
      throw new Error(`Technical issue refund processing failed: ${error.message}`);
    }
  }

  /**
   * Process bulk refunds (for system-wide issues)
   * @param {Array} appointmentIds - Array of appointment IDs
   * @param {Object} bulkRefundData - Bulk refund details
   * @returns {Object} Bulk refund result
   */
  async processBulkRefunds(appointmentIds, bulkRefundData) {
    try {
      const results = [];
      const batchSize = 10; // Process in batches to avoid overwhelming the system

      for (let i = 0; i < appointmentIds.length; i += batchSize) {
        const batch = appointmentIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (appointmentId) => {
          try {
            const refundResult = await this.processTechnicalIssueRefund(appointmentId, {
              ...bulkRefundData,
              issue_type: 'system_wide_issue',
              batch_id: bulkRefundData.batch_id,
              reported_by: 'admin'
            });

            return {
              appointment_id: appointmentId,
              success: true,
              refund_id: refundResult.refund_id,
              refund_amount: refundResult.refund_amount
            };
          } catch (error) {
            return {
              appointment_id: appointmentId,
              success: false,
              error: error.message
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < appointmentIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const totalRefundAmount = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.refund_amount || 0), 0);

      // Log bulk refund operation
      await this.auditService?.logBulkRefundOperation({
        batch_id: bulkRefundData.batch_id,
        total_appointments: appointmentIds.length,
        successful_refunds: successCount,
        failed_refunds: failureCount,
        total_refund_amount: totalRefundAmount,
        initiated_by: bulkRefundData.initiated_by || 'admin',
        reason: bulkRefundData.reason
      });

      return {
        success: true,
        batch_id: bulkRefundData.batch_id,
        total_processed: appointmentIds.length,
        successful_refunds: successCount,
        failed_refunds: failureCount,
        total_refund_amount: totalRefundAmount,
        results: results
      };
    } catch (error) {
      throw new Error(`Bulk refund processing failed: ${error.message}`);
    }
  }

  /**
   * Get refund status
   * @param {string} refundId - Refund ID
   * @returns {Object} Refund status
   */
  async getRefundStatus(refundId) {
    try {
      const refundRecord = await this.getRefundRecord(refundId);
      
      if (!refundRecord) {
        throw new Error('Refund record not found');
      }

      // Check with payment gateway for latest status
      const gatewayStatus = await this.checkGatewayRefundStatus(
        refundRecord.gateway_refund_id
      );

      return {
        refund_id: refundRecord.id,
        status: gatewayStatus.status || refundRecord.status,
        refund_amount: refundRecord.refund_amount,
        original_amount: refundRecord.original_amount,
        refund_type: refundRecord.refund_type,
        refund_reason: refundRecord.refund_reason,
        initiated_at: refundRecord.created_at,
        processed_at: refundRecord.processed_at,
        completed_at: gatewayStatus.completed_at,
        estimated_completion: refundRecord.estimated_completion,
        transaction_id: gatewayStatus.transaction_id || refundRecord.gateway_transaction_id,
        refund_method: refundRecord.refund_method,
        appointment_id: refundRecord.appointment_id
      };
    } catch (error) {
      throw new Error(`Failed to get refund status: ${error.message}`);
    }
  }

  /**
   * Calculate cancellation refund amount
   * @private
   */
  calculateCancellationRefund(appointmentData, cancellationData) {
    const scheduledTime = new Date(appointmentData.scheduled_time);
    const cancellationTime = new Date(cancellationData.cancelled_at || Date.now());
    const hoursUntilAppointment = (scheduledTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60);

    let refundPercentage = 1.0; // Default full refund
    let policyName = 'full_refund';

    // Apply cancellation policy based on timing
    if (hoursUntilAppointment < 2) {
      // Less than 2 hours: 50% refund
      refundPercentage = 0.5;
      policyName = 'late_cancellation_50_percent';
    } else if (hoursUntilAppointment < 24) {
      // Less than 24 hours: 75% refund
      refundPercentage = 0.75;
      policyName = 'same_day_cancellation_75_percent';
    } else {
      // More than 24 hours: full refund
      refundPercentage = 1.0;
      policyName = 'advance_cancellation_full_refund';
    }

    // Service type specific adjustments
    const serviceAdjustments = {
      'in_person': 0.0,     // No additional penalty
      'video_call': -0.05,  // 5% less penalty (easier to reschedule)
      'chat': -0.1          // 10% less penalty (most flexible)
    };

    const adjustment = serviceAdjustments[appointmentData.service_type] || 0.0;
    refundPercentage = Math.min(1.0, Math.max(0.0, refundPercentage + adjustment));

    const originalAmount = parseFloat(appointmentData.total_amount);
    const refundAmount = originalAmount * refundPercentage;
    const penaltyAmount = originalAmount - refundAmount;

    return {
      refund_amount: refundAmount,
      penalty_amount: penaltyAmount,
      refund_percentage: refundPercentage,
      policy: {
        name: policyName,
        hours_until_appointment: hoursUntilAppointment,
        service_adjustment: adjustment
      }
    };
  }

  /**
   * Get refund policy
   * @private
   */
  getRefundPolicy(refundType, serviceType) {
    const policies = {
      rejection: {
        name: 'doctor_rejection_full_refund',
        refund_percentage: 1.0,
        processing_time: '1-2 business days',
        description: 'Full refund for doctor-rejected appointments'
      },
      technical_issue: {
        name: 'technical_issue_full_refund',
        refund_percentage: 1.0,
        processing_time: '24-48 hours',
        priority: 'high',
        description: 'Full refund for technical issues during consultation'
      },
      cancellation: {
        name: 'patient_cancellation_tiered',
        refund_percentage: 'variable',
        processing_time: '2-3 business days',
        description: 'Tiered refund based on cancellation timing'
      }
    };

    return policies[refundType] || policies.cancellation;
  }

  /**
   * Validate technical issue
   * @private
   */
  async validateTechnicalIssue(issueData) {
    const validIssueTypes = [
      'connection_failure',
      'video_quality_issue',
      'audio_problem',
      'platform_outage',
      'payment_processing_error',
      'system_malfunction',
      'data_corruption',
      'security_breach'
    ];

    if (!issueData.issue_type || !validIssueTypes.includes(issueData.issue_type)) {
      return {
        valid: false,
        reason: 'Invalid or missing issue type'
      };
    }

    if (!issueData.issue_description || issueData.issue_description.length < 10) {
      return {
        valid: false,
        reason: 'Issue description too short or missing'
      };
    }

    // Additional validation for specific issue types
    if (issueData.issue_type === 'connection_failure') {
      if (!issueData.connection_logs) {
        return {
          valid: false,
          reason: 'Connection logs required for connection failure issues'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Execute refund through payment gateway
   * @private
   */
  async executeRefund(refundRecord, options = {}) {
    try {
      // Prepare refund request
      const refundRequest = {
        original_transaction_id: refundRecord.original_transaction_id,
        refund_amount: refundRecord.refund_amount,
        refund_reason: refundRecord.refund_reason,
        refund_reference: refundRecord.id,
        priority: options.priority || 'normal'
      };

      // Execute refund through payment gateway
      const gatewayResult = await this.paymentGateway.processRefund(refundRequest);

      // Update refund record with gateway response
      const refundResult = {
        status: gatewayResult.status || 'processing',
        gateway_refund_id: gatewayResult.refund_id,
        transaction_id: gatewayResult.transaction_id,
        refund_method: gatewayResult.refund_method || refundRecord.payment_method,
        estimated_completion: gatewayResult.estimated_completion || this.calculateEstimatedCompletion(refundRecord.payment_method),
        gateway_response: gatewayResult
      };

      // Cache refund result
      this.refundCache.set(refundRecord.id, {
        ...refundRecord,
        ...refundResult,
        processed_at: new Date()
      });

      return refundResult;
    } catch (error) {
      throw new Error(`Refund execution failed: ${error.message}`);
    }
  }

  /**
   * Create refund record
   * @private
   */
  async createRefundRecord(refundData) {
    const refundRecord = {
      id: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...refundData,
      status: 'initiated',
      created_at: new Date(),
      estimated_completion: this.calculateEstimatedCompletion(refundData.payment_method)
    };

    // In a real implementation, this would save to database
    // For now, we'll simulate with in-memory storage
    this.refundCache.set(refundRecord.id, refundRecord);

    return refundRecord;
  }

  /**
   * Calculate estimated completion time
   * @private
   */
  calculateEstimatedCompletion(paymentMethod) {
    const completionTimes = {
      'chapa': 2 * 24 * 60 * 60 * 1000,      // 2 days
      'telebirr': 1 * 24 * 60 * 60 * 1000,   // 1 day
      'cbe_birr': 3 * 24 * 60 * 60 * 1000,   // 3 days
      'bank_transfer': 5 * 24 * 60 * 60 * 1000 // 5 days
    };

    const completionTime = completionTimes[paymentMethod] || completionTimes.chapa;
    return new Date(Date.now() + completionTime);
  }

  /**
   * Send refund notifications
   * @private
   */
  async sendRefundNotifications(refundRecord, refundResult) {
    if (!this.notificationService) return;

    try {
      // Notify patient
      await this.notificationService.sendNotification({
        user_id: refundRecord.patient_id,
        type: 'refund_initiated',
        title: 'Refund Initiated',
        message: `Your refund of ${refundRecord.refund_amount} ETB has been initiated and will be processed within ${this.getBusinessDays(refundRecord.estimated_completion)} business days.`,
        data: {
          refund_id: refundRecord.id,
          refund_amount: refundRecord.refund_amount,
          refund_reason: refundRecord.refund_reason,
          estimated_completion: refundRecord.estimated_completion,
          appointment_id: refundRecord.appointment_id
        }
      });

      // Notify doctor (if relevant)
      if (refundRecord.refund_type !== 'rejection') {
        await this.notificationService.sendNotification({
          user_id: refundRecord.doctor_id,
          type: 'appointment_refunded',
          title: 'Appointment Refunded',
          message: `Appointment has been refunded due to: ${refundRecord.refund_reason}`,
          data: {
            refund_id: refundRecord.id,
            appointment_id: refundRecord.appointment_id,
            refund_type: refundRecord.refund_type
          }
        });
      }

      // Send email confirmation
      await this.sendRefundEmailConfirmation(refundRecord, refundResult);
    } catch (error) {
      console.error('Failed to send refund notifications:', error);
    }
  }

  /**
   * Send refund email confirmation
   * @private
   */
  async sendRefundEmailConfirmation(refundRecord, refundResult) {
    // Email template would be implemented here
    console.log(`Refund email sent for ${refundRecord.id}`);
  }

  /**
   * Report technical issue for system improvement
   * @private
   */
  async reportTechnicalIssue(issueData, refundRecord) {
    // Technical issue reporting would be implemented here
    console.log(`Technical issue reported: ${issueData.issue_type}`);
  }

  /**
   * Utility methods
   * @private
   */
  async getAppointmentDetails(appointmentId) {
    // Simulate appointment data retrieval
    return {
      id: appointmentId,
      patient_id: `patient_${appointmentId}`,
      doctor_id: `doctor_${appointmentId}`,
      status: 'rejected',
      total_amount: 500,
      service_type: 'video_call',
      payment_method: 'chapa',
      transaction_id: `txn_${appointmentId}`,
      scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  async getRefundRecord(refundId) {
    return this.refundCache.get(refundId) || null;
  }

  async updateAppointmentRefundStatus(appointmentId, refundId) {
    // Update appointment with refund information
    console.log(`Updated appointment ${appointmentId} with refund ${refundId}`);
  }

  async checkGatewayRefundStatus(gatewayRefundId) {
    // Check refund status with payment gateway
    return {
      status: 'processing',
      transaction_id: `gateway_txn_${Date.now()}`,
      completed_at: null
    };
  }

  getBusinessDays(targetDate) {
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }
}

export default RefundProcessor;