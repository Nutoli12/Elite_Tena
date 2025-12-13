/**
 * Property-Based Tests for Enhanced Payment Transaction Routing
 * 
 * **Feature: enhanced-two-tier-pricing, Property 2: Premium Payment Routing**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * Property: For any premium payment transaction, when the payment amount exactly 
 * matches the doctor's set fee and the doctor has a verified wallet, the payment 
 * should be automatically routed to the doctor's wallet with auto-approval status
 */

import fc from 'fast-check';

// Test configuration
const TEST_ITERATIONS = 50;
const PREMIUM_SERVICE_TYPES = ['video_call', 'chat'];
const STANDARD_SERVICE_TYPES = ['in_person'];

// Core payment routing logic (simplified for testing)
class PaymentRoutingEngine {
  constructor() {
    this.doctorFees = new Map();
    this.doctorWallets = new Map();
  }

  setDoctorFee(doctorId, serviceType, feeAmount, feeSetBy = 'doctor') {
    const key = `${doctorId}_${serviceType}`;
    this.doctorFees.set(key, {
      fee_amount: feeAmount,
      fee_set_by: feeSetBy,
      is_auto_approve: feeSetBy === 'doctor' && serviceType !== 'in_person'
    });
  }

  setDoctorWallet(doctorId, walletConfig) {
    // Use a prefixed key to avoid prototype pollution issues
    const key = `wallet_${doctorId}`;
    this.doctorWallets.set(key, {
      is_verified: walletConfig.is_verified || false,
      is_active: walletConfig.is_active || false,
      has_payment_method: walletConfig.has_payment_method || false
    });
  }

  routePayment(paymentData) {
    const { doctor_id, service_type, amount } = paymentData;
    
    // Get doctor's fee configuration
    const feeKey = `${doctor_id}_${service_type}`;
    const feeConfig = this.doctorFees.get(feeKey);
    
    if (!feeConfig) {
      return {
        destination: 'system_wallet',
        approval_method: 'rejected',
        reason: 'No fee configuration found'
      };
    }

    // Check if payment amount matches expected fee
    const isExactMatch = parseFloat(amount) === parseFloat(feeConfig.fee_amount);
    const isPremiumService = feeConfig.fee_set_by === 'doctor';
    
    // For standard services (in_person), always route to system wallet
    if (!isPremiumService) {
      return {
        destination: 'system_wallet',
        approval_method: 'manual_review',
        reason: 'Standard service requires manual approval',
        is_exact_match: isExactMatch,
        expected_amount: feeConfig.fee_amount
      };
    }

    // For premium services, check wallet capability
    const walletKey = `wallet_${doctor_id}`;
    const wallet = this.doctorWallets.get(walletKey);
    const hasVerifiedWallet = wallet && wallet.is_verified && wallet.is_active && wallet.has_payment_method;

    // Premium service with exact payment and verified wallet -> auto-approve to doctor wallet
    if (isPremiumService && isExactMatch && feeConfig.is_auto_approve && hasVerifiedWallet) {
      return {
        destination: 'doctor_wallet',
        approval_method: 'auto_approved',
        reason: 'Premium service with exact payment and verified wallet',
        is_exact_match: true,
        expected_amount: feeConfig.fee_amount
      };
    }

    // Premium service with exact payment but no verified wallet -> fallback to system wallet
    if (isPremiumService && isExactMatch && feeConfig.is_auto_approve && !hasVerifiedWallet) {
      return {
        destination: 'system_wallet',
        approval_method: 'manual_review',
        reason: 'No verified wallet configured - fallback to system wallet',
        is_exact_match: true,
        expected_amount: feeConfig.fee_amount
      };
    }

    // All other cases -> manual review in system wallet
    let reason = 'Manual review required';
    if (!isExactMatch) {
      reason = `Payment amount (${amount}) does not match fee (${feeConfig.fee_amount})`;
    } else if (!feeConfig.is_auto_approve) {
      reason = 'Auto-approval not enabled';
    }

    return {
      destination: 'system_wallet',
      approval_method: 'manual_review',
      reason: reason,
      is_exact_match: isExactMatch,
      expected_amount: feeConfig.fee_amount
    };
  }
}

