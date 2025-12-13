/**
 * Property Test: Payment holding for standard services
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 4.4: Property test for payment holding**
 * **Property 5: Payment holding for standard services**
 * **Validates: Requirements 6.2, 5.4, 5.5**
 * 
 * Tests payment holding logic, consultation completion triggers,
 * payment release to doctors, and platform fee deduction.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { PaymentHoldingManager } from '../src/services/PaymentHoldingManager.js';

describe('Property Test: Payment Holding for Standard Services', () => {
  let paymentHoldingManager;
  let mockModels;
  let mockNotificationService;
  let mockAuditService;

  beforeEach(() => {
    // Mock timers to prevent 24-hour setTimeout from blocking tests
    jest.useFakeTimers();
    mockModels = {};
    mockNotificationService = {
      sendNotification: jest.fn().mockResolvedValue({ success: true })
    };
    mockAuditService = {
      logPaymentHolding: jest.fn().mockResolvedValue({ logged: true }),
      logPaymentRelease: jest.fn().mockResolvedValue({ logged: true }),
      logPaymentRefund: jest.fn().mockResolvedValue({ logged: true })
    };

    paymentHoldingManager = new PaymentHoldingManager(
      mockModels,
      mockNotificationService,
      mockAuditService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  /**
   * Property 5.1: Payment holding preserves total amount
   * For any valid payment and appointment data, the sum of platform fee
   * and net doctor amount should equal the original payment amount.
   */
  it('should preserve total payment amount when holding payments', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.float({ min: 100, max: 20000 }),
        payment_method: fc.constantFrom('chapa', 'telebirr', 'cbe_birr'),
        transaction_id: fc.string({ minLength: 10, maxLength: 50 })
      }),
      fc.record({
        id: fc.string({ minLength: 5, maxLength: 20 }),
        patient_id: fc.string({ minLength: 5, maxLength: 20 }),
        doctor_id: fc.string({ minLength: 5, maxLength: 20 }),
        service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
        scheduled_time: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
      }),
      async (paymentData, appointmentData) => {
        const result = await paymentHoldingManager.holdPayment(paymentData, appointmentData);

        expect(result.success).toBe(true);
        expect(result.held_amount).toBeCloseTo(paymentData.amount, 2);
        
        // Platform fee + net doctor amount should equal held amount
        const totalCalculated = result.platform_fee + result.net_doctor_amount;
        expect(totalCalculated).toBeCloseTo(result.held_amount, 2);
        
        // Platform fee should be within expected range (2-5% + min/max constraints)
        expect(result.platform_fee).toBeGreaterThanOrEqual(10); // Minimum fee
        expect(result.platform_fee).toBeLessThanOrEqual(200); // Maximum fee
        expect(result.platform_fee).toBeLessThanOrEqual(paymentData.amount * 0.05); // Max 5%
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 5.2: Platform fee calculation consistency
   * Platform fees should be calculated consistently based on service type
   * and amount, with proper minimum and maximum constraints.
   */
  it('should calculate platform fees consistently', async () => {
    await fc.assert(fc.asyncProperty(
      fc.float({ min: 100, max: 20000 }),
      fc.constantFrom('in_person', 'video_call', 'chat'),
      async (amount, serviceType) => {
        const paymentData = {
          amount: amount,
          payment_method: 'chapa',
          transaction_id: `test_${Date.now()}`
        };

        const appointmentData = {
          id: `appt_${Date.now()}`,
          patient_id: `patient_${Date.now()}`,
          doctor_id: `doctor_${Date.now()}`,
          service_type: serviceType,
          scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        const result1 = await paymentHoldingManager.holdPayment(paymentData, appointmentData);
        const result2 = await paymentHoldingManager.holdPayment(paymentData, appointmentData);

        // Same inputs should produce same platform fee
        expect(result1.platform_fee).toBeCloseTo(result2.platform_fee, 2);
        
        // Fee should respect service type rates
        const expectedRates = {
          'in_person': 0.05,
          'video_call': 0.03,
          'chat': 0.02
        };
        
        const expectedFee = Math.max(10, Math.min(200, amount * expectedRates[serviceType]));
        expect(result1.platform_fee).toBeCloseTo(expectedFee, 2);
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 5.3: Consultation completion triggers release
   * When consultation is completed with valid conditions,
   * payment should be released successfully.
   */
  it('should release payments when consultation is completed', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.float({ min: 100, max: 5000 }),
        payment_method: fc.constantFrom('chapa', 'telebirr'),
        transaction_id: fc.string({ minLength: 10, maxLength: 30 })
      }),
      fc.record({
        completed_by: fc.constantFrom('doctor', 'patient', 'system'),
        completion_notes: fc.string({ maxLength: 200 }),
        doctor_confirmed: fc.boolean()
      }),
      async (paymentData, completionData) => {
        const appointmentData = {
          id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          patient_id: `patient_${Date.now()}`,
          doctor_id: `doctor_${Date.now()}`,
          service_type: 'video_call',
          scheduled_time: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        };

        // Hold payment first
        const holdResult = await paymentHoldingManager.holdPayment(paymentData, appointmentData);
        expect(holdResult.success).toBe(true);

        // Complete consultation
        const completionResult = await paymentHoldingManager.processConsultationCompletion(
          appointmentData.id,
          {
            ...completionData,
            doctor_confirmed: true // Ensure release conditions are met
          }
        );

        expect(completionResult.success).toBe(true);
        expect(completionResult.processed_count).toBeGreaterThan(0);
        expect(completionResult.successful_releases).toBeGreaterThan(0);
        
        // Check that payment was released
        if (completionResult.results.length > 0) {
          const releaseResult = completionResult.results[0].result;
          if (releaseResult) {
            expect(releaseResult.success).toBe(true);
            expect(releaseResult.doctor_amount).toBeGreaterThan(0);
            expect(releaseResult.platform_fee).toBeGreaterThan(0);
            expect(releaseResult.release_trigger).toBe('consultation_completed');
          }
        }
      }
    ), { numRuns: 25 });
  });

  /**
   * Property 5.4: Refund processing for cancellations
   * When appointments are cancelled or rejected, full refunds
   * should be processed correctly.
   */
  it('should process full refunds for cancelled appointments', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.float({ min: 100, max: 10000 }),
        payment_method: fc.constantFrom('chapa', 'telebirr', 'cbe_birr'),
        transaction_id: fc.string({ minLength: 10, maxLength: 40 })
      }),
      fc.record({
        reason: fc.constantFrom('patient_cancelled', 'doctor_rejected', 'technical_issue', 'no_show'),
        cancelled_by: fc.constantFrom('patient', 'doctor', 'admin', 'system'),
        cancellation_notes: fc.string({ maxLength: 300 })
      }),
      async (paymentData, refundData) => {
        const appointmentData = {
          id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          patient_id: `patient_${Date.now()}`,
          doctor_id: `doctor_${Date.now()}`,
          service_type: 'in_person',
          scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        // Hold payment first
        const holdResult = await paymentHoldingManager.holdPayment(paymentData, appointmentData);
        expect(holdResult.success).toBe(true);

        // Process refund
        const refundResult = await paymentHoldingManager.processRefund(
          holdResult.holding_id,
          refundData
        );

        expect(refundResult.success).toBe(true);
        expect(refundResult.refund_amount).toBeCloseTo(paymentData.amount, 2);
        expect(refundResult.refund_reason).toBe(refundData.reason);
        expect(refundResult.refund_id).toBeDefined();
        expect(refundResult.transaction_id).toBeDefined();
        expect(refundResult.refunded_at).toBeInstanceOf(Date);
      }
    ), { numRuns: 20 });
  });

  /**
   * Property 5.5: Holding status tracking accuracy
   * Payment holding status should accurately reflect the current
   * state and provide correct information.
   */
  it('should track holding status accurately', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.float({ min: 200, max: 8000 }),
        payment_method: fc.constantFrom('chapa', 'telebirr'),
        transaction_id: fc.string({ minLength: 15, maxLength: 35 })
      }),
      fc.constantFrom('in_person', 'video_call', 'chat'),
      async (paymentData, serviceType) => {
        const appointmentData = {
          id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          patient_id: `patient_${Date.now()}`,
          doctor_id: `doctor_${Date.now()}`,
          service_type: serviceType,
          scheduled_time: new Date(Date.now() + 12 * 60 * 60 * 1000)
        };

        // Hold payment
        const holdResult = await paymentHoldingManager.holdPayment(paymentData, appointmentData);
        expect(holdResult.success).toBe(true);

        // Check status
        const statusResult = await paymentHoldingManager.getHoldingStatus(holdResult.holding_id);

        expect(statusResult.holding_id).toBe(holdResult.holding_id);
        expect(statusResult.status).toBe('held');
        expect(statusResult.held_amount).toBeCloseTo(paymentData.amount, 2);
        expect(statusResult.platform_fee).toBeGreaterThan(0);
        expect(statusResult.net_doctor_amount).toBeGreaterThan(0);
        expect(statusResult.appointment_id).toBe(appointmentData.id);
        expect(statusResult.doctor_id).toBe(appointmentData.doctor_id);
        expect(statusResult.patient_id).toBe(appointmentData.patient_id);
        expect(statusResult.held_at).toBeInstanceOf(Date);
        expect(statusResult.release_conditions).toBeInstanceOf(Array);
        expect(statusResult.estimated_release_time).toBeInstanceOf(Date);
        
        // Estimated release time should be in the future
        expect(statusResult.estimated_release_time.getTime()).toBeGreaterThan(Date.now());
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 5.6: Release conditions validation
   * Payment release should only occur when all required
   * conditions are properly validated.
   */
  it('should validate release conditions properly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.float({ min: 150, max: 6000 }),
        payment_method: fc.constantFrom('chapa', 'telebirr'),
        transaction_id: fc.string({ minLength: 12, maxLength: 30 })
      }),
      fc.record({
        doctor_confirmed: fc.boolean(),
        completion_notes: fc.string({ maxLength: 150 }),
        trigger_type: fc.constantFrom('consultation_completed', 'automatic_timeout', 'manual_release')
      }),
      async (paymentData, releaseConditions) => {
        const appointmentData = {
          id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          patient_id: `patient_${Date.now()}`,
          doctor_id: `doctor_${Date.now()}`,
          service_type: 'video_call',
          scheduled_time: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        };

        // Hold payment
        const holdResult = await paymentHoldingManager.holdPayment(paymentData, appointmentData);
        expect(holdResult.success).toBe(true);

        // Attempt release with conditions
        const releaseData = {
          trigger_type: releaseConditions.trigger_type,
          triggered_by: 'test',
          triggered_at: new Date(),
          completion_data: {
            doctor_confirmed: releaseConditions.doctor_confirmed,
            completion_notes: releaseConditions.completion_notes
          }
        };

        try {
          const releaseResult = await paymentHoldingManager.releasePayment(
            holdResult.holding_id,
            releaseData
          );

          // If release succeeded, conditions must have been met
          if (releaseResult.success) {
            expect(releaseResult.doctor_amount).toBeGreaterThan(0);
            expect(releaseResult.platform_fee).toBeGreaterThan(0);
            expect(releaseResult.release_trigger).toBe(releaseConditions.trigger_type);
            
            // For consultation_completed trigger, doctor confirmation should be true
            if (releaseConditions.trigger_type === 'consultation_completed') {
              expect(releaseConditions.doctor_confirmed).toBe(true);
            }
          }
        } catch (error) {
          // If release failed, it should be due to unmet conditions
          expect(error.message).toContain('conditions not met');
        }
      }
    ), { numRuns: 25 });
  });

  /**
   * Property 5.7: Multiple payments for same appointment
   * System should handle multiple payment holdings for the same
   * appointment correctly (e.g., partial payments, add-on services).
   */
  it('should handle multiple payments for same appointment', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          amount: fc.float({ min: 50, max: 2000 }),
          payment_method: fc.constantFrom('chapa', 'telebirr'),
          transaction_id: fc.string({ minLength: 10, maxLength: 25 })
        }),
        { minLength: 2, maxLength: 5 }
      ),
      async (paymentDataArray) => {
        const appointmentData = {
          id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          patient_id: `patient_${Date.now()}`,
          doctor_id: `doctor_${Date.now()}`,
          service_type: 'in_person',
          scheduled_time: new Date(Date.now() + 6 * 60 * 60 * 1000)
        };

        const holdResults = [];
        let totalHeldAmount = 0;
        let totalPlatformFees = 0;

        // Hold multiple payments
        for (const paymentData of paymentDataArray) {
          const holdResult = await paymentHoldingManager.holdPayment(paymentData, appointmentData);
          expect(holdResult.success).toBe(true);
          
          holdResults.push(holdResult);
          totalHeldAmount += holdResult.held_amount;
          totalPlatformFees += holdResult.platform_fee;
        }

        // Complete consultation to trigger releases
        const completionResult = await paymentHoldingManager.processConsultationCompletion(
          appointmentData.id,
          {
            completed_by: 'doctor',
            doctor_confirmed: true,
            completion_notes: 'Multiple payments test'
          }
        );

        expect(completionResult.success).toBe(true);
        expect(completionResult.processed_count).toBe(paymentDataArray.length);
        
        // All payments should be processed
        const totalOriginalAmount = paymentDataArray.reduce((sum, p) => sum + p.amount, 0);
        expect(totalHeldAmount).toBeCloseTo(totalOriginalAmount, 2);
        
        // Platform fees should be calculated for each payment
        expect(totalPlatformFees).toBeGreaterThan(0);
        expect(completionResult.successful_releases).toBe(paymentDataArray.length);
      }
    ), { numRuns: 15 });
  });

  /**
   * Property 5.8: Audit trail completeness
   * All payment holding operations should generate proper audit logs
   * for compliance and tracking purposes.
   */
  it('should generate complete audit trails', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.float({ min: 100, max: 4000 }),
        payment_method: fc.constantFrom('chapa', 'telebirr', 'cbe_birr'),
        transaction_id: fc.string({ minLength: 10, maxLength: 30 })
      }),
      fc.constantFrom('hold_and_release', 'hold_and_refund'),
      async (paymentData, testScenario) => {
        const appointmentData = {
          id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          patient_id: `patient_${Date.now()}`,
          doctor_id: `doctor_${Date.now()}`,
          service_type: 'chat',
          scheduled_time: new Date(Date.now() + 2 * 60 * 60 * 1000)
        };

        // Hold payment
        const holdResult = await paymentHoldingManager.holdPayment(paymentData, appointmentData);
        expect(holdResult.success).toBe(true);

        // Verify holding audit log
        expect(mockAuditService.logPaymentHolding).toHaveBeenCalledWith(
          expect.objectContaining({
            id: holdResult.holding_id,
            held_amount: paymentData.amount,
            status: 'held'
          })
        );

        if (testScenario === 'hold_and_release') {
          // Release payment
          const releaseResult = await paymentHoldingManager.releasePayment(
            holdResult.holding_id,
            {
              trigger_type: 'consultation_completed',
              triggered_by: 'test',
              triggered_at: new Date(),
              completion_data: { doctor_confirmed: true }
            }
          );

          expect(releaseResult.success).toBe(true);
          
          // Verify release audit log
          expect(mockAuditService.logPaymentRelease).toHaveBeenCalledWith(
            expect.objectContaining({
              id: holdResult.holding_id,
              status: 'released'
            }),
            expect.objectContaining({
              release_id: releaseResult.release_id,
              doctor_amount: releaseResult.doctor_amount
            })
          );
        } else {
          // Refund payment
          const refundResult = await paymentHoldingManager.processRefund(
            holdResult.holding_id,
            {
              reason: 'patient_cancelled',
              cancelled_by: 'patient',
              cancellation_notes: 'Test refund'
            }
          );

          expect(refundResult.success).toBe(true);
          
          // Verify refund audit log
          expect(mockAuditService.logPaymentRefund).toHaveBeenCalledWith(
            expect.objectContaining({
              id: holdResult.holding_id,
              status: 'refunded'
            }),
            expect.objectContaining({
              refund_id: refundResult.refund_id,
              refund_amount: refundResult.refund_amount
            })
          );
        }
      }
    ), { numRuns: 20 });
  });
});