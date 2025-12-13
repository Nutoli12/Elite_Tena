/**
 * Payment Router Service for Enhanced Two-Tier Pricing System
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Requirements: 6.1, 6.2, 7.1, 7.2**
 * 
 * This service handles all payment routing operations including:
 * - Payment destination routing logic
 * - Direct doctor wallet transfers
 * - System wallet payment holding
 * - Payment status tracking
 */

import { Op } from 'sequelize';
import sequelize from '../config/database.js';

class PaymentRouter {
  constructor() {
    this.routingCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes for routing decisions
    this.retryAttempts = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Route payment based on approval decision and wallet configuration
   * @param {Object} paymentData - Payment information
   * @param {Object} approvalDecision - Approval decision from auto/manual approval
   * @returns {Object} Payment routing result
   */
  async routePayment(paymentData, approvalDecision) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        appointment_id,
        patient_id,
        doctor_id,
        service_type,
        amount,
        payment_method = 'chapa'
      } = paymentData;

      // Validate input data
      await this.validatePaymentData(paymentData);

      // Determine routing destination
      const routingDecision = await this.determineRoutingDestination(
        paymentData,
        approvalDecision
      );

      // Create payment transaction record
      const paymentTransaction = await this.createPaymentTransaction(
        paymentData,
        approvalDecision,
        routingDecision,
        transaction
      );

      // Execute payment routing
      const routingResult = await this.executePaymentRouting(
        paymentTransaction,
        routingDecision,
        transaction
      );

      // Update payment status
      await this.updatePaymentStatus(
        paymentTransaction,
        routingResult,
        transaction
      );

      // Send routing notifications
      await this.sendRoutingNotifications(
        paymentTransaction,
        routingResult,
        transaction
      );

      await transaction.commit();

