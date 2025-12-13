/**
 * Enhanced Payment Controller
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 8.2: EnhancedPaymentController**
 * **Requirements: 3.1, 6.1, 7.1, 8.2**
 * 
 * Handles payment processing endpoints, auto-approval workflow APIs,
 * payment routing logic, and refund processing endpoints.
 */

import { Op } from 'sequelize';
import { PaymentRouter } from '../services/PaymentRouter.js';
import { PaymentHoldingManager } from '../services/PaymentHoldingManager.js';
import { RefundProcessor } from '../services/RefundProcessor.js';
import { AutoApprovalEngine } from '../services/AutoApprovalEngine.js';
import { AuditService } from '../services/AuditService.js';

export class EnhancedPaymentController {
  constructor(models, paymentGateway, notificationService) {
    this.models = models;
    this.paymentGateway = paymentGateway;
    this.notificationService = notificationService;
    this.paymentRouter = new PaymentRouter(models, paymentGateway, notificationService);
    this.paymentHoldingManager = new PaymentHoldingManager(models, notificationService);
    this.refundProcessor = new RefundProcessor(models, paymentGateway, notificationService);
    this.autoApprovalEngine = new AutoApprovalEngine(models, notificationService);
    this.auditService = new AuditService(models, notificationService);
  }

  /**
   * Process enhanced payment with auto-approval logic
   * POST /api/enhanced-payment/process
   */
  async processEnhancedPayment(req, res) {
    try {
      const {
        appointmentId,
        patientId,
        doctorId,
        serviceType,
        amount,
        paymentMethod,
        paymentDetails
      } = req.body;

      // Validate required fields
      if (!appointmentId || !patientId || !doctorId || !serviceType || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment information'
        });
      }

