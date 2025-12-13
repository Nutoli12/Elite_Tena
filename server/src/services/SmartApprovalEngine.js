import db from '../models/index.js';
import EnhancedNotificationService from './enhancedNotificationService.js';

const { EnhancedAppointment, DoctorServicePricing } = db;

class SmartApprovalEngine {
  
  /**
   * Process payment and determine approval logic
   */
  static async processPayment(appointmentId, paymentData) {
    try {
      const appointment = await EnhancedAppointment.findByPk(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Update payment information
      appointment.paidAmount = paymentData.amount;
      appointment.paymentStatus = 'paid';
      appointment.paymentReference = paymentData.reference;
      
      await appointment.save();

      // Check if auto-approval is eligible
      const shouldAutoApprove = await this.shouldAutoApprove(appointment);
      
      if (shouldAutoApprove) {
        return await this.autoApprove(appointment);
      } else {
        return await this.sendForManualReview(appointment);
      }
      
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  /**
   * Determine if appointment should be auto-approved
   */
  static async shouldAutoApprove(appointment) {
    try {
      // Get doctor's pricing settings
      const doctorPricing = await DoctorServicePricing.findOne({
        where: { doctorWallet: appointment.doctorWallet }
      });

      if (!doctorPricing || !doctorPricing.autoApproveExactPayments) {
        return false;
      }

      // Check if payment is exact
      const isExactPayment = appointment.isExactPayment();
      
      // Auto-approve for exact payments
      // In-person appointments are auto-approved when payment is exact
      // Video/chat appointments can also be auto-approved with exact payment
      return isExactPayment && appointment.paymentStatus === 'paid';
      
    } catch (error) {
      console.error('Auto-approval check error:', error);
      return false;
    }
  }

  /**
   * Auto-approve appointment
   */
  static async autoApprove(appointment) {
    try {
      await appointment.approve(null, true);
      
      // Log the auto-approval
      await this.logApprovalAction(appointment.id, 'auto_approved', {
        expectedAmount: appointment.expectedFee,
        paidAmount: appointment.paidAmount,
        reason: 'Exact payment received - auto-approved'
      });

      // Notify patient
      await EnhancedNotificationService.sendToUser(appointment.patientId, 'appointment_auto_approved', {
        title: 'Appointment Confirmed!',
        message: `Your ${appointment.serviceType.replace('_', ' ')} appointment has been automatically confirmed. Payment received: ${appointment.paidAmount} ETB`,
        appointmentId: appointment.id,
        serviceType: appointment.serviceType,
        amount: appointment.paidAmount,
        approvalType: 'auto'
      });

      // Notify doctor
      await EnhancedNotificationService.sendToUser(appointment.doctorId, 'appointment_auto_approved', {
        title: 'New Confirmed Appointment',
        message: `Auto-approved appointment for ${appointment.appointmentDate}. Patient paid exact amount: ${appointment.paidAmount} ETB`,
        appointmentId: appointment.id,
        serviceType: appointment.serviceType,
        amount: appointment.paidAmount,
        approvalType: 'auto'
      });

      return {
        success: true,
        type: 'auto_approved',
        appointment: appointment.toJSON(),
        message: 'Appointment automatically approved - exact payment received'
      };
      
    } catch (error) {
      console.error('Auto-approval error:', error);
      throw error;
    }
  }

  /**
   * Send appointment for manual review
   */
  static async sendForManualReview(appointment) {
    try {
      const paymentDifference = appointment.getPaymentDifference();
      const isOverpayment = paymentDifference > 0;
      const isUnderpayment = paymentDifference < 0;
      
      let reason = 'Manual review required';
      if (isOverpayment) {
        reason = `Overpayment: Patient paid ${appointment.paidAmount} ETB, expected ${appointment.expectedFee} ETB (+${paymentDifference} ETB)`;
      } else if (isUnderpayment) {
        reason = `Underpayment: Patient paid ${appointment.paidAmount} ETB, expected ${appointment.expectedFee} ETB (${paymentDifference} ETB)`;
      }

      // Log the manual review requirement
      await this.logApprovalAction(appointment.id, 'payment_mismatch', {
        expectedAmount: appointment.expectedFee,
        paidAmount: appointment.paidAmount,
        amountDifference: paymentDifference,
        reason: reason
      });

      // Notify patient
      await EnhancedNotificationService.sendToUser(appointment.patientId, 'appointment_pending_review', {
        title: 'Appointment Under Review',
        message: `Your appointment is being reviewed by the doctor. ${reason}`,
        appointmentId: appointment.id,
        serviceType: appointment.serviceType,
        expectedAmount: appointment.expectedFee,
        paidAmount: appointment.paidAmount,
        difference: paymentDifference
      });

      // Notify doctor for manual review
      await EnhancedNotificationService.sendToUser(appointment.doctorId, 'appointment_manual_review', {
        title: 'Appointment Requires Review',
        message: `New appointment requires your approval. ${reason}`,
        appointmentId: appointment.id,
        serviceType: appointment.serviceType,
        expectedAmount: appointment.expectedFee,
        paidAmount: appointment.paidAmount,
        difference: paymentDifference,
        patientWallet: appointment.patientWallet
      });

      return {
        success: true,
        type: 'manual_review',
        appointment: appointment.toJSON(),
        message: reason,
        paymentDifference: paymentDifference
      };
      
    } catch (error) {
      console.error('Manual review setup error:', error);
      throw error;
    }
  }

  /**
   * Manual approval by doctor
   */
  static async manualApprove(appointmentId, doctorId, notes = null) {
    try {
      const appointment = await EnhancedAppointment.findByPk(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.doctorId !== doctorId) {
        throw new Error('Unauthorized: Not your appointment');
      }

      if (!appointment.canBeApproved()) {
        throw new Error('Appointment cannot be approved in current state');
      }

      await appointment.approve(doctorId, false);
      
      // Log the manual approval
      await this.logApprovalAction(appointment.id, 'manually_approved', {
        expectedAmount: appointment.expectedFee,
        paidAmount: appointment.paidAmount,
        reason: notes || 'Manually approved by doctor',
        performedBy: doctorId
      });

      // Notify patient
      await EnhancedNotificationService.sendToUser(appointment.patientId, 'appointment_approved', {
        title: 'Appointment Approved!',
        message: `Your appointment has been approved by the doctor. ${notes || ''}`,
        appointmentId: appointment.id,
        serviceType: appointment.serviceType,
        approvalType: 'manual',
        notes: notes
      });

      return {
        success: true,
        type: 'manually_approved',
        appointment: appointment.toJSON(),
        message: 'Appointment manually approved by doctor'
      };
      
    } catch (error) {
      console.error('Manual approval error:', error);
      throw error;
    }
  }

  /**
   * Reject appointment and process refund
   */
  static async rejectAppointment(appointmentId, doctorId, reason) {
    try {
      const appointment = await EnhancedAppointment.findByPk(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.doctorId !== doctorId) {
        throw new Error('Unauthorized: Not your appointment');
      }

      await appointment.reject(reason, doctorId);
      
      // Log the rejection
      await this.logApprovalAction(appointment.id, 'rejected', {
        expectedAmount: appointment.expectedFee,
        paidAmount: appointment.paidAmount,
        reason: reason,
        performedBy: doctorId
      });

      // Process refund if eligible
      let refundResult = null;
      if (appointment.isRefundEligible()) {
        refundResult = await this.processRefund(appointment, reason);
      }

      // Notify patient
      await EnhancedNotificationService.sendToUser(appointment.patientId, 'appointment_rejected', {
        title: 'Appointment Rejected',
        message: `Your appointment was rejected. Reason: ${reason}. ${refundResult ? 'Refund will be processed.' : ''}`,
        appointmentId: appointment.id,
        serviceType: appointment.serviceType,
        rejectionReason: reason,
        refundEligible: appointment.isRefundEligible(),
        refundAmount: refundResult?.refundAmount || 0
      });

      return {
        success: true,
        type: 'rejected',
        appointment: appointment.toJSON(),
        refund: refundResult,
        message: 'Appointment rejected by doctor'
      };
      
    } catch (error) {
      console.error('Appointment rejection error:', error);
      throw error;
    }
  }

  /**
   * Process refund for rejected appointment
   */
  static async processRefund(appointment, reason) {
    try {
      const { default: RefundProcessor } = await import('./RefundProcessor.js');
      
      const refundAmount = parseFloat(appointment.paidAmount);
      
      // Update appointment refund status
      appointment.refundStatus = 'pending';
      appointment.refundAmount = refundAmount;
      await appointment.save();

      // Process the actual refund (integrate with payment gateway)
      const refundResult = await RefundProcessor.processRefund({
        appointmentId: appointment.id,
        paymentReference: appointment.paymentReference,
        refundAmount: refundAmount,
        reason: reason
      });

      if (refundResult.success) {
        appointment.refundStatus = 'processed';
        appointment.refundProcessedAt = new Date();
        await appointment.save();
      } else {
        appointment.refundStatus = 'failed';
        await appointment.save();
      }

      return {
        success: refundResult.success,
        refundAmount: refundAmount,
        refundReference: refundResult.refundReference,
        message: refundResult.message
      };
      
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        refundAmount: 0,
        message: 'Refund processing failed'
      };
    }
  }

  /**
   * Log approval actions for audit
   */
  static async logApprovalAction(appointmentId, action, details) {
    try {
      const { sequelize } = db;
      
      await sequelize.query(`
        INSERT INTO appointment_approval_log 
        (appointment_id, action, reason, expected_amount, paid_amount, amount_difference, performed_by, performed_by_role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, {
        replacements: [
          appointmentId,
          action,
          details.reason || null,
          details.expectedAmount || null,
          details.paidAmount || null,
          details.amountDifference || null,
          details.performedBy || null,
          details.performedByRole || 'system'
        ]
      });
      
    } catch (error) {
      console.error('Approval logging error:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Get approval statistics for doctor dashboard
   */
  static async getApprovalStats(doctorWallet, timeframe = '30d') {
    try {
      const { sequelize } = db;
      
      const timeCondition = timeframe === '30d' ? 
        "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)" :
        "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";

      const [results] = await sequelize.query(`
        SELECT 
          approval_status,
          approval_type,
          COUNT(*) as count,
          AVG(paid_amount) as avg_amount,
          SUM(paid_amount) as total_amount
        FROM enhanced_appointments 
        WHERE doctor_wallet = ? ${timeCondition}
        GROUP BY approval_status, approval_type
      `, {
        replacements: [doctorWallet]
      });

      return {
        success: true,
        stats: results,
        timeframe: timeframe
      };
      
    } catch (error) {
      console.error('Approval stats error:', error);
      return {
        success: false,
        stats: [],
        error: error.message
      };
    }
  }
}

export default SmartApprovalEngine;