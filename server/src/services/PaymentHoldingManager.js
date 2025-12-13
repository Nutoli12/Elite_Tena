/**
 * Payment Holding and Release Manager
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 4.3: Payment holding and release logic**
 * **Requirements: 5.4, 5.5, 6.2**
 * 
 * Manages system wallet payment holding, consultation completion triggers,
 * payment release to doctors, and platform fee deduction.
 */

import { Op } from 'sequelize';

export class PaymentHoldingManager {
  constructor(models, notificationService, auditService) {
    this.models = models;
    this.notificationService = notificationService;
    this.auditService = auditService;
    this.holdingCache = new Map();
    this.releaseTimeouts = new Map();
  }

  /**
   * Hold payment in system wallet
   * @param {Object} paymentData - Payment information
   * @param {Object} appointmentData - Appointment details
   * @returns {Object} Holding result
   */
  async holdPayment(paymentData, appointmentData) {
    try {
      // Create payment holding record
      const holdingRecord = await this.createHoldingRecord(paymentData, appointmentData);

      // Set up automatic release conditions
      await this.setupReleaseConditions(holdingRecord);

      // Cache holding information
      this.cacheHoldingInfo(holdingRecord);

      // Log holding action
      await this.auditService?.logPaymentHolding(holdingRecord);

      return {
        success: true,
        holding_id: holdingRecord.id,
        held_amount: holdingRecord.held_amount,
        platform_fee: holdingRecord.platform_fee,
        net_doctor_amount: holdingRecord.net_doctor_amount,
        holding_status: holdingRecord.status,
        release_conditions: holdingRecord.release_conditions,
        estimated_release_time: holdingRecord.estimated_release_time,
        held_at: holdingRecord.held_at
      };
    } catch (error) {
      throw new Error(`Payment holding failed: ${error.message}`);
    }
  }

  /**
   * Release payment to doctor
   * @param {string} holdingId - Holding record ID
   * @param {Object} releaseData - Release trigger data
   * @returns {Object} Release result
   */
  async releasePayment(holdingId, releaseData) {
    try {
      // Get holding record
      const holdingRecord = await this.getHoldingRecord(holdingId);
      
      if (!holdingRecord) {
        throw new Error('Holding record not found');
      }

      if (holdingRecord.status !== 'held') {
        throw new Error(`Cannot release payment with status: ${holdingRecord.status}`);
      }

      // Validate release conditions
      const conditionsValid = await this.validateReleaseConditions(
        holdingRecord, 
        releaseData
      );

      if (!conditionsValid.valid) {
        throw new Error(`Release conditions not met: ${conditionsValid.reason}`);
      }

      // Calculate final amounts
      const releaseAmounts = await this.calculateReleaseAmounts(holdingRecord);

      // Execute payment release
      const releaseResult = await this.executePaymentRelease(
        holdingRecord,
        releaseAmounts,
        releaseData
      );

      // Update holding record
      await this.updateHoldingStatus(holdingRecord, 'released', releaseResult);

      // Clear cache and timeouts
      this.clearHoldingCache(holdingId);

      // Send notifications
      await this.sendReleaseNotifications(holdingRecord, releaseResult);

      // Log release action
      await this.auditService?.logPaymentRelease(holdingRecord, releaseResult);

      return {
        success: true,
        release_id: releaseResult.release_id,
        doctor_amount: releaseAmounts.doctor_amount,
        platform_fee: releaseAmounts.platform_fee,
        release_method: releaseResult.release_method,
        transaction_id: releaseResult.transaction_id,
        released_at: releaseResult.released_at,
        release_trigger: releaseData.trigger_type
      };
    } catch (error) {
      throw new Error(`Payment release failed: ${error.message}`);
    }
  }