      // Get appointment details
      const appointment = await this.models.Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found'
        });
      }

      // Get doctor's pricing
      const doctorPricing = await this.models.EnhancedDoctorServiceFees.findOne({
        where: {
          doctor_id: doctorId,
          service_type: serviceType,
          is_active: true
        }
      });

      // Determine approval method
      const approvalDecision = await this.autoApprovalEngine.determineApprovalMethod({
        appointmentId,
        patientId,
        doctorId,
        serviceType,
        paidAmount: amount,
        doctorPrice: doctorPricing?.fee_amount
      });

      // Process payment based on approval method
      let paymentResult;
      
      if (approvalDecision.method === 'auto_approve') {
        paymentResult = await this.processAutoApprovalPayment({
          appointmentId,
          patientId,
          doctorId,
          serviceType,
          amount,
          paymentMethod,
          paymentDetails,
          approvalDecision
        });
      } else {
        paymentResult = await this.processManualApprovalPayment({
          appointmentId,
          patientId,
          doctorId,
          serviceType,
          amount,
          paymentMethod,
          paymentDetails,
          approvalDecision
        });
      }

      // Log payment transaction
      await this.auditService.logPaymentTransaction({
        transaction_id: paymentResult.transaction_id,
        appointment_id: appointmentId,
        patient_id: patientId,
        doctor_id: doctorId,
        service_type: serviceType,
        amount,
        currency: 'ETB',
        payment_method: paymentMethod,
        approval_method: approvalDecision.method,
        routing_destination: paymentResult.routing_destination,
        platform_fee: paymentResult.platform_fee,
        doctor_amount: paymentResult.doctor_amount,
        status: paymentResult.status,
        gateway_response: paymentResult.gateway_response,
        gateway_transaction_id: paymentResult.gateway_transaction_id,
        processing_time: paymentResult.processing_time,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID
      });

      res.json({
        success: true,
        data: {
          payment_id: paymentResult.payment_id,
          transaction_id: paymentResult.transaction_id,
          approval_method: approvalDecision.method,
          appointment_status: paymentResult.appointment_status,
          payment_status: paymentResult.status,
          routing_destination: paymentResult.routing_destination,
          estimated_completion: paymentResult.estimated_completion,
          receipt_url: paymentResult.receipt_url
        },
        message: approvalDecision.method === 'auto_approve' 
          ? 'Payment processed and appointment auto-approved'
          : 'Payment processed, awaiting doctor approval'
      });
    } catch (error) {
      console.error('Enhanced payment processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment processing failed'
      });
    }
  }

  /**
   * Process auto-approval payment (direct to doctor)
   * @private
   */
  async processAutoApprovalPayment(paymentData) {
    const {
      appointmentId,
      patientId,
      doctorId,
      serviceType,
      amount,
      paymentMethod,
      paymentDetails,
      approvalDecision
    } = paymentData;

    // Route payment directly to doctor
    const routingResult = await this.paymentRouter.routePayment({
      appointmentId,
      patientId,
      doctorId,
      serviceType,
      amount,
      paymentMethod,
      paymentDetails,
      routing_type: 'direct_to_doctor',
      approval_method: 'auto'
    });

    // Auto-approve the appointment
    await this.autoApprovalEngine.executeAutoApproval({
      appointmentId,
      approvalDecision,
      paymentResult: routingResult
    });

    // Update appointment status
    await this.models.Appointment.update({
      status: 'confirmed',
      payment_status: 'completed',
      approval_method: 'auto',
      confirmed_at: new Date()
    }, {
      where: { id: appointmentId }
    });

    return {
      ...routingResult,
      appointment_status: 'confirmed',
      routing_destination: 'doctor_wallet'
    };
  }

  /**
   * Process manual approval payment (hold in system)
   * @private
   */
  async processManualApprovalPayment(paymentData) {
    const {
      appointmentId,
      patientId,
      doctorId,
      serviceType,
      amount,
      paymentMethod,
      paymentDetails,
      approvalDecision
    } = paymentData;

    // Hold payment in system wallet
    const holdingResult = await this.paymentHoldingManager.holdPayment({
      amount,
      paymentMethod,
      paymentDetails,
      transaction_id: `temp_${Date.now()}`
    }, {
      id: appointmentId,
      patient_id: patientId,
      doctor_id: doctorId,
      service_type: serviceType,
      scheduled_time: new Date() // This should come from appointment data
    });

    // Update appointment status
    await this.models.Appointment.update({
      status: 'pending_approval',
      payment_status: 'held',
      approval_method: 'manual',
      payment_held_at: new Date()
    }, {
      where: { id: appointmentId }
    });

    // Create manual approval request
    await this.models.ManualApprovalRequest.create({
      appointment_id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      service_type: serviceType,
      requested_amount: amount,
      doctor_price: approvalDecision.doctor_price,
      price_match: approvalDecision.price_match,
      approval_reason: approvalDecision.reason,
      status: 'pending',
      created_at: new Date()
    });

    return {
      payment_id: holdingResult.holding_id,
      transaction_id: holdingResult.holding_id,
      status: 'held',
      appointment_status: 'pending_approval',
      routing_destination: 'system_wallet',
      estimated_completion: holdingResult.estimated_release_time,
      platform_fee: holdingResult.platform_fee,
      doctor_amount: holdingResult.net_doctor_amount
    };
  }

  /**
   * Get payment status
   * GET /api/enhanced-payment/status/:paymentId
   */
  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const { userId } = req.query;

      // Get payment transaction
      const payment = await this.models.EnhancedPaymentTransaction.findOne({
        where: {
          [Op.or]: [
            { id: paymentId },
            { transaction_id: paymentId },
            { gateway_transaction_id: paymentId }
          ]
        },
        include: [
          {
            model: this.models.Appointment,
            as: 'appointment'
          }
        ]
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      // Verify user access
      if (payment.patient_id !== userId && payment.doctor_id !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get additional status information based on payment type
      let additionalInfo = {};
      
      if (payment.routing_destination === 'system_wallet') {
        // Get holding status
        const holdingStatus = await this.paymentHoldingManager.getHoldingStatus(payment.id);
        additionalInfo.holding_status = holdingStatus;
      }

      res.json({
        success: true,
        data: {
          payment_id: payment.id,
          transaction_id: payment.transaction_id,
          status: payment.status,
          amount: payment.amount,
          routing_destination: payment.routing_destination,
          approval_method: payment.approval_method,
          appointment_status: payment.appointment?.status,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          ...additionalInfo
        }
      });
    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment status'
      });
    }
  }

  /**
   * Process refund request
   * POST /api/enhanced-payment/refund
   */
  async processRefund(req, res) {
    try {
      const {
        appointmentId,
        refundType,
        refundReason,
        requestedBy
      } = req.body;

      // Validate refund request
      if (!appointmentId || !refundType || !refundReason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required refund information'
        });
      }

      let refundResult;

      // Process refund based on type
      switch (refundType) {
        case 'rejection':
          refundResult = await this.refundProcessor.processRejectionRefund(appointmentId, {
            reason: refundReason,
            rejected_by: requestedBy
          });
          break;

        case 'cancellation':
          refundResult = await this.refundProcessor.processCancellationRefund(appointmentId, {
            reason: refundReason,
            cancelled_by: requestedBy,
            cancelled_at: new Date()
          });
          break;

        case 'technical_issue':
          refundResult = await this.refundProcessor.processTechnicalIssueRefund(appointmentId, {
            issue_description: refundReason,
            issue_type: req.body.issueType || 'general',
            reported_by: requestedBy,
            severity: req.body.severity || 'medium'
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid refund type'
          });
      }

      res.json({
        success: true,
        data: refundResult,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        error: 'Refund processing failed'
      });
    }
  }

  /**
   * Get refund status
   * GET /api/enhanced-payment/refund/:refundId
   */
  async getRefundStatus(req, res) {
    try {
      const { refundId } = req.params;

      const refundStatus = await this.refundProcessor.getRefundStatus(refundId);

      res.json({
        success: true,
        data: refundStatus
      });
    } catch (error) {
      console.error('Get refund status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve refund status'
      });
    }
  }

  /**
   * Get payment analytics for doctor
   * GET /api/enhanced-payment/doctor/:doctorId/analytics
   */
  async getDoctorPaymentAnalytics(req, res) {
    try {
      const { doctorId } = req.params;
      const { period = '30d' } = req.query;

      // Verify doctor access
      if (doctorId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const analytics = await this.paymentRouter.getDoctorPaymentAnalytics({
        doctorId,
        period
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get doctor payment analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment analytics'
      });
    }
  }

  /**
   * Process bulk refunds (admin only)
   * POST /api/enhanced-payment/bulk-refund
   */
  async processBulkRefunds(req, res) {
    try {
      // Verify admin access
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const {
        appointmentIds,
        refundReason,
        batchId
      } = req.body;

      if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid appointment IDs'
        });
      }

      const bulkRefundResult = await this.refundProcessor.processBulkRefunds(appointmentIds, {
        reason: refundReason,
        batch_id: batchId || `bulk_${Date.now()}`,
        initiated_by: req.user.id,
        issue_description: refundReason,
        issue_type: 'system_wide_issue'
      });

      res.json({
        success: true,
        data: bulkRefundResult,
        message: 'Bulk refund processing completed'
      });
    } catch (error) {
      console.error('Process bulk refunds error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk refund processing failed'
      });
    }
  }

  /**
   * Release held payment (for consultation completion)
   * POST /api/enhanced-payment/release
   */
  async releaseHeldPayment(req, res) {
    try {
      const {
        appointmentId,
        completionData
      } = req.body;

      if (!appointmentId) {
        return res.status(400).json({
          success: false,
          error: 'Appointment ID required'
        });
      }

      const releaseResult = await this.paymentHoldingManager.processConsultationCompletion(
        appointmentId,
        {
          ...completionData,
          completed_by: req.user?.id || 'system',
          completed_at: new Date()
        }
      );

      res.json({
        success: true,
        data: releaseResult,
        message: 'Payment released successfully'
      });
    } catch (error) {
      console.error('Release held payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment release failed'
      });
    }
  }

  /**
   * Get system payment analytics (admin only)
   * GET /api/enhanced-payment/admin/analytics
   */
  async getSystemPaymentAnalytics(req, res) {
    try {
      // Verify admin access
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { period = '30d' } = req.query;

      const systemAnalytics = await this.paymentRouter.getSystemPaymentAnalytics({
        period
      });

      res.json({
        success: true,
        data: systemAnalytics
      });
    } catch (error) {
      console.error('Get system payment analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system payment analytics'
      });
    }
  }
}

export default EnhancedPaymentController;