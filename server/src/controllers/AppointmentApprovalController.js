/**
 * Appointment Approval Controller
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 8.3: AppointmentApprovalController**
 * **Requirements: 4.1, 4.3, 4.4, 4.5**
 * 
 * Handles appointment approval APIs, manual approval workflow endpoints,
 * approval notification systems, and alternative scheduling APIs.
 */

import { Op } from 'sequelize';
import { ManualApprovalRouter } from '../services/ManualApprovalRouter.js';
import { PaymentHoldingManager } from '../services/PaymentHoldingManager.js';
import { RefundProcessor } from '../services/RefundProcessor.js';
import { AuditService } from '../services/AuditService.js';

export class AppointmentApprovalController {
  constructor(models, notificationService) {
    this.models = models;
    this.notificationService = notificationService;
    this.manualApprovalRouter = new ManualApprovalRouter(models, notificationService);
    this.paymentHoldingManager = new PaymentHoldingManager(models, notificationService);
    this.refundProcessor = new RefundProcessor(models, null, notificationService);
    this.auditService = new AuditService(models, notificationService);
  }

  /**
   * Get pending approvals for doctor
   * GET /api/two-tier-pricing/doctor/pending-approvals
   */
  async getDoctorPendingApprovals(req, res) {
    try {
      const doctorId = req.user?.id || req.query.doctorId;
      const { 
        status = 'pending',
        service_type,
        priority,
        limit = 50,
        offset = 0 
      } = req.query;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          error: 'Doctor ID required'
        });
      }

      const whereClause = {
        doctor_id: doctorId,
        status
      };

      if (service_type) {
        whereClause.service_type = service_type;
      }

      if (priority) {
        whereClause.priority = priority;
      }

      const pendingApprovals = await this.models.ManualApprovalRequest.findAll({
        where: whereClause,
        include: [
          {
            model: this.models.Appointment,
            as: 'appointment',
            include: [
              {
                model: this.models.Patient,
                as: 'patient',
                attributes: ['id', 'first_name', 'last_name', 'wallet_address']
              }
            ]
          },
          {
            model: this.models.EnhancedDoctorServiceFees,
            as: 'doctorServiceFee',
            attributes: ['fee_amount', 'service_type']
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC']
        ],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Transform data for frontend
      const transformedApprovals = await Promise.all(
        pendingApprovals.map(async (approval) => {
          // Check auto-approval eligibility
          const autoApprovalEligible = approval.price_match && 
            approval.appointment?.service_type !== 'in_person';

          // Get alternative slots if available
          const alternativeSlots = await this.getAlternativeSlots(
            approval.doctor_id,
            approval.appointment?.scheduled_time,
            approval.appointment?.service_type
          );

          // Determine market rate context
          const marketRate = await this.getMarketRate(
            approval.appointment?.service_type,
            approval.doctor_id
          );

          return {
            id: approval.appointment_id,
            patientName: `${approval.appointment?.patient?.first_name} ${approval.appointment?.patient?.last_name}`,
            patientWallet: approval.appointment?.patient?.wallet_address,
            appointmentDate: approval.appointment?.scheduled_time,
            serviceType: this.transformServiceType(approval.service_type),
            reason: approval.appointment?.reason || 'General consultation',
            fee: approval.requested_amount,
            duration: this.getServiceDuration(approval.service_type),
            createdAt: approval.created_at,
            priority: approval.priority || 'routine',
            approvalMethod: 'manual',
            pricingTier: approval.service_type === 'in_person' ? 'standard' : 'premium',
            autoApprovalEligible,
            priceMatch: approval.price_match,
            doctorPrice: approval.doctor_price,
            marketRate,
            alternativeSlots
          };
        })
      );

      res.json({
        success: true,
        data: transformedApprovals,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: transformedApprovals.length
        }
      });
    } catch (error) {
      console.error('Get doctor pending approvals error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending approvals'
      });
    }
  }

  /**
   * Process appointment approval decision
   * POST /api/two-tier-pricing/appointment/:appointmentId/approval
   */
  async processApprovalDecision(req, res) {
    try {
      const { appointmentId } = req.params;
      const {
        action, // 'approve', 'reject', 'reschedule'
        reason,
        alternativeSlot,
        doctorWallet
      } = req.body;

      const doctorId = req.user?.id || doctorWallet;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          error: 'Doctor identification required'
        });
      }

      if (!['approve', 'reject', 'reschedule'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
      }

      // Get approval request
      const approvalRequest = await this.models.ManualApprovalRequest.findOne({
        where: {
          appointment_id: appointmentId,
          doctor_id: doctorId,
          status: 'pending'
        },
        include: [
          {
            model: this.models.Appointment,
            as: 'appointment'
          }
        ]
      });

      if (!approvalRequest) {
        return res.status(404).json({
          success: false,
          error: 'Approval request not found'
        });
      }

      let result;

      switch (action) {
        case 'approve':
          result = await this.processApproval(approvalRequest, doctorId);
          break;
        case 'reject':
          result = await this.processRejection(approvalRequest, doctorId, reason);
          break;
        case 'reschedule':
          result = await this.processReschedule(approvalRequest, doctorId, alternativeSlot, reason);
          break;
      }

      // Log approval decision
      await this.auditService.logApprovalDecision({
        appointment_id: appointmentId,
        decided_by: doctorId,
        decision: action,
        reason,
        patient_id: approvalRequest.patient_id,
        doctor_id: doctorId,
        service_type: approvalRequest.service_type,
        requested_price: approvalRequest.requested_amount,
        doctor_price: approvalRequest.doctor_price,
        price_match: approvalRequest.price_match,
        approval_method: 'manual',
        decision_time: Date.now() - new Date(approvalRequest.created_at).getTime(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID
      });

      res.json({
        success: true,
        data: result,
        message: `Appointment ${action}d successfully`
      });
    } catch (error) {
      console.error('Process approval decision error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process approval decision'
      });
    }
  }

  /**
   * Process appointment approval
   * @private
   */
  async processApproval(approvalRequest, doctorId) {
    // Update approval request status
    await approvalRequest.update({
      status: 'approved',
      approved_at: new Date(),
      approved_by: doctorId
    });

    // Update appointment status
    await this.models.Appointment.update({
      status: 'confirmed',
      confirmed_at: new Date(),
      approval_method: 'manual'
    }, {
      where: { id: approvalRequest.appointment_id }
    });

    // Release held payment
    const releaseResult = await this.paymentHoldingManager.processConsultationCompletion(
      approvalRequest.appointment_id,
      {
        trigger_type: 'manual_approval',
        completed_by: doctorId,
        completion_data: {
          doctor_confirmed: true,
          manual_approval: true
        }
      }
    );

    // Send notifications
    await this.sendApprovalNotifications(approvalRequest, 'approved');

    return {
      appointment_id: approvalRequest.appointment_id,
      status: 'approved',
      payment_release: releaseResult
    };
  }

  /**
   * Process appointment rejection
   * @private
   */
  async processRejection(approvalRequest, doctorId, reason) {
    // Update approval request status
    await approvalRequest.update({
      status: 'rejected',
      rejected_at: new Date(),
      rejected_by: doctorId,
      rejection_reason: reason
    });

    // Update appointment status
    await this.models.Appointment.update({
      status: 'rejected',
      rejected_at: new Date(),
      rejection_reason: reason
    }, {
      where: { id: approvalRequest.appointment_id }
    });

    // Process refund
    const refundResult = await this.refundProcessor.processRejectionRefund(
      approvalRequest.appointment_id,
      {
        reason,
        rejected_by: doctorId
      }
    );

    // Send notifications
    await this.sendApprovalNotifications(approvalRequest, 'rejected', { reason });

    return {
      appointment_id: approvalRequest.appointment_id,
      status: 'rejected',
      refund: refundResult
    };
  }

  /**
   * Process appointment reschedule
   * @private
   */
  async processReschedule(approvalRequest, doctorId, alternativeSlot, reason) {
    const [newDate, newTime] = alternativeSlot.split('_');
    const newScheduledTime = new Date(`${newDate}T${newTime}`);

    // Update approval request status
    await approvalRequest.update({
      status: 'rescheduled',
      rescheduled_at: new Date(),
      rescheduled_by: doctorId,
      reschedule_reason: reason,
      alternative_slot: alternativeSlot
    });

    // Update appointment with new time
    await this.models.Appointment.update({
      status: 'rescheduled',
      scheduled_time: newScheduledTime,
      original_scheduled_time: approvalRequest.appointment.scheduled_time,
      rescheduled_at: new Date(),
      reschedule_reason: reason
    }, {
      where: { id: approvalRequest.appointment_id }
    });

    // Create new approval request for rescheduled appointment
    await this.models.ManualApprovalRequest.create({
      appointment_id: approvalRequest.appointment_id,
      doctor_id: doctorId,
      patient_id: approvalRequest.patient_id,
      service_type: approvalRequest.service_type,
      requested_amount: approvalRequest.requested_amount,
      doctor_price: approvalRequest.doctor_price,
      price_match: approvalRequest.price_match,
      approval_reason: 'Rescheduled appointment',
      status: 'pending',
      parent_request_id: approvalRequest.id
    });

    // Send notifications
    await this.sendApprovalNotifications(approvalRequest, 'rescheduled', { 
      reason, 
      newTime: newScheduledTime 
    });

    return {
      appointment_id: approvalRequest.appointment_id,
      status: 'rescheduled',
      new_scheduled_time: newScheduledTime
    };
  }

  /**
   * Bulk auto-approve eligible appointments
   * POST /api/two-tier-pricing/doctor/bulk-auto-approve
   */
  async bulkAutoApprove(req, res) {
    try {
      const { appointmentIds } = req.body;
      const doctorId = req.user?.id;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          error: 'Doctor identification required'
        });
      }

      if (!appointmentIds || !Array.isArray(appointmentIds)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid appointment IDs'
        });
      }

      // Get eligible approval requests
      const eligibleRequests = await this.models.ManualApprovalRequest.findAll({
        where: {
          appointment_id: { [Op.in]: appointmentIds },
          doctor_id: doctorId,
          status: 'pending',
          price_match: true // Only auto-approve exact price matches
        },
        include: [
          {
            model: this.models.Appointment,
            as: 'appointment',
            where: {
              service_type: { [Op.ne]: 'in_person' } // Exclude in-person consultations
            }
          }
        ]
      });

      const results = [];

      for (const request of eligibleRequests) {
        try {
          const approvalResult = await this.processApproval(request, doctorId);
          results.push({
            appointment_id: request.appointment_id,
            success: true,
            result: approvalResult
          });
        } catch (error) {
          results.push({
            appointment_id: request.appointment_id,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.json({
        success: true,
        data: {
          total_processed: results.length,
          approved_count: successCount,
          failed_count: failureCount,
          results
        },
        message: `Bulk auto-approval completed: ${successCount} approved, ${failureCount} failed`
      });
    } catch (error) {
      console.error('Bulk auto-approve error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk auto-approval failed'
      });
    }
  }

  /**
   * Get approval statistics for doctor
   * GET /api/two-tier-pricing/doctor/approval-stats
   */
  async getDoctorApprovalStats(req, res) {
    try {
      const doctorId = req.user?.id || req.query.doctorId;
      const { period = '30d' } = req.query;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          error: 'Doctor ID required'
        });
      }

      const periodStart = this.calculatePeriodStart(period);

      // Get approval statistics
      const stats = await this.models.ManualApprovalRequest.findAll({
        where: {
          doctor_id: doctorId,
          created_at: { [Op.gte]: periodStart }
        },
        attributes: [
          'status',
          [this.models.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Get service type breakdown
      const serviceTypeStats = await this.models.ManualApprovalRequest.findAll({
        where: {
          doctor_id: doctorId,
          created_at: { [Op.gte]: periodStart }
        },
        attributes: [
          'service_type',
          [this.models.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['service_type'],
        raw: true
      });

      // Calculate response time
      const responseTimeQuery = await this.models.ManualApprovalRequest.findAll({
        where: {
          doctor_id: doctorId,
          status: { [Op.in]: ['approved', 'rejected'] },
          created_at: { [Op.gte]: periodStart }
        },
        attributes: [
          [this.models.sequelize.fn('AVG', 
            this.models.sequelize.literal('EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600')
          ), 'avg_response_hours']
        ],
        raw: true
      });

      // Transform stats
      const statusCounts = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {});

      const serviceTypeCounts = serviceTypeStats.reduce((acc, stat) => {
        acc[stat.service_type] = parseInt(stat.count);
        return acc;
      }, {});

      const totalPending = statusCounts.pending || 0;
      const autoEligible = await this.countAutoEligible(doctorId, periodStart);
      const manualRequired = totalPending - autoEligible;
      const premiumBookings = (serviceTypeCounts.video_call || 0) + (serviceTypeCounts.chat || 0);
      const standardBookings = serviceTypeCounts.in_person || 0;
      const averageResponseTime = parseFloat(responseTimeQuery[0]?.avg_response_hours || 0);
      const conversionRate = this.calculateConversionRate(statusCounts);

      res.json({
        success: true,
        data: {
          total_pending: totalPending,
          auto_eligible: autoEligible,
          manual_required: manualRequired,
          premium_bookings: premiumBookings,
          standard_bookings: standardBookings,
          average_response_time: averageResponseTime,
          conversion_rate: conversionRate,
          status_breakdown: statusCounts,
          service_type_breakdown: serviceTypeCounts
        }
      });
    } catch (error) {
      console.error('Get doctor approval stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve approval statistics'
      });
    }
  }

  /**
   * Get alternative scheduling slots
   * GET /api/two-tier-pricing/doctor/alternative-slots
   */
  async getAlternativeSlots(doctorId, originalTime, serviceType, days = 7) {
    try {
      // This would integrate with the scheduling system
      // For now, return mock data
      const slots = [];
      const startDate = new Date();
      
      for (let i = 1; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Generate time slots (9 AM to 5 PM)
        for (let hour = 9; hour <= 17; hour++) {
          slots.push({
            date: date.toISOString().split('T')[0],
            time: `${hour.toString().padStart(2, '0')}:00`,
            available: Math.random() > 0.3 // 70% availability
          });
        }
      }

      return slots.slice(0, 10); // Return first 10 available slots
    } catch (error) {
      console.error('Get alternative slots error:', error);
      return [];
    }
  }

  /**
   * Utility methods
   * @private
   */
  transformServiceType(serviceType) {
    const mapping = {
      'in_person': 'inPerson',
      'video_call': 'videoCall',
      'chat': 'chat'
    };
    return mapping[serviceType] || serviceType;
  }

  getServiceDuration(serviceType) {
    const durations = {
      'in_person': 60,
      'video_call': 45,
      'chat': 30
    };
    return durations[serviceType] || 60;
  }

  async getMarketRate(serviceType, doctorId) {
    // This would integrate with the pricing engine
    // For now, return mock data
    const marketRates = {
      'video_call': 8500,
      'chat': 3500,
      'in_person': 400
    };
    return marketRates[serviceType] || 0;
  }

  calculatePeriodStart(period) {
    const now = new Date();
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const days = periodMap[period] || 30;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return start;
  }

  async countAutoEligible(doctorId, periodStart) {
    const count = await this.models.ManualApprovalRequest.count({
      where: {
        doctor_id: doctorId,
        status: 'pending',
        price_match: true,
        created_at: { [Op.gte]: periodStart }
      },
      include: [
        {
          model: this.models.Appointment,
          as: 'appointment',
          where: {
            service_type: { [Op.ne]: 'in_person' }
          }
        }
      ]
    });
    return count;
  }

  calculateConversionRate(statusCounts) {
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const approved = statusCounts.approved || 0;
    return total > 0 ? (approved / total) * 100 : 0;
  }

  async sendApprovalNotifications(approvalRequest, action, additionalData = {}) {
    if (!this.notificationService) return;

    try {
      const actionMessages = {
        approved: 'Your appointment has been approved by the doctor',
        rejected: `Your appointment has been rejected. Reason: ${additionalData.reason}`,
        rescheduled: `Your appointment has been rescheduled to ${additionalData.newTime}`
      };

      // Notify patient
      await this.notificationService.sendNotification({
        user_id: approvalRequest.patient_id,
        type: `appointment_${action}`,
        title: `Appointment ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        message: actionMessages[action],
        data: {
          appointment_id: approvalRequest.appointment_id,
          action,
          ...additionalData
        }
      });

      // Notify doctor
      await this.notificationService.sendNotification({
        user_id: approvalRequest.doctor_id,
        type: `appointment_${action}_confirmation`,
        title: 'Appointment Decision Processed',
        message: `You have ${action} an appointment`,
        data: {
          appointment_id: approvalRequest.appointment_id,
          action,
          patient_id: approvalRequest.patient_id
        }
      });
    } catch (error) {
      console.error('Failed to send approval notifications:', error);
    }
  }
}

export default AppointmentApprovalController;