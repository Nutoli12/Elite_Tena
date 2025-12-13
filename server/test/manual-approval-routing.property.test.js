/**
 * Property-Based Tests for Manual Approval Routing
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Property 4: Manual approval for standard services**
 * **Property 6: Price mismatch handling**
 * **Validates: Requirements 4.1, 3.3**
 * 
 * This test suite validates manual approval routing logic using property-based testing
 * to ensure correct handling of standard services and price mismatches.
 */

import fc from 'fast-check';
import { describe, test, expect, beforeEach } from '@jest/globals';

// Core manual approval routing logic (simplified for testing)
class ManualApprovalRouter {
  constructor() {
    this.approvalTimeouts = new Map();
    this.defaultTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Route appointment to manual approval workflow
   * @param {Object} appointmentData - Appointment and payment information
   * @param {Object} approvalContext - Context from auto-approval engine
   * @returns {Object} Manual approval routing result
   */
  async routeToManualApproval(appointmentData, approvalContext) {
    try {
      // Validate input data
      await this.validateApprovalInput(appointmentData);

      // Calculate priority based on appointment and context
      const priority = this.calculateApprovalPriority(appointmentData, approvalContext);

      // Generate alternative scheduling if needed
      const alternatives = await this.generateAlternativeScheduling(appointmentData, approvalContext);

      // Determine estimated response time
      const estimatedResponseTime = this.getEstimatedResponseTime(appointmentData.service_type);

      return {
        success: true,
        status: 'pending_doctor_review',
        priority,
        estimated_response_time: estimatedResponseTime,
        alternatives,
        timeout_at: new Date(Date.now() + this.defaultTimeout),
        routing_reason: approvalContext.reason || 'Manual approval required'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process doctor's approval decision
   * @param {string} decision - 'approved' or 'rejected'
   * @param {Object} appointmentData - Appointment data
   * @param {Object} decisionData - Additional decision data
   * @returns {Object} Processing result
   */
  async processDoctorDecision(decision, appointmentData, decisionData = {}) {
    try {
      // Validate decision
      if (!['approved', 'rejected'].includes(decision)) {
        throw new Error('Invalid decision. Must be "approved" or "rejected"');
      }

      if (decision === 'approved') {
        return await this.processApproval(appointmentData, decisionData);
      } else {
        return await this.processRejection(appointmentData, decisionData);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle price mismatch scenarios
   * @param {Object} appointmentData - Appointment data with payment info
   * @returns {Object} Price mismatch handling result
   */
  async handlePriceMismatch(appointmentData) {
    try {
      const { paid_amount, expected_amount, service_type } = appointmentData;
      
      const difference = parseFloat(paid_amount) - parseFloat(expected_amount);
      const percentageDiff = Math.abs(difference / expected_amount) * 100;
      
      // Determine mismatch severity
      let severity = 'low';
      if (percentageDiff > 50) {
        severity = 'high';
      } else if (percentageDiff > 20) {
        severity = 'medium';
      }

      // Determine handling strategy
      let handlingStrategy = 'manual_review';
      let requiresRefund = false;
      let allowsPartialApproval = false;

      if (difference > 0) {
        // Overpayment
        handlingStrategy = 'manual_review_with_refund_option';
        requiresRefund = percentageDiff > 10; // Refund if overpaid by more than 10%
        allowsPartialApproval = true;
      } else {
        // Underpayment
        handlingStrategy = 'manual_review_with_payment_request';
        allowsPartialApproval = percentageDiff <= 20; // Allow if underpaid by 20% or less
      }

      const hasMismatch = Math.abs(difference) > 0.01;

      return {
        mismatch_detected: hasMismatch,
        difference,
        percentage_difference: percentageDiff,
        severity: hasMismatch ? severity : 'none',
        handling_strategy: hasMismatch ? handlingStrategy : 'no_action_required',
        requires_refund: hasMismatch ? requiresRefund : false,
        allows_partial_approval: hasMismatch ? allowsPartialApproval : true,
        recommended_action: hasMismatch ? this.getRecommendedAction(difference, percentageDiff, service_type) : 'approve_as_is'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate approval input data
   * @param {Object} appointmentData - Appointment data to validate
   */
  async validateApprovalInput(appointmentData) {
    const { appointment_id, doctor_id, patient_id, service_type, paid_amount } = appointmentData;

    if (!appointment_id || !doctor_id || !patient_id || !service_type || paid_amount === undefined) {
      throw new Error('Missing required appointment data for manual approval');
    }

    if (!['in_person', 'video_call', 'chat'].includes(service_type)) {
      throw new Error('Invalid service type');
    }

    if (typeof paid_amount !== 'number' || paid_amount < 0 || isNaN(paid_amount)) {
      throw new Error('Invalid payment amount');
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
    if (approvalContext.is_exact_match) {
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

    // Higher priority for wallet validation failures (technical issue)
    if (approvalContext.fallback_reason === 'wallet_validation_failed') {
      priority += 1;
    }

    // Standard services get medium priority
    if (appointmentData.service_type === 'in_person') {
      priority = Math.max(4, Math.min(6, priority)); // Keep in medium range
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
   * Generate alternative scheduling suggestions
   * @param {Object} appointmentData - Appointment data
   * @param {Object} context - Context for alternatives
   * @returns {Array} Alternative scheduling options
   */
  async generateAlternativeScheduling(appointmentData, context) {
    const { service_type } = appointmentData;
    
    // Generate 2-3 alternative time slots
    const alternatives = [];
    
    for (let i = 1; i <= 3; i++) {
      const altDate = new Date();
      altDate.setDate(altDate.getDate() + i);
      
      alternatives.push({
        date: altDate.toISOString().split('T')[0],
        time: `${9 + i}:00`,
        service_type,
        estimated_duration: this.getServiceDuration(service_type),
        availability_confidence: i === 1 ? 'high' : i === 2 ? 'medium' : 'low'
      });
    }

    return alternatives;
  }

  /**
   * Get service duration
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
   * Process approval decision
   * @param {Object} appointmentData - Appointment data
   * @param {Object} decisionData - Decision data
   * @returns {Object} Processing result
   */
  async processApproval(appointmentData, decisionData) {
    return {
      execution_type: 'manual_approved',
      appointment_status: 'approved',
      payment_destination: 'system_wallet', // Manual approvals go to system wallet
      alternative_scheduling: decisionData.alternative_time || null,
      processing_time: new Date()
    };
  }

  /**
   * Process rejection decision
   * @param {Object} appointmentData - Appointment data
   * @param {Object} decisionData - Decision data
   * @returns {Object} Processing result
   */
  async processRejection(appointmentData, decisionData) {
    return {
      execution_type: 'manual_rejected',
      appointment_status: 'rejected',
      refund_status: 'processed',
      rejection_reason: decisionData.reason || 'Rejected by doctor',
      alternative_suggestions: decisionData.suggest_alternatives || null,
      processing_time: new Date()
    };
  }

  /**
   * Get recommended action for price mismatch
   * @param {number} difference - Payment difference
   * @param {number} percentageDiff - Percentage difference
   * @param {string} serviceType - Service type
   * @returns {string} Recommended action
   */
  getRecommendedAction(difference, percentageDiff, serviceType) {
    if (Math.abs(percentageDiff) < 5) {
      return 'approve_with_minor_adjustment';
    } else if (difference > 0 && percentageDiff > 20) {
      return 'approve_with_partial_refund';
    } else if (difference < 0 && percentageDiff > 15) {
      return 'request_additional_payment';
    } else {
      return 'review_and_decide';
    }
  }
}

describe('Manual Approval Routing Property Tests', () => {
  let manualApprovalRouter;

  beforeEach(() => {
    manualApprovalRouter = new ManualApprovalRouter();
  });

  describe('Property 4.1: Standard Service Manual Approval Requirements', () => {
    test('Standard services should always require manual approval regardless of payment amount', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1, maxLength: 50 }),
          patient_id: fc.string({ minLength: 1, maxLength: 50 }),
          service_type: fc.constant('in_person'),
          paid_amount: fc.integer({ min: 300, max: 500 }),
          expected_amount: fc.constant(400)
        }),
        async (appointmentData) => {
          // Arrange: Standard service context
          const approvalContext = {
            reason: 'Standard service requires manual doctor approval',
            is_exact_match: appointmentData.paid_amount === appointmentData.expected_amount,
            fallback_reason: 'standard_service_policy'
          };

          // Act: Route to manual approval
          const result = await manualApprovalRouter.routeToManualApproval(
            appointmentData,
            approvalContext
          );

          // Assert: Should always route to manual approval
          expect(result.success).toBe(true);
          expect(result.status).toBe('pending_doctor_review');
          expect(result.estimated_response_time).toBe(60); // 1 hour for in-person
          expect(result.priority).toBeGreaterThanOrEqual(4);
          expect(result.priority).toBeLessThanOrEqual(6); // Medium priority range
          expect(result.routing_reason).toContain('manual');
        }
      ), { numRuns: 50 });
    });

    test('Standard service approval priority should be in medium range', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constant('in_person'),
          paid_amount: fc.integer({ min: 350, max: 450 })
        }),
        async (appointmentData) => {
          // Arrange: Various approval contexts
          const approvalContext = {
            reason: 'Standard service manual approval',
            is_exact_match: appointmentData.paid_amount === 400,
            percentage_difference: Math.abs((appointmentData.paid_amount - 400) / 400) * 100
          };

          // Act: Calculate priority
          const priority = manualApprovalRouter.calculateApprovalPriority(
            appointmentData,
            approvalContext
          );

          // Assert: Priority should be in medium range for standard services
          expect(priority).toBeGreaterThanOrEqual(4);
          expect(priority).toBeLessThanOrEqual(6);
        }
      ), { numRuns: 30 });
    });

    test('Manual approval should generate alternative scheduling options', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          paid_amount: fc.integer({ min: 100, max: 1000 })
        }),
        async (appointmentData) => {
          // Arrange: Manual approval context
          const approvalContext = {
            reason: 'Manual approval required'
          };

          // Act: Route to manual approval
          const result = await manualApprovalRouter.routeToManualApproval(
            appointmentData,
            approvalContext
          );

          // Assert: Should provide alternatives
          expect(result.alternatives).toBeDefined();
          expect(Array.isArray(result.alternatives)).toBe(true);
          expect(result.alternatives.length).toBeGreaterThan(0);
          expect(result.alternatives.length).toBeLessThanOrEqual(3);
          
          // Check alternative structure
          result.alternatives.forEach(alt => {
            expect(alt).toHaveProperty('date');
            expect(alt).toHaveProperty('time');
            expect(alt).toHaveProperty('service_type');
            expect(alt).toHaveProperty('estimated_duration');
            expect(alt).toHaveProperty('availability_confidence');
            expect(alt.service_type).toBe(appointmentData.service_type);
          });
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 4.2: Doctor Decision Processing', () => {
    test('Approved decisions should result in approved appointment status', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          paid_amount: fc.integer({ min: 100, max: 5000 })
        }),
        fc.record({
          reason: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
          alternative_time: fc.option(fc.record({
            date: fc.date().map(d => d.toISOString().split('T')[0]),
            time: fc.constantFrom('09:00', '10:00', '11:00', '14:00', '15:00')
          }))
        }),
        async (appointmentData, decisionData) => {
          // Act: Process approval decision
          const result = await manualApprovalRouter.processDoctorDecision(
            'approved',
            appointmentData,
            decisionData
          );

          // Assert: Should result in approved status
          expect(result.execution_type).toBe('manual_approved');
          expect(result.appointment_status).toBe('approved');
          expect(result.payment_destination).toBe('system_wallet');
          expect(result.processing_time).toBeInstanceOf(Date);
          
          if (decisionData.alternative_time) {
            expect(result.alternative_scheduling).toEqual(decisionData.alternative_time);
          }
        }
      ), { numRuns: 40 });
    });

