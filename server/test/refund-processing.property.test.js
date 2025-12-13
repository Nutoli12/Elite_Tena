/**
 * Property Test: Refund processing
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 4.6: Property test for refund processing**
 * **Property 7: Refund processing**
 * **Validates: Requirements 8.2, 8.3, 4.4**
 * 
 * Tests refund workflows for rejected appointments, cancellation refunds,
 * technical issue refunds, and refund notification systems.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { RefundProcessor } from '../src/services/RefundProcessor.js';

describe('Property Test: Refund Processing', () => {
  let refundProcessor;
  let mockModels;
  let mockPaymentGateway;
  let mockNotificationService;
  let mockAuditService;

  beforeEach(() => {
    mockModels = {};
    
    mockPaymentGateway = {
      processRefund: jest.fn().mockResolvedValue({
        status: 'processing',
        refund_id: `gateway_refund_${Date.now()}`,
        transaction_id: `gateway_txn_${Date.now()}`,
        refund_method: 'chapa',
        estimated_completion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      })
    };

    mockNotificationService = {
      sendNotification: jest.fn().mockResolvedValue({ success: true })
    };

    mockAuditService = {
      logRefundProcessing: jest.fn().mockResolvedValue({ logged: true }),
      logBulkRefundOperation: jest.fn().mockResolvedValue({ logged: true })
    };

    refundProcessor = new RefundProcessor(
      mockModels,
      mockPaymentGateway,
      mockNotificationService,
      mockAuditService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 7.1: Rejection refunds are always full amount
   * When a doctor rejects an appointment, the patient should
   * always receive a full refund regardless of timing.
   */
  it('should process full refunds for rejected appointments', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        reason: fc.string({ minLength: 10, maxLength: 200 }),
        rejected_by: fc.constantFrom('doctor', 'admin', 'system'),
        rejection_time: fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
      }),
      fc.float({ min: 100, max: 10000 }),
      async (rejectionData, appointmentAmount) => {
        // Mock appointment data with the specified amount
        const originalGetAppointmentDetails = refundProcessor.getAppointmentDetails;
        refundProcessor.getAppointmentDetails = jest.fn().mockResolvedValue({
          id: rejectionData.appointment_id,
          patient_id: `patient_${rejectionData.appointment_id}`,
          doctor_id: `doctor_${rejectionData.appointment_id}`,
          status: 'rejected',
          total_amount: appointmentAmount,
          service_type: 'video_call',
          payment_method: 'chapa',
          transaction_id: `txn_${rejectionData.appointment_id}`,
          scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        const result = await refundProcessor.processRejectionRefund(
          rejectionData.appointment_id,
          rejectionData
        );

        expect(result.success).toBe(true);
        expect(result.refund_amount).toBeCloseTo(appointmentAmount, 2);
        expect(result.refund_id).toBeDefined();
        expect(result.transaction_id).toBeDefined();
        expect(result.refund_status).toBe('processing');
        
        // Verify payment gateway was called with correct amount
        expect(mockPaymentGateway.processRefund).toHaveBeenCalledWith(
          expect.objectContaining({
            refund_amount: appointmentAmount,
            refund_reason: rejectionData.reason
          })
        );

        // Restore original method
        refundProcessor.getAppointmentDetails = originalGetAppointmentDetails;
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 7.2: Cancellation refunds follow timing policy
   * Cancellation refunds should be calculated based on the time
   * between cancellation and scheduled appointment.
   */
  it('should calculate cancellation refunds based on timing policy', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        cancelled_by: fc.constantFrom('patient', 'doctor', 'admin'),
        reason: fc.string({ minLength: 5, maxLength: 150 }),
        hours_before_appointment: fc.float({ min: 0.5, max: 168 }) // 0.5 to 168 hours (1 week)
      }),
      fc.float({ min: 200, max: 8000 }).filter(n => !isNaN(n) && isFinite(n)),
      fc.constantFrom('in_person', 'video_call', 'chat'),
      async (cancellationData, appointmentAmount, serviceType) => {
        const scheduledTime = new Date(Date.now() + cancellationData.hours_before_appointment * 60 * 60 * 1000);
        const cancellationTime = new Date();

        // Mock appointment data
        const originalGetAppointmentDetails = refundProcessor.getAppointmentDetails;
        refundProcessor.getAppointmentDetails = jest.fn().mockResolvedValue({
          id: cancellationData.appointment_id,
          patient_id: `patient_${cancellationData.appointment_id}`,
          doctor_id: `doctor_${cancellationData.appointment_id}`,
          status: 'cancelled',
          total_amount: appointmentAmount,
          service_type: serviceType,
          payment_method: 'chapa',
          transaction_id: `txn_${cancellationData.appointment_id}`,
          scheduled_time: scheduledTime
        });

        const result = await refundProcessor.processCancellationRefund(
          cancellationData.appointment_id,
          {
            ...cancellationData,
            cancelled_at: cancellationTime
          }
        );

        expect(result.success).toBe(true);
        expect(result.refund_amount).toBeGreaterThan(0);
        expect(result.refund_amount).toBeLessThanOrEqual(appointmentAmount);
        
        // Verify refund percentage based on timing
        const refundPercentage = result.refund_amount / appointmentAmount;
        
        if (cancellationData.hours_before_appointment < 2) {
          // Less than 2 hours: around 50% refund (with service adjustments)
          expect(refundPercentage).toBeGreaterThanOrEqual(0.39);
          expect(refundPercentage).toBeLessThanOrEqual(0.6);
        } else if (cancellationData.hours_before_appointment < 24) {
          // Less than 24 hours: around 75% refund (with service adjustments)
          expect(refundPercentage).toBeGreaterThanOrEqual(0.65);
          expect(refundPercentage).toBeLessThanOrEqual(0.85);
        } else {
          // More than 24 hours: full refund (with service adjustments)
          expect(refundPercentage).toBeGreaterThanOrEqual(0.89);
          expect(refundPercentage).toBeLessThanOrEqual(1.0);
        }

        // Penalty amount should be the difference
        expect(result.penalty_amount).toBeCloseTo(appointmentAmount - result.refund_amount, 2);
        expect(result.refund_policy).toBeDefined();

        // Restore original method
        refundProcessor.getAppointmentDetails = originalGetAppointmentDetails;
      }
    ), { numRuns: 40 });
  });

  /**
   * Property 7.3: Technical issue refunds are always full amount
   * Technical issues should always result in full refunds with
   * high priority processing.
   */
  it('should process full refunds for technical issues with high priority', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        issue_type: fc.constantFrom(
          'connection_failure', 'video_quality_issue', 'audio_problem',
          'platform_outage', 'payment_processing_error', 'system_malfunction'
        ),
        issue_description: fc.string({ minLength: 15, maxLength: 300 }),
        severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
        reported_by: fc.constantFrom('patient', 'doctor', 'system', 'admin')
      }),
      fc.float({ min: 150, max: 12000 }).filter(n => !isNaN(n) && isFinite(n)),
      async (issueData, appointmentAmount) => {
        // Add required fields for connection failure validation
        if (issueData.issue_type === 'connection_failure') {
          issueData.connection_logs = ['log1', 'log2', 'log3'];
        }

        // Mock appointment data
        const originalGetAppointmentDetails = refundProcessor.getAppointmentDetails;
        refundProcessor.getAppointmentDetails = jest.fn().mockResolvedValue({
          id: issueData.appointment_id,
          patient_id: `patient_${issueData.appointment_id}`,
          doctor_id: `doctor_${issueData.appointment_id}`,
          status: 'technical_issue',
          total_amount: appointmentAmount,
          service_type: 'video_call',
          payment_method: 'chapa',
          transaction_id: `txn_${issueData.appointment_id}`,
          scheduled_time: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        });

        const result = await refundProcessor.processTechnicalIssueRefund(
          issueData.appointment_id,
          issueData
        );

        expect(result.success).toBe(true);
        expect(result.refund_amount).toBeCloseTo(appointmentAmount, 2);
        expect(result.priority).toBe('high');
        expect(result.refund_id).toBeDefined();
        expect(result.transaction_id).toBeDefined();
        
        // Verify payment gateway was called with high priority
        expect(mockPaymentGateway.processRefund).toHaveBeenCalledWith(
          expect.objectContaining({
            refund_amount: appointmentAmount,
            priority: 'high'
          })
        );

        // Restore original method
        refundProcessor.getAppointmentDetails = originalGetAppointmentDetails;
      }
    ), { numRuns: 25 });
  });

  /**
   * Property 7.4: Bulk refunds process all appointments
   * Bulk refund operations should process all provided appointments
   * and provide accurate summary statistics.
   */
  it('should process bulk refunds correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.string({ minLength: 5, maxLength: 15 }),
        { minLength: 2, maxLength: 8 }
      ),
      fc.record({
        batch_id: fc.string({ minLength: 10, maxLength: 25 }),
        reason: fc.string({ minLength: 10, maxLength: 200 }),
        initiated_by: fc.constantFrom('admin', 'system'),
        issue_description: fc.string({ minLength: 20, maxLength: 400 })
      }),
      async (appointmentIds, bulkRefundData) => {
        // Ensure unique appointment IDs
        const uniqueAppointmentIds = [...new Set(appointmentIds)];
        
        // Mock appointment data for each ID
        const originalGetAppointmentDetails = refundProcessor.getAppointmentDetails;
        refundProcessor.getAppointmentDetails = jest.fn().mockImplementation((appointmentId) => {
          return Promise.resolve({
            id: appointmentId,
            patient_id: `patient_${appointmentId}`,
            doctor_id: `doctor_${appointmentId}`,
            status: 'technical_issue',
            total_amount: 500 + Math.random() * 1000, // Random amount between 500-1500
            service_type: 'video_call',
            payment_method: 'chapa',
            transaction_id: `txn_${appointmentId}`,
            scheduled_time: new Date(Date.now() - 30 * 60 * 1000)
          });
        });

        const result = await refundProcessor.processBulkRefunds(
          uniqueAppointmentIds,
          bulkRefundData
        );

        expect(result.success).toBe(true);
        expect(result.batch_id).toBe(bulkRefundData.batch_id);
        expect(result.total_processed).toBe(uniqueAppointmentIds.length);
        expect(result.successful_refunds + result.failed_refunds).toBe(uniqueAppointmentIds.length);
        expect(result.results).toHaveLength(uniqueAppointmentIds.length);
        
        // All results should have appointment_id and either success or error
        result.results.forEach(r => {
          expect(r.appointment_id).toBeDefined();
          expect(uniqueAppointmentIds).toContain(r.appointment_id);
          expect(typeof r.success).toBe('boolean');
          
          if (r.success) {
            expect(r.refund_id).toBeDefined();
            expect(r.refund_amount).toBeGreaterThan(0);
          } else {
            expect(r.error).toBeDefined();
          }
        });

        // Total refund amount should be sum of successful refunds
        const calculatedTotal = result.results
          .filter(r => r.success)
          .reduce((sum, r) => sum + (r.refund_amount || 0), 0);
        expect(result.total_refund_amount).toBeCloseTo(calculatedTotal, 2);

        // Verify bulk operation was logged
        expect(mockAuditService.logBulkRefundOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            batch_id: bulkRefundData.batch_id,
            total_appointments: uniqueAppointmentIds.length,
            successful_refunds: result.successful_refunds,
            failed_refunds: result.failed_refunds
          })
        );

        // Restore original method
        refundProcessor.getAppointmentDetails = originalGetAppointmentDetails;
      }
    ), { numRuns: 15 });
  });

  /**
   * Property 7.5: Refund status tracking accuracy
   * Refund status should accurately reflect the current state
   * and provide correct information throughout the process.
   */
  it('should track refund status accurately', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        refund_type: fc.constantFrom('rejection', 'cancellation', 'technical_issue'),
        amount: fc.float({ min: 100, max: 5000 }).filter(n => !isNaN(n) && isFinite(n)),
        payment_method: fc.constantFrom('chapa', 'telebirr', 'cbe_birr')
      }),
      async (refundData) => {
        // Mock appointment data
        const originalGetAppointmentDetails = refundProcessor.getAppointmentDetails;
        refundProcessor.getAppointmentDetails = jest.fn().mockResolvedValue({
          id: refundData.appointment_id,
          patient_id: `patient_${refundData.appointment_id}`,
          doctor_id: `doctor_${refundData.appointment_id}`,
          status: refundData.refund_type === 'rejection' ? 'rejected' : 'cancelled',
          total_amount: refundData.amount,
          service_type: 'video_call',
          payment_method: refundData.payment_method,
          transaction_id: `txn_${refundData.appointment_id}`,
          scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        // Process refund based on type
        let refundResult;
        if (refundData.refund_type === 'rejection') {
          refundResult = await refundProcessor.processRejectionRefund(
            refundData.appointment_id,
            { reason: 'Doctor unavailable', rejected_by: 'doctor' }
          );
        } else if (refundData.refund_type === 'technical_issue') {
          refundResult = await refundProcessor.processTechnicalIssueRefund(
            refundData.appointment_id,
            {
              issue_type: 'connection_failure',
              issue_description: 'Connection failed during consultation',
              connection_logs: ['log1', 'log2']
            }
          );
        } else {
          refundResult = await refundProcessor.processCancellationRefund(
            refundData.appointment_id,
            { reason: 'Patient cancelled', cancelled_by: 'patient' }
          );
        }

        expect(refundResult.success).toBe(true);

        // Check refund status
        const statusResult = await refundProcessor.getRefundStatus(refundResult.refund_id);

        expect(statusResult.refund_id).toBe(refundResult.refund_id);
        expect(statusResult.status).toBeDefined();
        expect(statusResult.refund_amount).toBeGreaterThan(0);
        expect(statusResult.refund_type).toBe(refundData.refund_type);
        expect(statusResult.appointment_id).toBe(refundData.appointment_id);
        expect(statusResult.initiated_at).toBeInstanceOf(Date);
        expect(statusResult.estimated_completion).toBeInstanceOf(Date);
        
        // Estimated completion should be in the future
        expect(statusResult.estimated_completion.getTime()).toBeGreaterThan(Date.now());

        // Restore original method
        refundProcessor.getAppointmentDetails = originalGetAppointmentDetails;
      }
    ), { numRuns: 25 });
  });

  /**
   * Property 7.6: Notification system completeness
   * All refund operations should trigger appropriate notifications
   * to relevant parties (patient, doctor, admin).
   */
  it('should send complete notifications for all refund types', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        refund_type: fc.constantFrom('rejection', 'cancellation', 'technical_issue'),
        amount: fc.float({ min: 200, max: 3000 })
      }),
      async (refundData) => {
        // Mock appointment data
        const originalGetAppointmentDetails = refundProcessor.getAppointmentDetails;
        refundProcessor.getAppointmentDetails = jest.fn().mockResolvedValue({
          id: refundData.appointment_id,
          patient_id: `patient_${refundData.appointment_id}`,
          doctor_id: `doctor_${refundData.appointment_id}`,
          status: refundData.refund_type === 'rejection' ? 'rejected' : 'cancelled',
          total_amount: refundData.amount,
          service_type: 'video_call',
          payment_method: 'chapa',
          transaction_id: `txn_${refundData.appointment_id}`,
          scheduled_time: new Date(Date.now() + 12 * 60 * 60 * 1000)
        });

        // Process refund
        let refundResult;
        if (refundData.refund_type === 'rejection') {
          refundResult = await refundProcessor.processRejectionRefund(
            refundData.appointment_id,
            { reason: 'Doctor rejected', rejected_by: 'doctor' }
          );
        } else if (refundData.refund_type === 'technical_issue') {
          refundResult = await refundProcessor.processTechnicalIssueRefund(
            refundData.appointment_id,
            {
              issue_type: 'platform_outage',
              issue_description: 'Platform was down during appointment'
            }
          );
        } else {
          refundResult = await refundProcessor.processCancellationRefund(
            refundData.appointment_id,
            { reason: 'Patient cancelled', cancelled_by: 'patient' }
          );
        }

        expect(refundResult.success).toBe(true);

        // Verify notifications were sent
        expect(mockNotificationService.sendNotification).toHaveBeenCalled();
        
        const notificationCalls = mockNotificationService.sendNotification.mock.calls;
        
        // Should have at least one notification (to patient)
        expect(notificationCalls.length).toBeGreaterThanOrEqual(1);
        
        // Check patient notification
        const patientNotification = notificationCalls.find(call => 
          call[0].user_id === `patient_${refundData.appointment_id}` &&
          call[0].type === 'refund_initiated'
        );
        expect(patientNotification).toBeDefined();
        expect(patientNotification[0].data.refund_id).toBe(refundResult.refund_id);
        expect(patientNotification[0].data.refund_amount).toBeGreaterThan(0);

        // For non-rejection refunds, doctor should also be notified
        if (refundData.refund_type !== 'rejection') {
          const doctorNotification = notificationCalls.find(call => 
            call[0].user_id === `doctor_${refundData.appointment_id}` &&
            call[0].type === 'appointment_refunded'
          );
          expect(doctorNotification).toBeDefined();
        }

        // Restore original method
        refundProcessor.getAppointmentDetails = originalGetAppointmentDetails;
      }
    ), { numRuns: 20 });
  });

  /**
   * Property 7.7: Audit trail completeness for refunds
   * All refund operations should generate comprehensive audit logs
   * for compliance and dispute resolution.
   */
  it('should generate complete audit trails for all refund operations', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        refund_type: fc.constantFrom('rejection', 'cancellation', 'technical_issue'),
        amount: fc.float({ min: 150, max: 4000 })
      }),
      async (refundData) => {
        // Mock appointment data
        const originalGetAppointmentDetails = refundProcessor.getAppointmentDetails;
        refundProcessor.getAppointmentDetails = jest.fn().mockResolvedValue({
          id: refundData.appointment_id,
          patient_id: `patient_${refundData.appointment_id}`,
          doctor_id: `doctor_${refundData.appointment_id}`,
          status: refundData.refund_type === 'rejection' ? 'rejected' : 'cancelled',
          total_amount: refundData.amount,
          service_type: 'in_person',
          payment_method: 'chapa',
          transaction_id: `txn_${refundData.appointment_id}`,
          scheduled_time: new Date(Date.now() + 6 * 60 * 60 * 1000)
        });

        // Process refund
        let refundResult;
        if (refundData.refund_type === 'rejection') {
          refundResult = await refundProcessor.processRejectionRefund(
            refundData.appointment_id,
            { reason: 'Doctor emergency', rejected_by: 'doctor' }
          );
        } else if (refundData.refund_type === 'technical_issue') {
          refundResult = await refundProcessor.processTechnicalIssueRefund(
            refundData.appointment_id,
            {
              issue_type: 'system_malfunction',
              issue_description: 'System crashed during consultation'
            }
          );
        } else {
          refundResult = await refundProcessor.processCancellationRefund(
            refundData.appointment_id,
            { reason: 'Emergency cancellation', cancelled_by: 'patient' }
          );
        }

        expect(refundResult.success).toBe(true);

        // Verify audit logging was called
        expect(mockAuditService.logRefundProcessing).toHaveBeenCalledWith(
          expect.objectContaining({
            id: refundResult.refund_id,
            appointment_id: refundData.appointment_id,
            refund_type: refundData.refund_type,
            refund_amount: expect.any(Number),
            status: 'initiated'
          }),
          expect.objectContaining({
            status: 'processing',
            transaction_id: expect.any(String)
          })
        );

        // Restore original method
        refundProcessor.getAppointmentDetails = originalGetAppointmentDetails;
      }
    ), { numRuns: 20 });
  });
});