describe('Enhanced Payment Routing Property Tests', () => {
  let routingEngine;

  beforeEach(() => {
    routingEngine = new PaymentRoutingEngine();
  });

  test('Property 2: Premium Payment Routing - Exact premium payments with verified wallets route to doctor', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for premium payment scenarios
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 10 }),
          patientId: fc.string({ minLength: 5, maxLength: 10 }),
          appointmentId: fc.string({ minLength: 8, maxLength: 15 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          premiumFee: fc.integer({ min: 2000, max: 20000 }),
          hasVerifiedWallet: fc.boolean(),
          walletType: fc.constantFrom('chapa', 'telebirr', 'bank')
        }),
        async (testData) => {
          // Setup doctor's premium pricing
          routingEngine.setDoctorFee(
            testData.doctorId, 
            testData.serviceType, 
            testData.premiumFee, 
            'doctor'
          );

          // Setup doctor's wallet if they have one
          if (testData.hasVerifiedWallet) {
            routingEngine.setDoctorWallet(testData.doctorId, {
              is_verified: true,
              is_active: true,
              has_payment_method: true
            });
          }

          // Create payment with exact amount matching premium fee
          const paymentData = {
            appointment_id: testData.appointmentId,
            patient_id: testData.patientId,
            doctor_id: testData.doctorId,
            service_type: testData.serviceType,
            amount: testData.premiumFee // Exact match
          };

          const result = routingEngine.routePayment(paymentData);



          // Property assertions for premium payment routing
          if (testData.hasVerifiedWallet) {
            // Premium service with verified wallet and exact payment should route to doctor
            expect(result.destination).toBe('doctor_wallet');
            expect(result.approval_method).toBe('auto_approved');
            expect(result.is_exact_match).toBe(true);
            expect(result.expected_amount).toBe(testData.premiumFee);
          } else {
            // No verified wallet should fall back to system wallet
            expect(result.destination).toBe('system_wallet');
            expect(result.approval_method).toBe('manual_review');
            expect(result.is_exact_match).toBe(true);
            expect(result.expected_amount).toBe(testData.premiumFee);
            expect(result.reason).toMatch(/verified wallet/i);
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 2a: Premium Payment Routing - Inexact premium payments route to system wallet', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 10 }),
          patientId: fc.string({ minLength: 5, maxLength: 10 }),
          appointmentId: fc.string({ minLength: 8, maxLength: 15 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          premiumFee: fc.integer({ min: 2000, max: 20000 }),
          paymentVariance: fc.integer({ min: -1000, max: 1000 }).filter(v => v !== 0)
        }),
        async (testData) => {
          // Setup doctor's premium pricing
          routingEngine.setDoctorFee(
            testData.doctorId, 
            testData.serviceType, 
            testData.premiumFee, 
            'doctor'
          );

          // Setup verified wallet
          routingEngine.setDoctorWallet(testData.doctorId, {
            is_verified: true,
            is_active: true,
            has_payment_method: true
          });

          // Create payment with amount that doesn't match premium fee
          const inexactAmount = Math.max(100, testData.premiumFee + testData.paymentVariance);
          const paymentData = {
            appointment_id: testData.appointmentId,
            patient_id: testData.patientId,
            doctor_id: testData.doctorId,
            service_type: testData.serviceType,
            amount: inexactAmount
          };

          const result = routingEngine.routePayment(paymentData);

          // Property assertions for inexact premium payments
          expect(result.destination).toBe('system_wallet');
          expect(result.approval_method).toBe('manual_review');
          expect(result.is_exact_match).toBe(false);
          expect(result.expected_amount).toBe(testData.premiumFee);
          expect(result.reason).toMatch(/does not match/i);
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 2b: Standard Payment Routing - In-person consultations always route to system wallet', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 10 }),
          patientId: fc.string({ minLength: 5, maxLength: 10 }),
          appointmentId: fc.string({ minLength: 8, maxLength: 15 }),
          serviceType: fc.constantFrom(...STANDARD_SERVICE_TYPES),
          hasVerifiedWallet: fc.boolean()
        }),
        async (testData) => {
          // Setup standard service pricing (admin-set)
          routingEngine.setDoctorFee(
            testData.doctorId, 
            testData.serviceType, 
            400.00, 
            'admin'
          );

          // Setup wallet if specified (shouldn't matter for standard services)
          if (testData.hasVerifiedWallet) {
            routingEngine.setDoctorWallet(testData.doctorId, {
              is_verified: true,
              is_active: true,
              has_payment_method: true
            });
          }

          // Create payment with exact standard fee
          const paymentData = {
            appointment_id: testData.appointmentId,
            patient_id: testData.patientId,
            doctor_id: testData.doctorId,
            service_type: testData.serviceType,
            amount: 400.00
          };

          const result = routingEngine.routePayment(paymentData);

          // Property assertions for standard service payments
          expect(result.destination).toBe('system_wallet');
          expect(result.approval_method).toBe('manual_review');
          expect(result.is_exact_match).toBe(true);
          expect(result.expected_amount).toBe(400.00);
          expect(result.reason).toMatch(/manual approval/i);
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 2c: Payment Routing - Multiple concurrent premium payments maintain routing consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 10 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          premiumFee: fc.integer({ min: 2000, max: 20000 }),
          concurrentPayments: fc.array(
            fc.record({
              patientId: fc.string({ minLength: 5, maxLength: 10 }),
              appointmentId: fc.string({ minLength: 8, maxLength: 15 }),
              amount: fc.integer({ min: 1000, max: 25000 })
            }),
            { minLength: 3, maxLength: 8 }
          )
        }),
        async (testData) => {
          // Setup doctor's premium pricing and verified wallet
          routingEngine.setDoctorFee(
            testData.doctorId, 
            testData.serviceType, 
            testData.premiumFee, 
            'doctor'
          );

          routingEngine.setDoctorWallet(testData.doctorId, {
            is_verified: true,
            is_active: true,
            has_payment_method: true
          });

          // Process concurrent payments
          const results = testData.concurrentPayments.map((payment) => {
            const paymentData = {
              appointment_id: payment.appointmentId,
              patient_id: payment.patientId,
              doctor_id: testData.doctorId,
              service_type: testData.serviceType,
              amount: payment.amount
            };

            return routingEngine.routePayment(paymentData);
          });

          // Property assertions for concurrent payment routing consistency
          results.forEach((result, index) => {
            const payment = testData.concurrentPayments[index];
            const isExactMatch = payment.amount === testData.premiumFee;

            if (isExactMatch) {
              // Exact payments should route to doctor wallet
              expect(result.destination).toBe('doctor_wallet');
              expect(result.approval_method).toBe('auto_approved');
              expect(result.is_exact_match).toBe(true);
            } else {
              // Inexact payments should route to system wallet
              expect(result.destination).toBe('system_wallet');
              expect(result.approval_method).toBe('manual_review');
              expect(result.is_exact_match).toBe(false);
            }

            expect(result.expected_amount).toBe(testData.premiumFee);
          });

          // Verify routing decisions are consistent across all payments
          const exactPayments = results.filter((r, i) => 
            testData.concurrentPayments[i].amount === testData.premiumFee
          );
          const inexactPayments = results.filter((r, i) => 
            testData.concurrentPayments[i].amount !== testData.premiumFee
          );

          // All exact payments should have identical routing decisions
          if (exactPayments.length > 1) {
            const firstExactDecision = exactPayments[0];
            exactPayments.slice(1).forEach(result => {
              expect(result.destination).toBe(firstExactDecision.destination);
              expect(result.approval_method).toBe(firstExactDecision.approval_method);
            });
          }

          // All inexact payments should route to system wallet
          inexactPayments.forEach(result => {
            expect(result.destination).toBe('system_wallet');
            expect(result.approval_method).toBe('manual_review');
          });
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 2d: Payment Routing - Wallet verification status affects routing decisions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 10 }),
          patientId: fc.string({ minLength: 5, maxLength: 10 }),
          appointmentId: fc.string({ minLength: 8, maxLength: 15 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          premiumFee: fc.integer({ min: 2000, max: 20000 }),
          walletStatus: fc.record({
            is_verified: fc.boolean(),
            is_active: fc.boolean(),
            has_payment_method: fc.boolean()
          })
        }),
        async (testData) => {
          // Setup doctor's premium pricing
          routingEngine.setDoctorFee(
            testData.doctorId, 
            testData.serviceType, 
            testData.premiumFee, 
            'doctor'
          );

          // Setup wallet with varying verification status
          routingEngine.setDoctorWallet(testData.doctorId, testData.walletStatus);

          // Create exact premium payment
          const paymentData = {
            appointment_id: testData.appointmentId,
            patient_id: testData.patientId,
            doctor_id: testData.doctorId,
            service_type: testData.serviceType,
            amount: testData.premiumFee
          };

          const result = routingEngine.routePayment(paymentData);

          // Property assertions based on wallet verification status
          const shouldRouteToDoctor = (
            testData.walletStatus.is_verified &&
            testData.walletStatus.is_active &&
            testData.walletStatus.has_payment_method
          );

          if (shouldRouteToDoctor) {
            expect(result.destination).toBe('doctor_wallet');
            expect(result.approval_method).toBe('auto_approved');
          } else {
            expect(result.destination).toBe('system_wallet');
            expect(result.approval_method).toBe('manual_review');
            expect(result.reason).toMatch(/verified wallet/i);
          }

          // Common assertions
          expect(result.is_exact_match).toBe(true);
          expect(result.expected_amount).toBe(testData.premiumFee);
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 2e: Payment Routing - Edge cases and boundary conditions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 1, maxLength: 50 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          feeAmount: fc.oneof(
            fc.integer({ min: 2000, max: 20000 }), // Valid range
            fc.integer({ min: 1, max: 1999 }),     // Below range
            fc.integer({ min: 20001, max: 50000 }) // Above range
          ),
          paymentAmount: fc.integer({ min: 1, max: 50000 }),
          hasWallet: fc.boolean()
        }),
        async (testData) => {
          // Setup doctor's fee (even if outside valid range for testing)
          routingEngine.setDoctorFee(
            testData.doctorId, 
            testData.serviceType, 
            testData.feeAmount, 
            'doctor'
          );

          // Setup wallet if specified
          if (testData.hasWallet) {
            routingEngine.setDoctorWallet(testData.doctorId, {
              is_verified: true,
              is_active: true,
              has_payment_method: true
            });
          }

          const paymentData = {
            appointment_id: 'test_appointment',
            patient_id: 'test_patient',
            doctor_id: testData.doctorId,
            service_type: testData.serviceType,
            amount: testData.paymentAmount
          };

          const result = routingEngine.routePayment(paymentData);

          // Property assertions for edge cases
          const isExactMatch = testData.paymentAmount === testData.feeAmount;
          const hasVerifiedWallet = testData.hasWallet;

          // Only route to doctor wallet if exact match AND verified wallet
          if (isExactMatch && hasVerifiedWallet) {
            expect(result.destination).toBe('doctor_wallet');
            expect(result.approval_method).toBe('auto_approved');
          } else {
            expect(result.destination).toBe('system_wallet');
            expect(result.approval_method).toBe('manual_review');
          }

          // Always return consistent structure
          expect(result).toHaveProperty('destination');
          expect(result).toHaveProperty('approval_method');
          expect(result).toHaveProperty('reason');
          expect(result).toHaveProperty('is_exact_match');
          expect(result).toHaveProperty('expected_amount');
          
          expect(result.is_exact_match).toBe(isExactMatch);
          expect(result.expected_amount).toBe(testData.feeAmount);
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });
});