  /**
   * Process consultation completion trigger
   * @param {string} appointmentId - Appointment ID
   * @param {Object} completionData - Completion details
   * @returns {Object} Processing result
   */
  async processConsultationCompletion(appointmentId, completionData) {
    try {
      // Find holding records for appointment
      const holdingRecords = await this.findHoldingsByAppointment(appointmentId);

      if (holdingRecords.length === 0) {
        return {
          success: true,
          message: 'No payments held for this appointment',
          processed_count: 0
        };
      }

      const releaseResults = [];

      // Process each holding record
      for (const holding of holdingRecords) {
        try {
          const releaseData = {
            trigger_type: 'consultation_completed',
            appointment_id: appointmentId,
            completion_data: completionData,
            triggered_by: completionData.completed_by || 'system',
            triggered_at: new Date()
          };

          const releaseResult = await this.releasePayment(holding.id, releaseData);
          releaseResults.push({
            holding_id: holding.id,
            result: releaseResult
          });
        } catch (error) {
          releaseResults.push({
            holding_id: holding.id,
            error: error.message
          });
        }
      }

      return {
        success: true,
        processed_count: releaseResults.length,
        successful_releases: releaseResults.filter(r => r.result).length,
        failed_releases: releaseResults.filter(r => r.error).length,
        results: releaseResults
      };
    } catch (error) {
      throw new Error(`Consultation completion processing failed: ${error.message}`);
    }
  }

  /**
   * Handle payment refund for cancelled/rejected appointments
   * @param {string} holdingId - Holding record ID
   * @param {Object} refundData - Refund details
   * @returns {Object} Refund result
   */
  async processRefund(holdingId, refundData) {
    try {
      // Get holding record
      const holdingRecord = await this.getHoldingRecord(holdingId);
      
      if (!holdingRecord) {
        throw new Error('Holding record not found');
      }

      if (!['held', 'pending_release'].includes(holdingRecord.status)) {
        throw new Error(`Cannot refund payment with status: ${holdingRecord.status}`);
      }

      // Calculate refund amount (full amount for cancellations)
      const refundAmount = holdingRecord.held_amount;

      // Execute refund
      const refundResult = await this.executeRefund(
        holdingRecord,
        refundAmount,
        refundData
      );

      // Update holding record
      await this.updateHoldingStatus(holdingRecord, 'refunded', refundResult);

      // Clear cache and timeouts
      this.clearHoldingCache(holdingId);

      // Send notifications
      await this.sendRefundNotifications(holdingRecord, refundResult);

      // Log refund action
      await this.auditService?.logPaymentRefund(holdingRecord, refundResult);

      return {
        success: true,
        refund_id: refundResult.refund_id,
        refund_amount: refundAmount,
        refund_method: refundResult.refund_method,
        transaction_id: refundResult.transaction_id,
        refunded_at: refundResult.refunded_at,
        refund_reason: refundData.reason
      };
    } catch (error) {
      throw new Error(`Payment refund failed: ${error.message}`);
    }
  }

  /**
   * Get payment holding status
   * @param {string} holdingId - Holding record ID
   * @returns {Object} Holding status
   */
  async getHoldingStatus(holdingId) {
    try {
      const holdingRecord = await this.getHoldingRecord(holdingId);
      
      if (!holdingRecord) {
        throw new Error('Holding record not found');
      }

      return {
        holding_id: holdingRecord.id,
        status: holdingRecord.status,
        held_amount: holdingRecord.held_amount,
        platform_fee: holdingRecord.platform_fee,
        net_doctor_amount: holdingRecord.net_doctor_amount,
        held_at: holdingRecord.held_at,
        release_conditions: holdingRecord.release_conditions,
        estimated_release_time: holdingRecord.estimated_release_time,
        appointment_id: holdingRecord.appointment_id,
        doctor_id: holdingRecord.doctor_id,
        patient_id: holdingRecord.patient_id
      };
    } catch (error) {
      throw new Error(`Failed to get holding status: ${error.message}`);
    }
  }

