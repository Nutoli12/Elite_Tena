/**
 * Property-Based Tests for Enhanced Doctor Service Fees Validation
 * 
 * **Feature: enhanced-two-tier-pricing, Property 1: Premium pricing validation**
 * **Validates: Requirements 1.2, 10.1**
 * 
 * Property: For any doctor service fee configuration, the system should enforce
 * proper pricing constraints, validation rules, and business logic according to
 * the two-tier pricing system requirements.
 */

import fc from 'fast-check';

// Test configuration
const TEST_ITERATIONS = 50;
const PREMIUM_SERVICE_TYPES = ['video_call', 'chat'];
const STANDARD_SERVICE_TYPES = ['in_person'];
const ALL_SERVICE_TYPES = [...PREMIUM_SERVICE_TYPES, ...STANDARD_SERVICE_TYPES];

// Mock Enhanced Doctor Service Fees for testing
class MockEnhancedDoctorServiceFees {
  constructor(data) {
    this.id = data.id || `fee_${Math.random().toString(36).substr(2, 9)}`;
    this.doctor_id = data.doctor_id;
    this.service_type = data.service_type;
    this.fee_amount = parseFloat(data.fee_amount);
    this.fee_set_by = data.fee_set_by;
    this.is_auto_approve = data.is_auto_approve || false;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  // Validation logic matching the real model
  validate() {
    const errors = [];

    // Service type validation
    if (!ALL_SERVICE_TYPES.includes(this.service_type)) {
      errors.push('Invalid service type');
    }

    // Fee amount validation
    if (this.fee_amount < 0) {
      errors.push('Fee amount cannot be negative');
    }

    // Two-tier pricing validation
    if (this.service_type === 'in_person' && this.fee_amount !== 400.00) {
      errors.push('In-person consultations must be exactly 400.00 ETB');
    }

    if (PREMIUM_SERVICE_TYPES.includes(this.service_type)) {
      if (this.fee_amount < 2000 || this.fee_amount > 20000) {
        errors.push('Premium services must be between 2,000 and 20,000 ETB');
      }
    }

    // Fee setting authority validation
    if (this.service_type === 'in_person' && this.fee_set_by !== 'admin') {
      errors.push('In-person consultation fees must be set by admin');
    }

    if (PREMIUM_SERVICE_TYPES.includes(this.service_type) && this.fee_set_by !== 'doctor') {
      errors.push('Premium service fees must be set by doctor');
    }

    // Auto-approval validation
    if (this.fee_set_by === 'admin' && this.is_auto_approve === true) {
      errors.push('Admin-set fees cannot have auto-approval enabled');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Business logic for auto-approval setting
  applyBusinessRules() {
    // Auto-approve premium services by default
    if (PREMIUM_SERVICE_TYPES.includes(this.service_type) && this.fee_set_by === 'doctor') {
      this.is_auto_approve = true;
    }

    // Admin fees never auto-approve
    if (this.fee_set_by === 'admin') {
      this.is_auto_approve = false;
    }
  }

  static validatePricingRange(serviceType, amount) {
    if (serviceType === 'in_person') {
      return parseFloat(amount) === 400.00;
    }
    
    const numAmount = parseFloat(amount);
    return numAmount >= 2000 && numAmount <= 20000;
  }

  static checkAutoApprovalEligibility(doctorId, serviceType, paidAmount, feeConfig) {
    if (!feeConfig) {
      return { 
        eligible: false, 
        reason: 'No pricing set for this service',
        decision: 'rejected'
      };
    }

    const exactMatch = parseFloat(paidAmount) === parseFloat(feeConfig.fee_amount);
    const isPremium = feeConfig.fee_set_by === 'doctor';
    const autoApproveEnabled = feeConfig.is_auto_approve;

    // Auto-approval logic
    if (isPremium && exactMatch && autoApproveEnabled) {
      return { 
        eligible: true, 
        reason: 'Premium service with exact fee payment - auto-approved',
        decision: 'auto_approved',
        payment_destination: 'doctor_wallet'
      };
    }

    if (!isPremium) {
      return { 
        eligible: false, 
        reason: 'Standard service requires manual doctor approval',
        decision: 'manual_review',
        payment_destination: 'system_wallet'
      };
    }

    if (!exactMatch) {
      return { 
        eligible: false, 
        reason: `Payment amount (${paidAmount}) does not match fee (${feeConfig.fee_amount})`,
        decision: 'manual_review',
        payment_destination: 'system_wallet'
      };
    }

    return { 
      eligible: false, 
      reason: 'Auto-approval not enabled',
      decision: 'manual_review',
      payment_destination: 'system_wallet'
    };
  }
}

// Mock pricing service for comprehensive testing
class MockPricingService {
  constructor() {
    this.fees = new Map();
    this.auditLog = [];
  }

  createFee(feeData) {
    const fee = new MockEnhancedDoctorServiceFees(feeData);
    fee.applyBusinessRules();
    
    const validation = fee.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const key = `${fee.doctor_id}_${fee.service_type}`;
    this.fees.set(key, fee);
    
    this.auditLog.push({
      action: 'create',
      doctor_id: fee.doctor_id,
      service_type: fee.service_type,
      fee_amount: fee.fee_amount,
      timestamp: new Date()
    });

    return fee;
  }

  updateFee(doctorId, serviceType, newAmount, changedBy) {
    const key = `${doctorId}_${serviceType}`;
    const existingFee = this.fees.get(key);
    
    if (!existingFee) {
      throw new Error('Fee configuration not found');
    }

    const oldAmount = existingFee.fee_amount;
    existingFee.fee_amount = newAmount;
    existingFee.updated_at = new Date();

    const validation = existingFee.validate();
    if (!validation.isValid) {
      existingFee.fee_amount = oldAmount; // Rollback
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    this.auditLog.push({
      action: 'update',
      doctor_id: doctorId,
      service_type: serviceType,
      old_amount: oldAmount,
      new_amount: newAmount,
      changed_by: changedBy,
      timestamp: new Date()
    });

    return existingFee;
  }

  getFee(doctorId, serviceType) {
    const key = `${doctorId}_${serviceType}`;
    return this.fees.get(key);
  }

  validatePricingConfiguration(doctorId) {
    const doctorFees = Array.from(this.fees.values())
      .filter(fee => fee.doctor_id === doctorId);

    const issues = [];

    // Check for required standard service
    const hasInPersonFee = doctorFees.some(fee => fee.service_type === 'in_person');
    if (!hasInPersonFee) {
      issues.push('Missing required in-person consultation fee');
    }

    // Check for pricing consistency
    doctorFees.forEach(fee => {
      const validation = fee.validate();
      if (!validation.isValid) {
        issues.push(`${fee.service_type}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

describe('Enhanced Pricing Validation Property Tests', () => {
  let pricingService;

  beforeEach(() => {
    pricingService = new MockPricingService();
    // Ensure clean state for each test
    pricingService.auditLog = [];
    pricingService.fees.clear();
  });

  test('Property 1: Premium pricing validation - Valid premium pricing configurations are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 15 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          feeAmount: fc.integer({ min: 2000, max: 20000 }),
          feeSetBy: fc.constant('doctor'),
          isAutoApprove: fc.boolean()
        }),
        async (testData) => {
          // Create valid premium pricing configuration
          const fee = pricingService.createFee({
            doctor_id: testData.doctorId,
            service_type: testData.serviceType,
            fee_amount: testData.feeAmount,
            fee_set_by: testData.feeSetBy,
            is_auto_approve: testData.isAutoApprove
          });

          // Property assertions for valid premium pricing
          expect(fee.fee_amount).toBe(testData.feeAmount);
          expect(fee.service_type).toBe(testData.serviceType);
          expect(fee.fee_set_by).toBe('doctor');
          expect(fee.is_auto_approve).toBe(true); // Should be auto-set for premium services
          expect(fee.is_active).toBe(true);

          // Validate pricing range
          expect(MockEnhancedDoctorServiceFees.validatePricingRange(
            testData.serviceType, 
            testData.feeAmount
          )).toBe(true);

          // Validate business rules are applied
          const validation = fee.validate();
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 1a: Premium pricing validation - Invalid premium pricing is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 15 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          feeAmount: fc.oneof(
            fc.integer({ min: 1, max: 1999 }),     // Below minimum
            fc.integer({ min: 20001, max: 50000 }) // Above maximum
          ),
          feeSetBy: fc.constantFrom('doctor', 'admin')
        }),
        async (testData) => {
          // Attempt to create invalid premium pricing
          expect(() => {
            pricingService.createFee({
              doctor_id: testData.doctorId,
              service_type: testData.serviceType,
              fee_amount: testData.feeAmount,
              fee_set_by: testData.feeSetBy
            });
          }).toThrow();

          // Verify pricing range validation
          expect(MockEnhancedDoctorServiceFees.validatePricingRange(
            testData.serviceType, 
            testData.feeAmount
          )).toBe(false);
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 1b: Standard pricing validation - In-person consultations must be exactly 400 ETB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 15 }),
          feeAmount: fc.oneof(
            fc.constant(400.00),                    // Valid amount
            fc.float({ min: 100, max: Math.fround(399.99) }),   // Below required
            fc.float({ min: Math.fround(400.01), max: 1000 })   // Above required
          ),
          feeSetBy: fc.constantFrom('admin', 'doctor')
        }),
        async (testData) => {
          const isValidAmount = testData.feeAmount === 400.00;
          const isValidSetter = testData.feeSetBy === 'admin';
          const shouldSucceed = isValidAmount && isValidSetter;

          if (shouldSucceed) {
            // Valid standard pricing should be accepted
            const fee = pricingService.createFee({
              doctor_id: testData.doctorId,
              service_type: 'in_person',
              fee_amount: testData.feeAmount,
              fee_set_by: testData.feeSetBy
            });

            expect(fee.fee_amount).toBe(400.00);
            expect(fee.service_type).toBe('in_person');
            expect(fee.fee_set_by).toBe('admin');
            expect(fee.is_auto_approve).toBe(false); // Never auto-approve for standard
          } else {
            // Invalid standard pricing should be rejected
            expect(() => {
              pricingService.createFee({
                doctor_id: testData.doctorId,
                service_type: 'in_person',
                fee_amount: testData.feeAmount,
                fee_set_by: testData.feeSetBy
              });
            }).toThrow();
          }

          // Verify pricing range validation
          expect(MockEnhancedDoctorServiceFees.validatePricingRange(
            'in_person', 
            testData.feeAmount
          )).toBe(isValidAmount);
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 1c: Auto-approval validation - Business rules are correctly applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 15 }),
          serviceType: fc.constantFrom(...ALL_SERVICE_TYPES),
          feeAmount: fc.oneof(
            fc.constant(400.00),                    // Standard fee
            fc.integer({ min: 2000, max: 20000 })  // Premium fee
          ),
          feeSetBy: fc.constantFrom('admin', 'doctor'),
          requestedAutoApprove: fc.boolean()
        }),
        async (testData) => {
          const isPremium = PREMIUM_SERVICE_TYPES.includes(testData.serviceType);
          const isValidAmount = isPremium ? 
            (testData.feeAmount >= 2000 && testData.feeAmount <= 20000) : 
            testData.feeAmount === 400.00;
          const isValidSetter = isPremium ? 
            testData.feeSetBy === 'doctor' : 
            testData.feeSetBy === 'admin';

          if (isValidAmount && isValidSetter) {
            const fee = pricingService.createFee({
              doctor_id: testData.doctorId,
              service_type: testData.serviceType,
              fee_amount: testData.feeAmount,
              fee_set_by: testData.feeSetBy,
              is_auto_approve: testData.requestedAutoApprove
            });

            // Property assertions for auto-approval business rules
            if (isPremium && testData.feeSetBy === 'doctor') {
              expect(fee.is_auto_approve).toBe(true); // Always true for premium doctor-set fees
            } else {
              expect(fee.is_auto_approve).toBe(false); // Always false for admin-set fees
            }
          } else {
            // Invalid configurations should be rejected
            expect(() => {
              pricingService.createFee({
                doctor_id: testData.doctorId,
                service_type: testData.serviceType,
                fee_amount: testData.feeAmount,
                fee_set_by: testData.feeSetBy,
                is_auto_approve: testData.requestedAutoApprove
              });
            }).toThrow();
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 1d: Pricing update validation - Fee updates maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 15 }),
          serviceType: fc.constantFrom(...PREMIUM_SERVICE_TYPES),
          initialFee: fc.integer({ min: 2000, max: 20000 }),
          newFee: fc.integer({ min: 1000, max: 25000 }),
          changedBy: fc.string({ minLength: 5, maxLength: 15 })
        }),
        async (testData) => {
          // Create initial valid fee
          const initialFee = pricingService.createFee({
            doctor_id: testData.doctorId,
            service_type: testData.serviceType,
            fee_amount: testData.initialFee,
            fee_set_by: 'doctor'
          });

          expect(initialFee.fee_amount).toBe(testData.initialFee);

          const isValidNewFee = testData.newFee >= 2000 && testData.newFee <= 20000;

          if (isValidNewFee) {
            // Valid update should succeed
            const updatedFee = pricingService.updateFee(
              testData.doctorId,
              testData.serviceType,
              testData.newFee,
              testData.changedBy
            );

            expect(updatedFee.fee_amount).toBe(testData.newFee);
            expect(updatedFee.is_auto_approve).toBe(true); // Should remain true for premium
            expect(updatedFee.updated_at).toBeInstanceOf(Date);

            // Check audit trail
            const auditEntries = pricingService.auditLog.filter(
              entry => entry.doctor_id === testData.doctorId && 
                      entry.service_type === testData.serviceType
            );
            expect(auditEntries).toHaveLength(2); // Create + Update
            expect(auditEntries[1].action).toBe('update');
            expect(auditEntries[1].old_amount).toBe(testData.initialFee);
            expect(auditEntries[1].new_amount).toBe(testData.newFee);
          } else {
            // Invalid update should be rejected and rollback
            expect(() => {
              pricingService.updateFee(
                testData.doctorId,
                testData.serviceType,
                testData.newFee,
                testData.changedBy
              );
            }).toThrow();

            // Original fee should remain unchanged
            const unchangedFee = pricingService.getFee(testData.doctorId, testData.serviceType);
            expect(unchangedFee.fee_amount).toBe(testData.initialFee);
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 1e: Auto-approval eligibility - Payment matching logic works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 15 }),
          serviceType: fc.constantFrom(...ALL_SERVICE_TYPES),
          feeAmount: fc.oneof(
            fc.constant(400.00),                    // Standard fee
            fc.integer({ min: 2000, max: 20000 })  // Premium fee
          ),
          paidAmount: fc.float({ min: 100, max: 25000 }),
          feeSetBy: fc.constantFrom('admin', 'doctor')
        }),
        async (testData) => {
          const isPremium = PREMIUM_SERVICE_TYPES.includes(testData.serviceType);
          const isValidConfig = isPremium ? 
            (testData.feeSetBy === 'doctor' && testData.feeAmount >= 2000 && testData.feeAmount <= 20000) :
            (testData.feeSetBy === 'admin' && testData.feeAmount === 400.00);

          if (isValidConfig) {
            // Create valid fee configuration
            const fee = pricingService.createFee({
              doctor_id: testData.doctorId,
              service_type: testData.serviceType,
              fee_amount: testData.feeAmount,
              fee_set_by: testData.feeSetBy
            });

            // Check auto-approval eligibility
            const eligibility = MockEnhancedDoctorServiceFees.checkAutoApprovalEligibility(
              testData.doctorId,
              testData.serviceType,
              testData.paidAmount,
              fee
            );

            const isExactMatch = Math.abs(testData.paidAmount - testData.feeAmount) < 0.01;

            // Property assertions for auto-approval logic
            if (isPremium && isExactMatch && fee.is_auto_approve) {
              expect(eligibility.eligible).toBe(true);
              expect(eligibility.decision).toBe('auto_approved');
              expect(eligibility.payment_destination).toBe('doctor_wallet');
            } else if (!isPremium) {
              expect(eligibility.eligible).toBe(false);
              expect(eligibility.decision).toBe('manual_review');
              expect(eligibility.payment_destination).toBe('system_wallet');
              expect(eligibility.reason).toMatch(/manual doctor approval/i);
            } else if (!isExactMatch) {
              expect(eligibility.eligible).toBe(false);
              expect(eligibility.decision).toBe('manual_review');
              expect(eligibility.payment_destination).toBe('system_wallet');
              expect(eligibility.reason).toMatch(/does not match/i);
            } else {
              expect(eligibility.eligible).toBe(false);
              expect(eligibility.decision).toBe('manual_review');
            }
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  test('Property 1f: Comprehensive pricing configuration validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.string({ minLength: 5, maxLength: 15 }),
          services: fc.array(
            fc.record({
              serviceType: fc.constantFrom(...ALL_SERVICE_TYPES),
              feeAmount: fc.oneof(
                fc.constant(400.00),
                fc.integer({ min: 2000, max: 20000 }),
                fc.integer({ min: 100, max: 50000 }) // Some invalid amounts
              )
            }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        async (testData) => {
          let validConfigurations = 0;
          let hasInPersonService = false;

          // Attempt to create all service configurations
          for (const service of testData.services) {
            const isPremium = PREMIUM_SERVICE_TYPES.includes(service.serviceType);
            const isValidAmount = isPremium ? 
              (service.feeAmount >= 2000 && service.feeAmount <= 20000) :
              service.feeAmount === 400.00;
            const feeSetBy = isPremium ? 'doctor' : 'admin';

            if (isValidAmount) {
              try {
                pricingService.createFee({
                  doctor_id: testData.doctorId,
                  service_type: service.serviceType,
                  fee_amount: service.feeAmount,
                  fee_set_by: feeSetBy
                });
                validConfigurations++;
                
                if (service.serviceType === 'in_person') {
                  hasInPersonService = true;
                }
              } catch (error) {
                // Duplicate service type - expected for property testing
              }
            }
          }

          // Validate overall doctor pricing configuration
          const configValidation = pricingService.validatePricingConfiguration(testData.doctorId);

          // Property assertions for comprehensive validation
          if (validConfigurations > 0) {
            if (hasInPersonService) {
              expect(configValidation.isValid).toBe(true);
              expect(configValidation.issues).toHaveLength(0);
            } else {
              expect(configValidation.isValid).toBe(false);
              expect(configValidation.issues).toContain('Missing required in-person consultation fee');
            }
          }

          // Verify all created fees are valid
          const doctorFees = Array.from(pricingService.fees.values())
            .filter(fee => fee.doctor_id === testData.doctorId);

          doctorFees.forEach(fee => {
            const validation = fee.validate();
            expect(validation.isValid).toBe(true);
          });
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });
});