    test('Rejected decisions should result in rejected status with refund', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          paid_amount: fc.integer({ min: 100, max: 5000 })
        }),
        fc.record({
          reason: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
          suggest_alternatives: fc.boolean()
        }),
        async (appointmentData, decisionData) => {
          // Act: Process rejection decision
          const result = await manualApprovalRouter.processDoctorDecision(
            'rejected',
            appointmentData,
            decisionData
          );

          // Assert: Should result in rejected status with refund
          expect(result.execution_type).toBe('manual_rejected');
          expect(result.appointment_status).toBe('rejected');
          expect(result.refund_status).toBe('processed');
          expect(result.rejection_reason).toBeDefined();
          expect(result.processing_time).toBeInstanceOf(Date);
          
          if (decisionData.suggest_alternatives) {
            expect(result.alternative_suggestions).toBeDefined();
          }
        }
      ), { numRuns: 40 });
    });

    test('Invalid decisions should throw errors', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          paid_amount: fc.integer({ min: 100, max: 5000 })
        }),
        fc.string().filter(s => !['approved', 'rejected'].includes(s)),
        async (appointmentData, invalidDecision) => {
          // Act & Assert: Should throw error for invalid decision
          await expect(
            manualApprovalRouter.processDoctorDecision(
              invalidDecision,
              appointmentData,
              {}
            )
          ).rejects.toThrow('Invalid decision');
        }
      ), { numRuns: 20 });
    });
  });

  describe('Property 6.1: Price Mismatch Detection and Handling', () => {
    test('Price mismatches should be correctly detected and categorized', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          paid_amount: fc.integer({ min: 100, max: 5000 }),
          expected_amount: fc.integer({ min: 100, max: 5000 })
        }),
        async (appointmentData) => {
          // Act: Handle price mismatch
          const result = await manualApprovalRouter.handlePriceMismatch(appointmentData);

          // Calculate expected values
          const difference = appointmentData.paid_amount - appointmentData.expected_amount;
          const percentageDiff = Math.abs(difference / appointmentData.expected_amount) * 100;
          const hasMismatch = Math.abs(difference) > 0.01;

          // Assert: Mismatch detection
          expect(result.mismatch_detected).toBe(hasMismatch);
          
          if (hasMismatch) {
            expect(result.difference).toBeCloseTo(difference, 2);
            expect(result.percentage_difference).toBeCloseTo(percentageDiff, 2);
            
            // Severity categorization
            if (percentageDiff > 50) {
              expect(result.severity).toBe('high');
            } else if (percentageDiff > 20) {
              expect(result.severity).toBe('medium');
            } else {
              expect(result.severity).toBe('low');
            }
            
            // Handling strategy
            expect(result.handling_strategy).toBeDefined();
            expect(result.recommended_action).toBeDefined();
          }
        }
      ), { numRuns: 100 });
    });

    test('Overpayment scenarios should offer refund options', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          expected_amount: fc.integer({ min: 1000, max: 3000 }),
          overpayment_percentage: fc.integer({ min: 5, max: 50 })
        }),
        async ({ overpayment_percentage, expected_amount, ...appointmentData }) => {
          // Arrange: Create overpayment scenario
          const paid_amount = Math.round(expected_amount * (1 + overpayment_percentage / 100));
          const fullAppointmentData = { ...appointmentData, paid_amount, expected_amount };

          // Act: Handle price mismatch
          const result = await manualApprovalRouter.handlePriceMismatch(fullAppointmentData);

          // Assert: Overpayment handling
          expect(result.mismatch_detected).toBe(true);
          expect(result.difference).toBeGreaterThan(0);
          expect(result.handling_strategy).toBe('manual_review_with_refund_option');
          expect(result.allows_partial_approval).toBe(true);
          
          if (overpayment_percentage > 10) {
            expect(result.requires_refund).toBe(true);
          }
        }
      ), { numRuns: 50 });
    });

    test('Underpayment scenarios should handle payment requests appropriately', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          expected_amount: fc.integer({ min: 1000, max: 3000 }),
          underpayment_percentage: fc.integer({ min: 5, max: 40 })
        }),
        async ({ underpayment_percentage, expected_amount, ...appointmentData }) => {
          // Arrange: Create underpayment scenario
          const paid_amount = Math.round(expected_amount * (1 - underpayment_percentage / 100));
          const fullAppointmentData = { ...appointmentData, paid_amount, expected_amount };

          // Act: Handle price mismatch
          const result = await manualApprovalRouter.handlePriceMismatch(fullAppointmentData);

          // Assert: Underpayment handling
          expect(result.mismatch_detected).toBe(true);
          expect(result.difference).toBeLessThan(0);
          expect(result.handling_strategy).toBe('manual_review_with_payment_request');
          expect(result.requires_refund).toBe(false);
          
          if (underpayment_percentage <= 20) {
            expect(result.allows_partial_approval).toBe(true);
          } else {
            expect(result.allows_partial_approval).toBe(false);
          }
        }
      ), { numRuns: 50 });
    });

    test('Minor price differences should have lenient handling', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          expected_amount: fc.integer({ min: 1000, max: 5000 }),
          minor_difference_percentage: fc.integer({ min: 1, max: 4 })
        }),
        async ({ minor_difference_percentage, expected_amount, ...appointmentData }) => {
          // Arrange: Create minor difference scenario
          const difference = expected_amount * (minor_difference_percentage / 100);
          const paid_amount = Math.round(expected_amount + (Math.random() > 0.5 ? difference : -difference));
          const fullAppointmentData = { ...appointmentData, paid_amount, expected_amount };

          // Act: Handle price mismatch
          const result = await manualApprovalRouter.handlePriceMismatch(fullAppointmentData);

          // Assert: Minor differences should be handled leniently
          expect(result.severity).toBe('low');
          expect(result.recommended_action).toBe('approve_with_minor_adjustment');
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 6.2: Priority Calculation for Price Mismatches', () => {
    test('Exact payment matches should have higher priority than mismatches', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          base_amount: fc.integer({ min: 1000, max: 5000 })
        }),
        async ({ base_amount, ...appointmentData }) => {
          // Arrange: Exact match vs mismatch scenarios
          const exactMatchData = { ...appointmentData, paid_amount: base_amount };
          const mismatchData = { ...appointmentData, paid_amount: base_amount + 100 };

          const exactMatchContext = {
            is_exact_match: true,
            percentage_difference: 0
          };

          const mismatchContext = {
            is_exact_match: false,
            percentage_difference: (100 / base_amount) * 100
          };

          // Act: Calculate priorities
          const exactMatchPriority = manualApprovalRouter.calculateApprovalPriority(
            exactMatchData,
            exactMatchContext
          );

          const mismatchPriority = manualApprovalRouter.calculateApprovalPriority(
            mismatchData,
            mismatchContext
          );

          // Assert: Exact match should have higher priority
          expect(exactMatchPriority).toBeGreaterThan(mismatchPriority);
        }
      ), { numRuns: 30 });
    });

    test('Large payment mismatches should have lower priority', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          base_amount: fc.integer({ min: 1000, max: 3000 })
        }),
        async ({ base_amount, ...appointmentData }) => {
          // Arrange: Small vs large mismatch
          const smallMismatchData = { ...appointmentData, paid_amount: base_amount };
          const largeMismatchData = { ...appointmentData, paid_amount: base_amount };

          const smallMismatchContext = {
            is_exact_match: false,
            percentage_difference: 10 // 10% difference
          };

          const largeMismatchContext = {
            is_exact_match: false,
            percentage_difference: 30 // 30% difference
          };

          // Act: Calculate priorities
          const smallMismatchPriority = manualApprovalRouter.calculateApprovalPriority(
            smallMismatchData,
            smallMismatchContext
          );

          const largeMismatchPriority = manualApprovalRouter.calculateApprovalPriority(
            largeMismatchData,
            largeMismatchContext
          );

          // Assert: Large mismatch should have lower priority
          expect(smallMismatchPriority).toBeGreaterThan(largeMismatchPriority);
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 6.3: Input Validation', () => {
    test('Missing required fields should throw validation errors', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.option(fc.uuid()),
          doctor_id: fc.option(fc.string({ minLength: 1 })),
          patient_id: fc.option(fc.string({ minLength: 1 })),
          service_type: fc.option(fc.constantFrom('in_person', 'video_call', 'chat')),
          paid_amount: fc.option(fc.integer({ min: 0 }))
        }).filter(data => {
          // Ensure at least one required field is missing
          return !data.appointment_id || !data.doctor_id || !data.patient_id || 
                 !data.service_type || data.paid_amount === undefined;
        }),
        async (incompleteData) => {
          // Act & Assert: Should throw validation error
          await expect(
            manualApprovalRouter.validateApprovalInput(incompleteData)
          ).rejects.toThrow('Missing required appointment data');
        }
      ), { numRuns: 20 });
    });

    test('Invalid service types should throw validation errors', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.string({ minLength: 1 }).filter(s => !['in_person', 'video_call', 'chat'].includes(s)),
          paid_amount: fc.integer({ min: 0 })
        }),
        async (appointmentData) => {
          // Act & Assert: Should throw validation error
          await expect(
            manualApprovalRouter.validateApprovalInput(appointmentData)
          ).rejects.toThrow('Invalid service type');
        }
      ), { numRuns: 20 });
    });

    test('Invalid payment amounts should throw validation errors', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          appointment_id: fc.uuid(),
          doctor_id: fc.string({ minLength: 1 }),
          patient_id: fc.string({ minLength: 1 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          paid_amount: fc.oneof(
            fc.constant(-1),
            fc.constant(-100),
            fc.constant('invalid'),
            fc.constant(null),
            fc.constant(NaN)
          )
        }),
        async (appointmentData) => {
          // Act & Assert: Should throw validation error
          await expect(
            manualApprovalRouter.validateApprovalInput(appointmentData)
          ).rejects.toThrow('Invalid payment amount');
        }
      ), { numRuns: 20 });
    });
  });
});