  /**
   * Create payment holding record
   * @private
   */
  async createHoldingRecord(paymentData, appointmentData) {
    const platformFee = this.calculatePlatformFee(
      paymentData.amount,
      appointmentData.service_type
    );

    const netDoctorAmount = parseFloat(paymentData.amount) - platformFee;

    const holdingRecord = {
      id: `holding_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      appointment_id: appointmentData.id,
      patient_id: appointmentData.patient_id,
      doctor_id: appointmentData.doctor_id,
      service_type: appointmentData.service_type,
      held_amount: parseFloat(paymentData.amount),
      platform_fee: platformFee,
      net_doctor_amount: netDoctorAmount,
      status: 'held',
      held_at: new Date(),
      release_conditions: this.generateReleaseConditions(appointmentData.service_type),
      estimated_release_time: this.calculateEstimatedReleaseTime(appointmentData),
      payment_method: paymentData.payment_method || 'chapa',
      original_transaction_id: paymentData.transaction_id
    };

    // In a real implementation, this would save to database
    // For now, we'll simulate with in-memory storage
    this.holdingCache.set(holdingRecord.id, holdingRecord);

    return holdingRecord;
  }

  /**
   * Setup automatic release conditions
   * @private
   */
  async setupReleaseConditions(holdingRecord) {
    // Set up timeout for automatic release (24 hours after consultation)
    const releaseTimeout = setTimeout(async () => {
      try {
        await this.processAutomaticRelease(holdingRecord.id);
      } catch (error) {
        console.error(`Automatic release failed for ${holdingRecord.id}:`, error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.releaseTimeouts.set(holdingRecord.id, releaseTimeout);
  }

  /**
   * Validate release conditions
   * @private
   */
  async validateReleaseConditions(holdingRecord, releaseData) {
    const conditions = holdingRecord.release_conditions;

    // Check consultation completion
    if (conditions.includes('consultation_completed')) {
      if (releaseData.trigger_type !== 'consultation_completed') {
        return {
          valid: false,
          reason: 'Consultation not marked as completed'
        };
      }
    }

    // Check dispute period (24 hours)
    if (conditions.includes('no_disputes_24h')) {
      const disputeCheckResult = await this.checkForDisputes(
        holdingRecord.appointment_id,
        24 * 60 * 60 * 1000 // 24 hours in milliseconds
      );

      if (!disputeCheckResult.clear) {
        return {
          valid: false,
          reason: `Active disputes found: ${disputeCheckResult.dispute_count}`
        };
      }
    }

    // Check doctor confirmation
    if (conditions.includes('doctor_confirmation')) {
      if (!releaseData.completion_data?.doctor_confirmed) {
        return {
          valid: false,
          reason: 'Doctor confirmation required'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Calculate release amounts
   * @private
   */
  async calculateReleaseAmounts(holdingRecord) {
    return {
      doctor_amount: holdingRecord.net_doctor_amount,
      platform_fee: holdingRecord.platform_fee,
      total_amount: holdingRecord.held_amount
    };
  }

  /**
   * Execute payment release
   * @private
   */
  async executePaymentRelease(holdingRecord, releaseAmounts, releaseData) {
    // Simulate payment release to doctor
    const releaseResult = {
      release_id: `release_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      release_method: 'direct_transfer',
      transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      released_at: new Date(),
      doctor_account: `wallet_${holdingRecord.doctor_id}`,
      release_amount: releaseAmounts.doctor_amount,
      platform_fee_collected: releaseAmounts.platform_fee
    };

    return releaseResult;
  }

  /**
   * Execute refund
   * @private
   */
  async executeRefund(holdingRecord, refundAmount, refundData) {
    // Simulate refund processing
    const refundResult = {
      refund_id: `refund_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      refund_method: holdingRecord.payment_method,
      transaction_id: `refund_txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      refunded_at: new Date(),
      refund_amount: refundAmount,
      refund_reason: refundData.reason,
      original_transaction: holdingRecord.original_transaction_id
    };

    return refundResult;
  }

  /**
   * Calculate platform fee
   * @private
   */
  calculatePlatformFee(amount, serviceType) {
    const feeRates = {
      'in_person': 0.05,    // 5%
      'video_call': 0.03,   // 3%
      'chat': 0.02          // 2%
    };

    const feeRate = feeRates[serviceType] || 0.05;
    const fee = parseFloat(amount) * feeRate;
    
    // Minimum fee of 10 ETB, maximum of 200 ETB
    return Math.max(10, Math.min(200, fee));
  }

  /**
   * Generate release conditions
   * @private
   */
  generateReleaseConditions(serviceType) {
    const baseConditions = [
      'consultation_completed',
      'no_disputes_24h',
      'doctor_confirmation'
    ];

    const serviceSpecificConditions = {
      'video_call': ['video_session_ended'],
      'chat': ['chat_session_completed'],
      'in_person': ['physical_consultation_confirmed']
    };

    return [...baseConditions, ...(serviceSpecificConditions[serviceType] || [])];
  }

  /**
   * Calculate estimated release time
   * @private
   */
  calculateEstimatedReleaseTime(appointmentData) {
    const appointmentTime = new Date(appointmentData.scheduled_time);
    const estimatedDuration = this.getServiceDuration(appointmentData.service_type);
    
    // Add consultation duration + 24 hour dispute period
    const releaseTime = new Date(appointmentTime.getTime() + estimatedDuration + (24 * 60 * 60 * 1000));
    
    return releaseTime;
  }

