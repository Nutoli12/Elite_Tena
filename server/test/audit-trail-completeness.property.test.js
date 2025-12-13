/**
 * Property Test: Audit trail completeness
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 5.2: Property test for audit trail completeness**
 * **Property 8: Audit trail completeness**
 * **Validates: Requirements 9.1, 9.2, 9.3**
 * 
 * Tests comprehensive audit logging for pricing changes, payment transactions,
 * approval decisions, and suspicious activity detection.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { AuditService } from '../src/services/AuditService.js';

describe('Property Test: Audit Trail Completeness', () => {
  let auditService;
  let mockModels;
  let mockNotificationService;

  beforeEach(() => {
    mockModels = {};
    
    mockNotificationService = {
      sendNotification: jest.fn().mockResolvedValue({ success: true })
    };

    auditService = new AuditService(mockModels, mockNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 8.1: All pricing changes are logged with complete information
   * Every pricing change operation should generate a complete audit log
   * with all required fields and integrity verification.
   */
  it('should log all pricing changes with complete information', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        doctor_id: fc.string({ minLength: 5, maxLength: 20 }),
        service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
        old_price: fc.float({ min: 100, max: 10000 }),
        new_price: fc.float({ min: 100, max: 10000 }),
        changed_by: fc.string({ minLength: 5, maxLength: 20 }),
        reason: fc.string({ minLength: 10, maxLength: 200 }),
        ip_address: fc.ipV4(),
        session_id: fc.string({ minLength: 10, maxLength: 30 })
      }),
      async (pricingChangeData) => {
        const changeData = {
          ...pricingChangeData,
          action: 'update',
          old_values: { price: pricingChangeData.old_price },
          new_values: { price: pricingChangeData.new_price },
          market_context: {
            market_average: (pricingChangeData.old_price + pricingChangeData.new_price) / 2,
            specialty_average: pricingChangeData.new_price * 0.9
          },
          approval_status: 'approved',
          user_agent: 'Mozilla/5.0 Test Browser'
        };

        const result = await auditService.logPricingChange(changeData);

        expect(result.success).toBe(true);
        expect(result.audit_id).toBeDefined();
        expect(result.audit_hash).toBeDefined();
        expect(result.logged_at).toBeInstanceOf(Date);

        // Verify audit entry contains all required fields
        const auditEntry = auditService.auditCache.get(result.audit_id);
        expect(auditEntry).toBeDefined();
        expect(auditEntry.event_type).toBe('pricing_change');
        expect(auditEntry.entity_type).toBe('doctor_service_fees');
        expect(auditEntry.entity_id).toBe(pricingChangeData.doctor_id);
        expect(auditEntry.user_id).toBe(pricingChangeData.changed_by);
        expect(auditEntry.action).toBe('update');
        expect(auditEntry.old_values).toEqual({ price: pricingChangeData.old_price });
        expect(auditEntry.new_values).toEqual({ price: pricingChangeData.new_price });
        expect(auditEntry.change_reason).toBe(pricingChangeData.reason);
        expect(auditEntry.ip_address).toBe(pricingChangeData.ip_address);
        expect(auditEntry.session_id).toBe(pricingChangeData.session_id);
        expect(auditEntry.integrity_hash).toBe(result.audit_hash);

        // Verify metadata completeness
        expect(auditEntry.metadata.service_type).toBe(pricingChangeData.service_type);
        expect(auditEntry.metadata.old_price).toBe(pricingChangeData.old_price);
        expect(auditEntry.metadata.new_price).toBe(pricingChangeData.new_price);
        expect(auditEntry.metadata.price_difference).toBeDefined();
        expect(auditEntry.metadata.price_difference.absolute_difference).toBeCloseTo(
          pricingChangeData.new_price - pricingChangeData.old_price, 2
        );
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 8.2: All payment transactions are logged with complete details
   * Every payment transaction should generate a comprehensive audit log
   * with transaction details, routing information, and integrity verification.
   */
  it('should log all payment transactions with complete details', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        transaction_id: fc.string({ minLength: 10, maxLength: 30 }),
        patient_id: fc.string({ minLength: 5, maxLength: 20 }),
        doctor_id: fc.string({ minLength: 5, maxLength: 20 }),
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        amount: fc.float({ min: 100, max: 8000 }),
        payment_method: fc.constantFrom('chapa', 'telebirr', 'cbe_birr'),
        service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
        status: fc.constantFrom('success', 'failed', 'pending'),
        ip_address: fc.ipV4(),
        session_id: fc.string({ minLength: 10, maxLength: 25 })
      }),
      async (paymentData) => {
        const transactionData = {
          ...paymentData,
          action: 'process',
          currency: 'ETB',
          gateway_response: {
            status: paymentData.status,
            gateway_id: `gw_${Date.now()}`,
            response_code: paymentData.status === 'success' ? '00' : '01'
          },
          approval_method: 'auto',
          routing_destination: 'doctor_wallet',
          platform_fee: paymentData.amount * 0.05,
          doctor_amount: paymentData.amount * 0.95,
          gateway_transaction_id: `gw_txn_${Date.now()}`,
          processing_time: Math.floor(Math.random() * 5000) + 1000,
          retry_count: paymentData.status === 'failed' ? Math.floor(Math.random() * 3) : 0,
          user_agent: 'Mobile App v1.0'
        };

        const result = await auditService.logPaymentTransaction(transactionData);

        expect(result.success).toBe(true);
        expect(result.audit_id).toBeDefined();
        expect(result.transaction_hash).toBeDefined();
        expect(result.logged_at).toBeInstanceOf(Date);

        // Verify audit entry contains all required fields
        const auditEntry = auditService.auditCache.get(result.audit_id);
        expect(auditEntry).toBeDefined();
        expect(auditEntry.event_type).toBe('payment_transaction');
        expect(auditEntry.entity_type).toBe('payment_transaction');
        expect(auditEntry.entity_id).toBe(paymentData.transaction_id);
        expect(auditEntry.user_id).toBe(paymentData.patient_id);
        expect(auditEntry.action).toBe('process');
        expect(auditEntry.ip_address).toBe(paymentData.ip_address);
        expect(auditEntry.session_id).toBe(paymentData.session_id);
        expect(auditEntry.integrity_hash).toBe(result.transaction_hash);

        // Verify transaction details completeness
        expect(auditEntry.transaction_details.amount).toBe(paymentData.amount);
        expect(auditEntry.transaction_details.currency).toBe('ETB');
        expect(auditEntry.transaction_details.payment_method).toBe(paymentData.payment_method);
        expect(auditEntry.transaction_details.gateway_response).toBeDefined();
        expect(auditEntry.transaction_details.approval_method).toBe('auto');
        expect(auditEntry.transaction_details.routing_destination).toBe('doctor_wallet');
        expect(auditEntry.transaction_details.platform_fee).toBeCloseTo(paymentData.amount * 0.05, 2);
        expect(auditEntry.transaction_details.doctor_amount).toBeCloseTo(paymentData.amount * 0.95, 2);

        // Verify metadata completeness
        expect(auditEntry.metadata.appointment_id).toBe(paymentData.appointment_id);
        expect(auditEntry.metadata.doctor_id).toBe(paymentData.doctor_id);
        expect(auditEntry.metadata.service_type).toBe(paymentData.service_type);
        expect(auditEntry.metadata.payment_status).toBe(paymentData.status);
        expect(auditEntry.metadata.processing_time_ms).toBeGreaterThan(0);
      }
    ), { numRuns: 35 });
  });

  /**
   * Property 8.3: All approval decisions are logged with complete context
   * Every approval decision should generate a detailed audit log with
   * decision context, criteria, and reasoning.
   */
  it('should log all approval decisions with complete context', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        appointment_id: fc.string({ minLength: 5, maxLength: 20 }),
        patient_id: fc.string({ minLength: 5, maxLength: 20 }),
        doctor_id: fc.string({ minLength: 5, maxLength: 20 }),
        decided_by: fc.string({ minLength: 5, maxLength: 20 }),
        decision: fc.constantFrom('approve', 'reject', 'auto_approve'),
        service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
        requested_price: fc.float({ min: 100, max: 5000 }),
        doctor_price: fc.float({ min: 100, max: 5000 }),
        ip_address: fc.ipV4(),
        session_id: fc.string({ minLength: 10, maxLength: 25 })
      }),
      async (approvalData) => {
        const decisionData = {
          ...approvalData,
          reason: approvalData.decision === 'reject' ? 'Price mismatch detected' : 'Criteria met',
          auto_criteria: approvalData.decision === 'auto_approve' ? ['price_match', 'doctor_available'] : null,
          review_notes: approvalData.decision === 'reject' ? 'Manual review required' : null,
          alternatives: approvalData.decision === 'reject' ? ['reschedule', 'price_adjustment'] : null,
          decision_time: Math.floor(Math.random() * 30000) + 5000,
          price_match: Math.abs(approvalData.requested_price - approvalData.doctor_price) < 10,
          approval_method: approvalData.decision === 'auto_approve' ? 'auto' : 'manual',
          queue_wait_time: Math.floor(Math.random() * 300000) + 60000,
          user_agent: 'Doctor Dashboard v2.1'
        };

        const result = await auditService.logApprovalDecision(decisionData);

        expect(result.success).toBe(true);
        expect(result.audit_id).toBeDefined();
        expect(result.approval_hash).toBeDefined();
        expect(result.logged_at).toBeInstanceOf(Date);

        // Verify audit entry contains all required fields
        const auditEntry = auditService.auditCache.get(result.audit_id);
        expect(auditEntry).toBeDefined();
        expect(auditEntry.event_type).toBe('approval_decision');
        expect(auditEntry.entity_type).toBe('appointment_approval');
        expect(auditEntry.entity_id).toBe(approvalData.appointment_id);
        expect(auditEntry.user_id).toBe(approvalData.decided_by);
        expect(auditEntry.action).toBe(approvalData.decision);
        expect(auditEntry.ip_address).toBe(approvalData.ip_address);
        expect(auditEntry.session_id).toBe(approvalData.session_id);
        expect(auditEntry.integrity_hash).toBe(result.approval_hash);

        // Verify decision details completeness
        expect(auditEntry.decision_details.decision).toBe(approvalData.decision);
        expect(auditEntry.decision_details.decision_reason).toBeDefined();
        expect(auditEntry.decision_details.decision_time_ms).toBeGreaterThan(0);
        
        if (approvalData.decision === 'auto_approve') {
          expect(auditEntry.decision_details.auto_approval_criteria).toBeDefined();
        }
        
        if (approvalData.decision === 'reject') {
          expect(auditEntry.decision_details.manual_review_notes).toBeDefined();
          expect(auditEntry.decision_details.alternative_suggestions).toBeDefined();
        }

        // Verify metadata completeness
        expect(auditEntry.metadata.appointment_id).toBe(approvalData.appointment_id);
        expect(auditEntry.metadata.patient_id).toBe(approvalData.patient_id);
        expect(auditEntry.metadata.doctor_id).toBe(approvalData.doctor_id);
        expect(auditEntry.metadata.service_type).toBe(approvalData.service_type);
        expect(auditEntry.metadata.requested_price).toBe(approvalData.requested_price);
        expect(auditEntry.metadata.doctor_price).toBe(approvalData.doctor_price);
        expect(typeof auditEntry.metadata.price_match).toBe('boolean');
        expect(auditEntry.metadata.approval_method).toBeDefined();
        expect(auditEntry.metadata.queue_wait_time).toBeGreaterThan(0);
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 8.4: Suspicious activity detection generates proper alerts
   * When suspicious patterns are detected, appropriate audit logs and
   * alerts should be generated with complete context.
   */
  it('should detect and log suspicious activity with proper alerts', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        user_id: fc.string({ minLength: 5, maxLength: 20 }),
        activity_type: fc.constantFrom('pricing_change', 'payment_transaction', 'approval_decision'),
        suspicious_count: fc.integer({ min: 11, max: 25 }) // Above threshold
      }),
      async (suspiciousData) => {
        // Generate multiple activities to trigger suspicious detection
        const activities = [];
        
        for (let i = 0; i < suspiciousData.suspicious_count; i++) {
          let activityData;
          
          if (suspiciousData.activity_type === 'pricing_change') {
            activityData = {
              doctor_id: suspiciousData.user_id,
              service_type: 'video_call',
              old_price: 1000 + i * 100,
              new_price: 1100 + i * 100,
              changed_by: suspiciousData.user_id,
              reason: `Price update ${i + 1}`,
              action: 'update',
              old_values: { price: 1000 + i * 100 },
              new_values: { price: 1100 + i * 100 },
              ip_address: '192.168.1.1',
              session_id: `session_${i}`
            };
            
            await auditService.logPricingChange(activityData);
          } else if (suspiciousData.activity_type === 'payment_transaction') {
            activityData = {
              transaction_id: `txn_${i}`,
              patient_id: suspiciousData.user_id,
              doctor_id: `doctor_${i}`,
              appointment_id: `appt_${i}`,
              amount: 500,
              payment_method: 'chapa',
              service_type: 'video_call',
              status: 'failed', // Failed payments trigger suspicious detection
              action: 'process',
              ip_address: '192.168.1.1',
              session_id: `session_${i}`
            };
            
            await auditService.logPaymentTransaction(activityData);
          } else {
            activityData = {
              appointment_id: `appt_${i}`,
              patient_id: `patient_${i}`,
              doctor_id: `doctor_${i}`,
              decided_by: suspiciousData.user_id,
              decision: 'reject', // Rejections trigger suspicious detection
              service_type: 'video_call',
              requested_price: 1000,
              doctor_price: 1200,
              reason: `Rejection ${i + 1}`,
              ip_address: '192.168.1.1',
              session_id: `session_${i}`
            };
            
            await auditService.logApprovalDecision(activityData);
          }
          
          activities.push(activityData);
        }

        // Trigger suspicious activity detection
        const detectionResult = await auditService.detectSuspiciousActivity({
          event_type: suspiciousData.activity_type,
          user_id: suspiciousData.user_id,
          status: suspiciousData.activity_type === 'payment_transaction' ? 'failed' : undefined,
          decision: suspiciousData.activity_type === 'approval_decision' ? 'reject' : undefined
        });

        expect(detectionResult.suspicious).toBe(true);
        expect(detectionResult.indicators).toHaveLength(1);
        expect(detectionResult.log_id).toBeDefined();
        expect(detectionResult.severity).toBeDefined();

        // Verify the suspicious activity indicator
        const indicator = detectionResult.indicators[0];
        expect(indicator.count).toBeGreaterThanOrEqual(suspiciousData.suspicious_count);
        expect(indicator.threshold).toBeDefined();
        expect(indicator.severity).toBeDefined();
        
        if (suspiciousData.activity_type === 'pricing_change') {
          expect(indicator.type).toBe('excessive_pricing_changes');
        } else if (suspiciousData.activity_type === 'payment_transaction') {
          expect(indicator.type).toBe('excessive_payment_failures');
        } else {
          expect(indicator.type).toBe('excessive_approval_rejections');
        }

        // Verify notification was sent to administrators
        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'admin',
            type: 'security_alert',
            title: 'Suspicious Activity Detected',
            data: expect.objectContaining({
              log_id: detectionResult.log_id
            })
          })
        );

        // Verify suspicious activity audit log was created
        const suspiciousLog = auditService.auditCache.get(detectionResult.log_id);
        expect(suspiciousLog).toBeDefined();
        expect(suspiciousLog.event_type).toBe('suspicious_activity_detected');
        expect(suspiciousLog.entity_type).toBe('security_alert');
        expect(suspiciousLog.user_id).toBe(suspiciousData.user_id);
        expect(suspiciousLog.action).toBe('detect');
        expect(suspiciousLog.suspicious_activity).toBeDefined();
      }
    ), { numRuns: 10 }); // Fewer runs due to complexity
  });

  /**
   * Property 8.5: Audit report generation includes all relevant data
   * Generated audit reports should include all audit entries matching
   * the criteria with proper statistics and integrity verification.
   */
  it('should generate comprehensive audit reports with all relevant data', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        days_back: fc.integer({ min: 1, max: 30 }),
        event_types: fc.array(
          fc.constantFrom('pricing_change', 'payment_transaction', 'approval_decision'),
          { minLength: 1, maxLength: 3 }
        ),
        include_suspicious: fc.boolean()
      }),
      async (reportCriteria) => {
        // Generate some audit entries first
        const testEntries = [];
        const userIds = ['user1', 'user2', 'user3'];
        
        for (let i = 0; i < 15; i++) {
          const userId = userIds[i % userIds.length];
          const eventType = reportCriteria.event_types[i % reportCriteria.event_types.length];
          
          if (eventType === 'pricing_change') {
            const result = await auditService.logPricingChange({
              doctor_id: userId,
              service_type: 'video_call',
              old_price: 1000,
              new_price: 1100,
              changed_by: userId,
              reason: `Test change ${i}`,
              action: 'update',
              old_values: { price: 1000 },
              new_values: { price: 1100 },
              ip_address: '192.168.1.1',
              session_id: `session_${i}`
            });
            testEntries.push(result.audit_id);
          } else if (eventType === 'payment_transaction') {
            const result = await auditService.logPaymentTransaction({
              transaction_id: `txn_${i}`,
              patient_id: userId,
              doctor_id: `doctor_${i}`,
              appointment_id: `appt_${i}`,
              amount: 500,
              payment_method: 'chapa',
              service_type: 'video_call',
              status: 'success',
              action: 'process',
              ip_address: '192.168.1.1',
              session_id: `session_${i}`
            });
            testEntries.push(result.audit_id);
          } else {
            const result = await auditService.logApprovalDecision({
              appointment_id: `appt_${i}`,
              patient_id: `patient_${i}`,
              doctor_id: `doctor_${i}`,
              decided_by: userId,
              decision: 'approve',
              service_type: 'video_call',
              requested_price: 1000,
              doctor_price: 1000,
              reason: `Test approval ${i}`,
              ip_address: '192.168.1.1',
              session_id: `session_${i}`
            });
            testEntries.push(result.audit_id);
          }
        }

        // Generate report
        const startDate = new Date(Date.now() - reportCriteria.days_back * 24 * 60 * 60 * 1000);
        const endDate = new Date();
        
        const report = await auditService.generateAuditReport({
          start_date: startDate,
          end_date: endDate,
          event_types: reportCriteria.event_types,
          user_ids: userIds,
          include_suspicious: reportCriteria.include_suspicious
        });

        expect(report.report_id).toBeDefined();
        expect(report.generated_at).toBeInstanceOf(Date);
        expect(report.criteria).toBeDefined();
        expect(report.statistics).toBeDefined();
        expect(report.integrity_check).toBeDefined();
        expect(report.audit_entries).toBeInstanceOf(Array);
        expect(report.suspicious_activities).toBeInstanceOf(Array);
        expect(report.total_entries).toBe(report.audit_entries.length);
        expect(report.suspicious_count).toBe(report.suspicious_activities.length);

        // Verify statistics completeness
        expect(report.statistics.total_audit_entries).toBe(report.audit_entries.length);
        expect(report.statistics.event_type_breakdown).toBeDefined();
        expect(report.statistics.user_activity_breakdown).toBeDefined();
        expect(report.statistics.most_active_users).toBeInstanceOf(Array);

        // Verify integrity check
        expect(report.integrity_check.total_checked).toBe(report.audit_entries.length);
        expect(report.integrity_check.valid_hashes).toBeGreaterThanOrEqual(0);
        expect(report.integrity_check.invalid_hashes).toBeGreaterThanOrEqual(0);
        expect(report.integrity_check.missing_hashes).toBeGreaterThanOrEqual(0);
        expect(report.integrity_check.integrity_percentage).toBeGreaterThanOrEqual(0);
        expect(report.integrity_check.integrity_percentage).toBeLessThanOrEqual(100);

        // Verify all entries match criteria
        report.audit_entries.forEach(entry => {
          expect(reportCriteria.event_types).toContain(entry.event_type);
          expect(userIds).toContain(entry.user_id);
          expect(entry.created_at).toBeInstanceOf(Date);
          expect(entry.created_at.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(entry.created_at.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });

        // Verify event type breakdown matches actual entries
        const actualEventCounts = {};
        report.audit_entries.forEach(entry => {
          actualEventCounts[entry.event_type] = (actualEventCounts[entry.event_type] || 0) + 1;
        });
        
        Object.keys(actualEventCounts).forEach(eventType => {
          expect(report.statistics.event_type_breakdown[eventType]).toBe(actualEventCounts[eventType]);
        });
      }
    ), { numRuns: 15 });
  });

  /**
   * Property 8.6: Integrity hashes are consistent and verifiable
   * All audit entries should have consistent integrity hashes that
   * can be verified for data integrity purposes.
   */
  it('should generate consistent and verifiable integrity hashes', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        event_type: fc.constantFrom('pricing_change', 'payment_transaction', 'approval_decision'),
        user_id: fc.string({ minLength: 5, maxLength: 20 }),
        entity_id: fc.string({ minLength: 5, maxLength: 20 })
      }),
      async (auditData) => {
        let logResult;
        
        if (auditData.event_type === 'pricing_change') {
          logResult = await auditService.logPricingChange({
            doctor_id: auditData.entity_id,
            service_type: 'video_call',
            old_price: 1000,
            new_price: 1200,
            changed_by: auditData.user_id,
            reason: 'Test pricing change',
            action: 'update',
            old_values: { price: 1000 },
            new_values: { price: 1200 },
            ip_address: '192.168.1.1',
            session_id: 'test_session'
          });
        } else if (auditData.event_type === 'payment_transaction') {
          logResult = await auditService.logPaymentTransaction({
            transaction_id: auditData.entity_id,
            patient_id: auditData.user_id,
            doctor_id: 'test_doctor',
            appointment_id: 'test_appointment',
            amount: 1000,
            payment_method: 'chapa',
            service_type: 'video_call',
            status: 'success',
            action: 'process',
            ip_address: '192.168.1.1',
            session_id: 'test_session'
          });
        } else {
          logResult = await auditService.logApprovalDecision({
            appointment_id: auditData.entity_id,
            patient_id: 'test_patient',
            doctor_id: 'test_doctor',
            decided_by: auditData.user_id,
            decision: 'approve',
            service_type: 'video_call',
            requested_price: 1000,
            doctor_price: 1000,
            reason: 'Test approval',
            ip_address: '192.168.1.1',
            session_id: 'test_session'
          });
        }

        expect(logResult.success).toBe(true);
        expect(logResult.audit_id).toBeDefined();
        
        // Get the audit entry
        const auditEntry = auditService.auditCache.get(logResult.audit_id);
        expect(auditEntry).toBeDefined();
        expect(auditEntry.integrity_hash).toBeDefined();
        expect(auditEntry.integrity_hash).toHaveLength(64); // SHA-256 hash length

        // Verify hash consistency - same data should produce same hash
        let expectedHash;
        if (auditData.event_type === 'pricing_change') {
          expectedHash = auditService.generateChangeHash(auditEntry);
          expect(logResult.audit_hash).toBe(expectedHash);
        } else if (auditData.event_type === 'payment_transaction') {
          expectedHash = auditService.generateTransactionHash(auditEntry);
          expect(logResult.transaction_hash).toBe(expectedHash);
        } else {
          expectedHash = auditService.generateApprovalHash(auditEntry);
          expect(logResult.approval_hash).toBe(expectedHash);
        }

        expect(auditEntry.integrity_hash).toBe(expectedHash);

        // Verify hash changes when data changes
        const originalHash = auditEntry.integrity_hash;
        auditEntry.created_at = new Date(auditEntry.created_at.getTime() + 1000);
        
        let newHash;
        if (auditData.event_type === 'pricing_change') {
          newHash = auditService.generateChangeHash(auditEntry);
        } else if (auditData.event_type === 'payment_transaction') {
          newHash = auditService.generateTransactionHash(auditEntry);
        } else {
          newHash = auditService.generateApprovalHash(auditEntry);
        }
        
        expect(newHash).not.toBe(originalHash);
      }
    ), { numRuns: 25 });
  });
});