      return {
        success: true,
        payment_transaction_id: paymentTransaction.id,
        routing_destination: routingDecision.destination,
        routing_method: routingDecision.method,
        processing_result: routingResult,
        estimated_completion: this.getEstimatedCompletion(routingDecision.destination),
        next_steps: this.getRoutingNextSteps(routingDecision)
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error routing payment:', error);
      throw error;
    }
  }

  /**
   * Process direct doctor wallet transfer
   * @param {Object} paymentTransaction - Payment transaction record
   * @param {Object} walletConfig - Doctor's wallet configuration
   * @returns {Object} Transfer result
   */
  async processDoctorWalletTransfer(paymentTransaction, walletConfig) {
    try {
      // Validate wallet configuration
      if (!walletConfig || !walletConfig.is_verified) {
        throw new Error('Doctor wallet not configured or verified');
      }

      // Get preferred payment method
      const paymentMethod = walletConfig.getPreferredPaymentMethod();
      if (!paymentMethod) {
        throw new Error('No valid payment method configured');
      }

      // Calculate platform fee (if applicable)
      const platformFee = this.calculatePlatformFee(
        paymentTransaction.amount,
        paymentTransaction.service_type
      );

      const transferAmount = parseFloat(paymentTransaction.amount) - platformFee;

      // Process transfer via Chapa
      const transferResult = await this.processDirectTransfer({
        amount: transferAmount,
        recipient_account: walletConfig.getAccountIdentifier(paymentMethod),
        payment_method: paymentMethod,
        reference: `premium_payment_${paymentTransaction.id}`,
        description: `Premium ${paymentTransaction.service_type} consultation payment`,
        doctor_id: paymentTransaction.doctor_id,
        appointment_id: paymentTransaction.appointment_id
      });

      return {
        transfer_type: 'direct_doctor_wallet',
        transfer_amount: transferAmount,
        platform_fee: platformFee,
        payment_method: paymentMethod,
        recipient_account: walletConfig.getAccountIdentifier(paymentMethod),
        chapa_transaction_id: transferResult.transaction_id,
        transfer_status: 'completed',
        completed_at: new Date()
      };
    } catch (error) {
      console.error('Error processing doctor wallet transfer:', error);
      throw error;
    }
  }

  /**
   * Process system wallet payment holding
   * @param {Object} paymentTransaction - Payment transaction record
   * @returns {Object} Holding result
   */
  async processSystemWalletHolding(paymentTransaction) {
    try {
      // Hold payment in system escrow
      const holdingResult = {
        holding_type: 'system_escrow',
        held_amount: paymentTransaction.amount,
        platform_fee: 0, // No fee for system wallet holding
        escrow_account: 'system_main_wallet',
        holding_status: 'held',
        held_at: new Date(),
        release_conditions: this.getSystemWalletReleaseConditions(paymentTransaction.service_type)
      };

      // Log holding action
      console.log(`Payment held in system wallet: ${paymentTransaction.amount} ETB for appointment ${paymentTransaction.appointment_id}`);
      
      return holdingResult;
    } catch (error) {
      console.error('Error processing system wallet holding:', error);
      throw error;
    }
  }

  /**
   * Release payment from system wallet to doctor
   * @param {string} paymentTransactionId - Payment transaction ID
   * @param {string} releaseReason - Reason for release
   * @returns {Object} Release result
   */
  async releaseSystemWalletPayment(paymentTransactionId, releaseReason = 'consultation_completed') {
    const transaction = await sequelize.transaction();
    
    try {
      // Get payment transaction
      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      const paymentTransaction = await EnhancedPaymentTransaction.findByPk(paymentTransactionId, {
        transaction
      });

      if (!paymentTransaction) {
        throw new Error('Payment transaction not found');
      }

      if (paymentTransaction.payment_destination !== 'system_wallet') {
        throw new Error('Payment is not held in system wallet');
      }

      if (paymentTransaction.transaction_status !== 'completed') {
        throw new Error('Payment transaction is not in completed status');
      }

      // Get doctor wallet configuration
      const { default: DoctorWalletConfig } = await import('../models/DoctorWalletConfig.js');
      const walletConfig = await DoctorWalletConfig.findOne({
        where: { doctor_id: paymentTransaction.doctor_id, is_active: true },
        transaction
      });

      // Calculate platform fee
      const platformFee = this.calculatePlatformFee(
        paymentTransaction.amount,
        paymentTransaction.service_type
      );

      const releaseAmount = parseFloat(paymentTransaction.amount) - platformFee;

      let releaseResult;
      if (walletConfig && walletConfig.is_verified) {
        // Release to doctor wallet
        releaseResult = await this.processDoctorWalletTransfer(paymentTransaction, walletConfig);
      } else {
        // Keep in system wallet but mark as released
        releaseResult = {
          release_type: 'system_wallet_credit',
          release_amount: releaseAmount,
          platform_fee: platformFee,
          credit_account: 'doctor_system_balance',
          release_status: 'completed',
          released_at: new Date()
        };
      }

      // Update payment transaction
      await paymentTransaction.update({
        transaction_status: 'released',
        completed_at: new Date(),
        processing_fees: platformFee,
        release_reason: releaseReason,
        release_data: releaseResult
      }, { transaction });

      // Send release notifications
      await this.sendReleaseNotifications(paymentTransaction, releaseResult, transaction);

      await transaction.commit();

      return {
        success: true,
        payment_transaction_id: paymentTransactionId,
        release_result: releaseResult,
        release_reason: releaseReason
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error releasing system wallet payment:', error);
      throw error;
    }
  }

  /**
   * Track payment status across all routing methods
   * @param {string} paymentTransactionId - Payment transaction ID
   * @returns {Object} Payment status information
   */
  async trackPaymentStatus(paymentTransactionId) {
    try {
      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      const paymentTransaction = await EnhancedPaymentTransaction.findByPk(paymentTransactionId, {
        include: [
          {
            model: sequelize.models.User,
            as: 'Doctor',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: sequelize.models.User,
            as: 'Patient',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: sequelize.models.Appointment,
            as: 'Appointment',
            attributes: ['id', 'status', 'appointment_date', 'appointment_time']
          }
        ]
      });

      if (!paymentTransaction) {
        throw new Error('Payment transaction not found');
      }

      // Get additional status information
      const statusInfo = await this.getDetailedPaymentStatus(paymentTransaction);

      return {
        payment_transaction_id: paymentTransactionId,
        basic_info: {
          amount: parseFloat(paymentTransaction.amount),
          service_type: paymentTransaction.service_type,
          payment_destination: paymentTransaction.payment_destination,
          approval_method: paymentTransaction.approval_method,
          transaction_status: paymentTransaction.transaction_status
        },
        routing_info: {
          destination: paymentTransaction.payment_destination,
          doctor_wallet_address: paymentTransaction.doctor_wallet_address,
          chapa_transaction_id: paymentTransaction.chapa_transaction_id,
          processing_fees: parseFloat(paymentTransaction.processing_fees || 0)
        },
        timeline: {
          created_at: paymentTransaction.created_at,
          completed_at: paymentTransaction.completed_at,
          processing_duration: this.calculateProcessingDuration(paymentTransaction)
        },
        status_details: statusInfo,
        related_entities: {
          doctor: paymentTransaction.Doctor,
          patient: paymentTransaction.Patient,
          appointment: paymentTransaction.Appointment
        }
      };
    } catch (error) {
      console.error('Error tracking payment status:', error);
      throw error;
    }
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   */
  async validatePaymentData(paymentData) {
    const { appointment_id, patient_id, doctor_id, service_type, amount } = paymentData;

    if (!appointment_id || !patient_id || !doctor_id || !service_type || !amount) {
      throw new Error('Missing required payment data');
    }

    if (!['in_person', 'video_call', 'chat'].includes(service_type)) {
      throw new Error('Invalid service type');
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    // Verify entities exist
    const { default: Appointment } = await import('../models/Appointment.js');
    const { default: User } = await import('../models/User.js');

    const [appointment, doctor, patient] = await Promise.all([
      Appointment.findByPk(appointment_id),
      User.findOne({ where: { id: doctor_id, role: 'doctor', is_active: true } }),
      User.findOne({ where: { id: patient_id, is_active: true } })
    ]);

    if (!appointment) throw new Error('Appointment not found');
    if (!doctor) throw new Error('Doctor not found or inactive');
    if (!patient) throw new Error('Patient not found or inactive');
  }

  /**
   * Determine routing destination based on approval decision
   * @param {Object} paymentData - Payment data
   * @param {Object} approvalDecision - Approval decision
   * @returns {Object} Routing decision
   */
  async determineRoutingDestination(paymentData, approvalDecision) {
    try {
      const { service_type, doctor_id } = paymentData;
      
      // Auto-approved premium services go to doctor wallet
      if (approvalDecision.approval_method === 'auto_approved' && 
          approvalDecision.payment_destination === 'doctor_wallet') {
        
        // Verify wallet capability
        const walletValidation = await this.validateDoctorWallet(doctor_id);
        
        if (walletValidation.capable) {
          return {
            destination: 'doctor_wallet',
            method: 'direct_transfer',
            reason: 'Auto-approved premium service with verified wallet',
            wallet_config: walletValidation.wallet_config,
            estimated_time: '2-5 minutes'
          };
        } else {
          // Fallback to system wallet
          return {
            destination: 'system_wallet',
            method: 'escrow_holding',
            reason: `Wallet validation failed: ${walletValidation.reason}`,
            fallback: true,
            estimated_time: 'Immediate'
          };
        }
      }

      // Manual approvals and standard services go to system wallet
      return {
        destination: 'system_wallet',
        method: 'escrow_holding',
        reason: approvalDecision.approval_method === 'manual_approved' 
          ? 'Manual approval - system wallet holding'
          : 'Standard service - system wallet holding',
        estimated_time: 'Immediate'
      };
    } catch (error) {
      console.error('Error determining routing destination:', error);
      throw error;
    }
  }

  /**
   * Validate doctor wallet configuration
   * @param {string} doctorId - Doctor's user ID
   * @returns {Object} Wallet validation result
   */
  async validateDoctorWallet(doctorId) {
    try {
      const { default: DoctorWalletConfig } = await import('../models/DoctorWalletConfig.js');
      
      const walletConfig = await DoctorWalletConfig.findOne({
        where: { doctor_id: doctorId, is_active: true }
      });

      if (!walletConfig) {
        return {
          capable: false,
          reason: 'No wallet configuration found',
          wallet_config: null
        };
      }

      if (!walletConfig.is_verified) {
        return {
          capable: false,
          reason: 'Wallet configuration not verified',
          wallet_config: walletConfig
        };
      }

      const paymentMethod = walletConfig.getPreferredPaymentMethod();
      if (!paymentMethod) {
        return {
          capable: false,
          reason: 'No valid payment method configured',
          wallet_config: walletConfig
        };
      }

      return {
        capable: true,
        reason: 'Verified wallet with valid payment method',
        wallet_config: walletConfig,
        payment_method: paymentMethod
      };
    } catch (error) {
      console.error('Error validating doctor wallet:', error);
      return {
        capable: false,
        reason: 'Error during wallet validation',
        wallet_config: null
      };
    }
  }

  /**
   * Create payment transaction record
   * @param {Object} paymentData - Payment data
   * @param {Object} approvalDecision - Approval decision
   * @param {Object} routingDecision - Routing decision
   * @param {Object} transaction - Database transaction
   * @returns {Object} Created payment transaction
   */
  async createPaymentTransaction(paymentData, approvalDecision, routingDecision, transaction) {
    try {
      const { default: EnhancedPaymentTransaction } = await import('../models/EnhancedPaymentTransaction.js');
      
      const paymentTransaction = await EnhancedPaymentTransaction.create({
        appointment_id: paymentData.appointment_id,
        patient_id: paymentData.patient_id,
        doctor_id: paymentData.doctor_id,
        service_type: paymentData.service_type,
        amount: paymentData.amount,
        expected_amount: paymentData.expected_amount || paymentData.amount,
        payment_destination: routingDecision.destination,
        approval_method: approvalDecision.approval_method,
        transaction_status: 'processing',
        routing_context: {
          routing_decision: routingDecision,
          approval_context: approvalDecision,
          created_at: new Date()
        }
      }, { transaction });

      return paymentTransaction;
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw error;
    }
  }

  /**
   * Execute payment routing based on decision
   * @param {Object} paymentTransaction - Payment transaction
   * @param {Object} routingDecision - Routing decision
   * @param {Object} transaction - Database transaction
   * @returns {Object} Routing execution result
   */
  async executePaymentRouting(paymentTransaction, routingDecision, transaction) {
    try {
      if (routingDecision.destination === 'doctor_wallet') {
        return await this.processDoctorWalletTransfer(
          paymentTransaction,
          routingDecision.wallet_config
        );
      } else {
        return await this.processSystemWalletHolding(paymentTransaction);
      }
    } catch (error) {
      console.error('Error executing payment routing:', error);
      
      // Fallback to system wallet on routing failure
      if (routingDecision.destination === 'doctor_wallet') {
        console.log('Falling back to system wallet due to routing failure');
        return await this.processSystemWalletHolding(paymentTransaction);
      }
      
      throw error;
    }
  }

  /**
   * Update payment status after routing
   * @param {Object} paymentTransaction - Payment transaction
   * @param {Object} routingResult - Routing execution result
   * @param {Object} transaction - Database transaction
   */
  async updatePaymentStatus(paymentTransaction, routingResult, transaction) {
    try {
      const updateData = {
        transaction_status: routingResult.transfer_status || routingResult.holding_status || 'completed',
        completed_at: routingResult.completed_at || routingResult.held_at || new Date(),
        chapa_transaction_id: routingResult.chapa_transaction_id || null,
        doctor_wallet_address: routingResult.recipient_account || routingResult.escrow_account || null,
        processing_fees: routingResult.platform_fee || 0,
        routing_result: routingResult
      };

      await paymentTransaction.update(updateData, { transaction });
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Process direct transfer via Chapa
   * @param {Object} transferData - Transfer data
   * @returns {Object} Transfer result
   */
  async processDirectTransfer(transferData) {
    try {
      // In a real implementation, this would integrate with Chapa API
      // For now, we'll simulate the transfer
      
      const mockTransactionId = `chapa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        transaction_id: mockTransactionId,
        status: 'completed',
        amount: transferData.amount,
        recipient: transferData.recipient_account,
        reference: transferData.reference,
        processed_at: new Date()
      };
    } catch (error) {
      console.error('Error processing direct transfer:', error);
      throw error;
    }
  }

  /**
   * Calculate platform fee
   * @param {number} amount - Payment amount
   * @param {string} serviceType - Service type
   * @returns {number} Platform fee
   */
  calculatePlatformFee(amount, serviceType) {
    // Platform fee structure
    const feeRates = {
      'in_person': 0.05,    // 5% for in-person
      'video_call': 0.03,   // 3% for video calls
      'chat': 0.02          // 2% for chat
    };

    const feeRate = feeRates[serviceType] || 0.05;
    const fee = parseFloat(amount) * feeRate;
    
    // Minimum fee of 10 ETB, maximum of 200 ETB
    return Math.max(10, Math.min(200, fee));
  }

  /**
   * Get system wallet release conditions
   * @param {string} serviceType - Service type
   * @returns {Array} Release conditions
   */
  getSystemWalletReleaseConditions(serviceType) {
    const baseConditions = [
      'Consultation completed successfully',
      'No disputes raised within 24 hours',
      'Doctor confirms service delivery'
    ];

    const serviceSpecificConditions = {
      'video_call': ['Video call session ended'],
      'chat': ['Chat session completed'],
      'in_person': ['In-person consultation confirmed']
    };

    return [...baseConditions, ...(serviceSpecificConditions[serviceType] || [])];
  }

  /**
   * Get estimated completion time
   * @param {string} destination - Payment destination
   * @returns {string} Estimated completion time
   */
  getEstimatedCompletion(destination) {
    const completionTimes = {
      'doctor_wallet': '2-5 minutes',
      'system_wallet': 'Immediate'
    };

    return completionTimes[destination] || 'Unknown';
  }

  /**
   * Get routing next steps
   * @param {Object} routingDecision - Routing decision
   * @returns {Array} Next steps
   */
  getRoutingNextSteps(routingDecision) {
    if (routingDecision.destination === 'doctor_wallet') {
      return [
        'Payment is being transferred directly to doctor\'s wallet',
        'Transfer typically completes within 2-5 minutes',
        'You will receive confirmation once transfer is complete',
        'Doctor will be notified of successful payment'
      ];
    } else {
      return [
        'Payment is held securely in system wallet',
        'Funds will be released to doctor after consultation',
        'Release typically occurs within 24 hours of completion',
        'You will be notified of any status changes'
      ];
    }
  }

  /**
   * Send routing notifications
   * @param {Object} paymentTransaction - Payment transaction
   * @param {Object} routingResult - Routing result
   * @param {Object} transaction - Database transaction
   */
  async sendRoutingNotifications(paymentTransaction, routingResult, transaction) {
    try {
      const { default: Notification } = await import('../models/Notification.js');

      // Notify patient
      await Notification.create({
        userId: paymentTransaction.patient_id,
        type: 'payment_routed',
        title: 'Payment Processed',
        message: `Your payment of ${paymentTransaction.amount} ETB has been processed successfully.`,
        data: {
          payment_transaction_id: paymentTransaction.id,
          appointment_id: paymentTransaction.appointment_id,
          routing_destination: paymentTransaction.payment_destination,
          routing_result: routingResult
        },
        priority: 'medium'
      }, { transaction });

      // Notify doctor
      const doctorMessage = paymentTransaction.payment_destination === 'doctor_wallet'
        ? `Payment of ${paymentTransaction.amount} ETB is being transferred to your wallet.`
        : `Payment of ${paymentTransaction.amount} ETB is held in system wallet and will be released after consultation.`;

      await Notification.create({
        userId: paymentTransaction.doctor_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: doctorMessage,
        data: {
          payment_transaction_id: paymentTransaction.id,
          appointment_id: paymentTransaction.appointment_id,
          amount: paymentTransaction.amount,
          routing_destination: paymentTransaction.payment_destination
        },
        priority: 'medium'
      }, { transaction });
    } catch (error) {
      console.error('Error sending routing notifications:', error);
      // Don't throw error to avoid breaking the main workflow
    }
  }

  /**
   * Send release notifications
   * @param {Object} paymentTransaction - Payment transaction
   * @param {Object} releaseResult - Release result
   * @param {Object} transaction - Database transaction
   */
  async sendReleaseNotifications(paymentTransaction, releaseResult, transaction) {
    try {
      const { default: Notification } = await import('../models/Notification.js');

      // Notify doctor of payment release
      await Notification.create({
        userId: paymentTransaction.doctor_id,
        type: 'payment_released',
        title: 'Payment Released',
        message: `Payment of ${releaseResult.release_amount} ETB has been released to your account.`,
        data: {
          payment_transaction_id: paymentTransaction.id,
          release_amount: releaseResult.release_amount,
          platform_fee: releaseResult.platform_fee,
          release_type: releaseResult.release_type || releaseResult.transfer_type
        },
        priority: 'high'
      }, { transaction });
    } catch (error) {
      console.error('Error sending release notifications:', error);
    }
  }

  /**
   * Get detailed payment status
   * @param {Object} paymentTransaction - Payment transaction
   * @returns {Object} Detailed status information
   */
  async getDetailedPaymentStatus(paymentTransaction) {
    try {
      const status = {
        current_status: paymentTransaction.transaction_status,
        status_description: this.getStatusDescription(paymentTransaction.transaction_status),
        is_completed: ['completed', 'released'].includes(paymentTransaction.transaction_status),
        is_pending: paymentTransaction.transaction_status === 'processing',
        is_failed: paymentTransaction.transaction_status === 'failed'
      };

      // Add routing-specific information
      if (paymentTransaction.payment_destination === 'doctor_wallet') {
        status.routing_info = {
          type: 'Direct doctor wallet transfer',
          wallet_address: paymentTransaction.doctor_wallet_address,
          chapa_transaction_id: paymentTransaction.chapa_transaction_id,
          estimated_completion: '2-5 minutes'
        };
      } else {
        status.routing_info = {
          type: 'System wallet holding',
          escrow_status: 'held',
          release_conditions: this.getSystemWalletReleaseConditions(paymentTransaction.service_type)
        };
      }

      return status;
    } catch (error) {
      console.error('Error getting detailed payment status:', error);
      return { error: 'Unable to retrieve detailed status' };
    }
  }

  /**
   * Get status description
   * @param {string} status - Transaction status
   * @returns {string} Human-readable status description
   */
  getStatusDescription(status) {
    const descriptions = {
      'pending': 'Payment is being processed',
      'processing': 'Payment routing in progress',
      'completed': 'Payment successfully processed',
      'released': 'Payment released to doctor',
      'failed': 'Payment processing failed',
      'refunded': 'Payment has been refunded'
    };

    return descriptions[status] || 'Unknown status';
  }

  /**
   * Calculate processing duration
   * @param {Object} paymentTransaction - Payment transaction
   * @returns {number} Processing duration in milliseconds
   */
  calculateProcessingDuration(paymentTransaction) {
    if (!paymentTransaction.completed_at) {
      return null;
    }

    return new Date(paymentTransaction.completed_at) - new Date(paymentTransaction.created_at);
  }

  /**
   * Get payment routing statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Routing statistics
   */
  async getRoutingStatistics(filters = {}) {
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
          'payment_destination',
          'approval_method',
          'transaction_status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('AVG', sequelize.col('amount')), 'avg_amount'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
          [sequelize.fn('AVG', sequelize.col('processing_fees')), 'avg_fees']
        ],
        group: ['payment_destination', 'approval_method', 'transaction_status'],
        raw: true
      });

      return {
        time_range: timeRange,
        filters: { doctorId, serviceType },
        statistics: stats,
        generated_at: new Date()
      };
    } catch (error) {
      console.error('Error getting routing statistics:', error);
      throw new Error('Failed to generate routing statistics');
    }
  }
}

export default PaymentRouter;