  /**
   * Get service duration in milliseconds
   * @private
   */
  getServiceDuration(serviceType) {
    const durations = {
      'in_person': 60 * 60 * 1000,    // 1 hour
      'video_call': 45 * 60 * 1000,   // 45 minutes
      'chat': 30 * 60 * 1000          // 30 minutes
    };

    return durations[serviceType] || 60 * 60 * 1000;
  }

  /**
   * Check for disputes
   * @private
   */
  async checkForDisputes(appointmentId, timeWindow) {
    // Simulate dispute checking
    // In real implementation, this would query dispute records
    return {
      clear: true,
      dispute_count: 0,
      checked_at: new Date()
    };
  }

  /**
   * Process automatic release
   * @private
   */
  async processAutomaticRelease(holdingId) {
    const releaseData = {
      trigger_type: 'automatic_timeout',
      triggered_by: 'system',
      triggered_at: new Date(),
      completion_data: {
        doctor_confirmed: true, // Assume confirmed after timeout
        auto_release: true
      }
    };

    return await this.releasePayment(holdingId, releaseData);
  }

  /**
   * Utility methods
   * @private
   */
  async getHoldingRecord(holdingId) {
    return this.holdingCache.get(holdingId) || null;
  }

  async findHoldingsByAppointment(appointmentId) {
    const holdings = [];
    for (const [id, record] of this.holdingCache.entries()) {
      if (record.appointment_id === appointmentId && record.status === 'held') {
        holdings.push(record);
      }
    }
    return holdings;
  }

  async updateHoldingStatus(holdingRecord, status, result) {
    holdingRecord.status = status;
    holdingRecord.updated_at = new Date();
    if (result) {
      holdingRecord.release_result = result;
    }
    this.holdingCache.set(holdingRecord.id, holdingRecord);
  }

  cacheHoldingInfo(holdingRecord) {
    this.holdingCache.set(holdingRecord.id, holdingRecord);
  }

  clearHoldingCache(holdingId) {
    this.holdingCache.delete(holdingId);
    
    const timeout = this.releaseTimeouts.get(holdingId);
    if (timeout) {
      clearTimeout(timeout);
      this.releaseTimeouts.delete(holdingId);
    }
  }

  async sendReleaseNotifications(holdingRecord, releaseResult) {
    if (!this.notificationService) return;

    try {
      // Notify doctor
      await this.notificationService.sendNotification({
        user_id: holdingRecord.doctor_id,
        type: 'payment_released',
        title: 'Payment Released',
        message: `Payment of ${holdingRecord.net_doctor_amount} ETB has been released to your account`,
        data: {
          holding_id: holdingRecord.id,
          amount: holdingRecord.net_doctor_amount,
          transaction_id: releaseResult.transaction_id
        }
      });

      // Notify patient
      await this.notificationService.sendNotification({
        user_id: holdingRecord.patient_id,
        type: 'payment_processed',
        title: 'Payment Processed',
        message: 'Your payment has been processed and released to the doctor',
        data: {
          holding_id: holdingRecord.id,
          appointment_id: holdingRecord.appointment_id
        }
      });
    } catch (error) {
      console.error('Failed to send release notifications:', error);
    }
  }

  async sendRefundNotifications(holdingRecord, refundResult) {
    if (!this.notificationService) return;

    try {
      // Notify patient
      await this.notificationService.sendNotification({
        user_id: holdingRecord.patient_id,
        type: 'payment_refunded',
        title: 'Payment Refunded',
        message: `Your payment of ${refundResult.refund_amount} ETB has been refunded`,
        data: {
          refund_id: refundResult.refund_id,
          amount: refundResult.refund_amount,
          transaction_id: refundResult.transaction_id
        }
      });

      // Notify doctor
      await this.notificationService.sendNotification({
        user_id: holdingRecord.doctor_id,
        type: 'appointment_refunded',
        title: 'Appointment Refunded',
        message: 'Patient payment has been refunded due to appointment cancellation',
        data: {
          appointment_id: holdingRecord.appointment_id,
          refund_reason: refundResult.refund_reason
        }
      });
    } catch (error) {
      console.error('Failed to send refund notifications:', error);
    }
  }
}

export default PaymentHoldingManager;