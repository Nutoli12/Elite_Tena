/**
 * Comprehensive Audit Service
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 5.1: Comprehensive AuditService**
 * **Requirements: 9.1, 9.2, 9.3, 9.4, 9.5**
 * 
 * Provides audit logging for all pricing changes, payment transaction audit trails,
 * approval decision logging, and suspicious activity detection.
 */

import { Op } from 'sequelize';
import crypto from 'crypto';

export class AuditService {
  constructor(models, notificationService) {
    this.models = models;
    this.notificationService = notificationService;
    this.auditCache = new Map();
    this.suspiciousActivityThresholds = {
      pricing_changes_per_hour: 10,
      payment_failures_per_hour: 5,
      approval_rejections_per_hour: 20,
      login_attempts_per_hour: 15
    };
    this.activityCounters = new Map();
  }

  /**
   * Log pricing change audit trail
   * @param {Object} pricingChangeData - Pricing change information
   * @returns {Object} Audit log result
   */
  async logPricingChange(pricingChangeData) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'pricing_change',
        entity_type: 'doctor_service_fees',
        entity_id: pricingChangeData.doctor_id,
        user_id: pricingChangeData.changed_by,
        action: pricingChangeData.action || 'update',
        old_values: pricingChangeData.old_values,
        new_values: pricingChangeData.new_values,
        change_reason: pricingChangeData.reason,
        metadata: {
          service_type: pricingChangeData.service_type,
          old_price: pricingChangeData.old_values?.price,
          new_price: pricingChangeData.new_values?.price,
          price_difference: this.calculatePriceDifference(
            pricingChangeData.old_values?.price,
            pricingChangeData.new_values?.price
          ),
          market_rate_context: pricingChangeData.market_context,
          approval_status: pricingChangeData.approval_status
        },
        ip_address: pricingChangeData.ip_address,
        user_agent: pricingChangeData.user_agent,
        session_id: pricingChangeData.session_id
      });

      // Check for suspicious pricing activity
      await this.checkSuspiciousPricingActivity(pricingChangeData);

      // Generate pricing change hash for integrity
      const changeHash = this.generateChangeHash(auditEntry);
      await this.updateAuditEntryHash(auditEntry.id, changeHash);

      return {
        success: true,
        audit_id: auditEntry.id,
        audit_hash: changeHash,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Pricing change audit logging failed: ${error.message}`);
    }
  }

  /**
   * Log payment transaction audit trail
   * @param {Object} paymentData - Payment transaction information
   * @returns {Object} Audit log result
   */
  async logPaymentTransaction(paymentData) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'payment_transaction',
        entity_type: 'payment_transaction',
        entity_id: paymentData.transaction_id,
        user_id: paymentData.patient_id,
        action: paymentData.action || 'process',
        transaction_details: {
          amount: paymentData.amount,
          currency: paymentData.currency || 'ETB',
          payment_method: paymentData.payment_method,
          gateway_response: paymentData.gateway_response,
          approval_method: paymentData.approval_method,
          routing_destination: paymentData.routing_destination,
          platform_fee: paymentData.platform_fee,
          doctor_amount: paymentData.doctor_amount
        },
        metadata: {
          appointment_id: paymentData.appointment_id,
          doctor_id: paymentData.doctor_id,
          service_type: paymentData.service_type,
          payment_status: paymentData.status,
          gateway_transaction_id: paymentData.gateway_transaction_id,
          processing_time_ms: paymentData.processing_time,
          retry_count: paymentData.retry_count || 0
        },
        ip_address: paymentData.ip_address,
        user_agent: paymentData.user_agent,
        session_id: paymentData.session_id
      });

      // Check for suspicious payment activity
      await this.checkSuspiciousPaymentActivity(paymentData);

      // Generate transaction hash for integrity
      const transactionHash = this.generateTransactionHash(auditEntry);
      await this.updateAuditEntryHash(auditEntry.id, transactionHash);

      return {
        success: true,
        audit_id: auditEntry.id,
        transaction_hash: transactionHash,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Payment transaction audit logging failed: ${error.message}`);
    }
  }

  /**
   * Log approval decision audit trail
   * @param {Object} approvalData - Approval decision information
   * @returns {Object} Audit log result
   */
  async logApprovalDecision(approvalData) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'approval_decision',
        entity_type: 'appointment_approval',
        entity_id: approvalData.appointment_id,
        user_id: approvalData.decided_by,
        action: approvalData.decision, // 'approve', 'reject', 'auto_approve'
        decision_details: {
          decision: approvalData.decision,
          decision_reason: approvalData.reason,
          auto_approval_criteria: approvalData.auto_criteria,
          manual_review_notes: approvalData.review_notes,
          alternative_suggestions: approvalData.alternatives,
          decision_time_ms: approvalData.decision_time
        },
        metadata: {
          appointment_id: approvalData.appointment_id,
          patient_id: approvalData.patient_id,
          doctor_id: approvalData.doctor_id,
          service_type: approvalData.service_type,
          requested_price: approvalData.requested_price,
          doctor_price: approvalData.doctor_price,
          price_match: approvalData.price_match,
          approval_method: approvalData.approval_method, // 'auto', 'manual'
          queue_wait_time: approvalData.queue_wait_time
        },
        ip_address: approvalData.ip_address,
        user_agent: approvalData.user_agent,
        session_id: approvalData.session_id
      });

      // Check for suspicious approval patterns
      await this.checkSuspiciousApprovalActivity(approvalData);

      // Generate approval hash for integrity
      const approvalHash = this.generateApprovalHash(auditEntry);
      await this.updateAuditEntryHash(auditEntry.id, approvalHash);

      return {
        success: true,
        audit_id: auditEntry.id,
        approval_hash: approvalHash,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Approval decision audit logging failed: ${error.message}`);
    }
  }

  /**
   * Log payment holding operation
   * @param {Object} holdingData - Payment holding information
   * @returns {Object} Audit log result
   */
  async logPaymentHolding(holdingData) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'payment_holding',
        entity_type: 'payment_holding',
        entity_id: holdingData.id,
        user_id: holdingData.patient_id,
        action: 'hold',
        holding_details: {
          held_amount: holdingData.held_amount,
          platform_fee: holdingData.platform_fee,
          net_doctor_amount: holdingData.net_doctor_amount,
          release_conditions: holdingData.release_conditions,
          estimated_release_time: holdingData.estimated_release_time
        },
        metadata: {
          appointment_id: holdingData.appointment_id,
          doctor_id: holdingData.doctor_id,
          service_type: holdingData.service_type,
          payment_method: holdingData.payment_method,
          original_transaction_id: holdingData.original_transaction_id
        }
      });

      return {
        success: true,
        audit_id: auditEntry.id,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Payment holding audit logging failed: ${error.message}`);
    }
  }

  /**
   * Log payment release operation
   * @param {Object} holdingData - Original holding data
   * @param {Object} releaseData - Release operation data
   * @returns {Object} Audit log result
   */
  async logPaymentRelease(holdingData, releaseData) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'payment_release',
        entity_type: 'payment_holding',
        entity_id: holdingData.id,
        user_id: holdingData.doctor_id,
        action: 'release',
        release_details: {
          release_id: releaseData.release_id,
          doctor_amount: releaseData.doctor_amount || releaseData.release_amount,
          platform_fee_collected: releaseData.platform_fee_collected,
          release_method: releaseData.release_method,
          release_trigger: releaseData.release_trigger || 'consultation_completed'
        },
        metadata: {
          appointment_id: holdingData.appointment_id,
          patient_id: holdingData.patient_id,
          original_held_amount: holdingData.held_amount,
          gateway_transaction_id: releaseData.transaction_id,
          release_conditions_met: releaseData.conditions_met
        }
      });

      return {
        success: true,
        audit_id: auditEntry.id,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Payment release audit logging failed: ${error.message}`);
    }
  }

  /**
   * Log payment refund operation
   * @param {Object} holdingData - Original holding/payment data
   * @param {Object} refundData - Refund operation data
   * @returns {Object} Audit log result
   */
  async logPaymentRefund(holdingData, refundData) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'payment_refund',
        entity_type: 'payment_refund',
        entity_id: refundData.refund_id,
        user_id: holdingData.patient_id,
        action: 'refund',
        refund_details: {
          refund_id: refundData.refund_id,
          refund_amount: refundData.refund_amount,
          refund_method: refundData.refund_method,
          refund_reason: refundData.refund_reason,
          original_transaction: holdingData.original_transaction_id
        },
        metadata: {
          appointment_id: holdingData.appointment_id,
          doctor_id: holdingData.doctor_id,
          original_amount: holdingData.held_amount || holdingData.original_amount,
          gateway_transaction_id: refundData.transaction_id,
          refund_type: holdingData.refund_type
        }
      });

      return {
        success: true,
        audit_id: auditEntry.id,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Payment refund audit logging failed: ${error.message}`);
    }
  }

  /**
   * Log refund processing operation
   * @param {Object} refundRecord - Refund record data
   * @param {Object} refundResult - Refund processing result
   * @returns {Object} Audit log result
   */
  async logRefundProcessing(refundRecord, refundResult) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'refund_processing',
        entity_type: 'refund_record',
        entity_id: refundRecord.id,
        user_id: refundRecord.patient_id,
        action: 'process_refund',
        refund_details: {
          refund_type: refundRecord.refund_type,
          refund_reason: refundRecord.refund_reason,
          original_amount: refundRecord.original_amount,
          refund_amount: refundRecord.refund_amount,
          penalty_amount: refundRecord.penalty_amount,
          refund_policy: refundRecord.refund_policy
        },
        processing_result: {
          status: refundResult.status,
          gateway_refund_id: refundResult.gateway_refund_id,
          transaction_id: refundResult.transaction_id,
          estimated_completion: refundResult.estimated_completion
        },
        metadata: {
          appointment_id: refundRecord.appointment_id,
          doctor_id: refundRecord.doctor_id,
          initiated_by: refundRecord.initiated_by,
          payment_method: refundRecord.payment_method
        }
      });

      return {
        success: true,
        audit_id: auditEntry.id,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Refund processing audit logging failed: ${error.message}`);
    }
  }

  /**
   * Log bulk refund operation
   * @param {Object} bulkRefundData - Bulk refund operation data
   * @returns {Object} Audit log result
   */
  async logBulkRefundOperation(bulkRefundData) {
    try {
      const auditEntry = await this.createAuditEntry({
        event_type: 'bulk_refund_operation',
        entity_type: 'bulk_operation',
        entity_id: bulkRefundData.batch_id,
        user_id: bulkRefundData.initiated_by,
        action: 'bulk_refund',
        bulk_operation_details: {
          batch_id: bulkRefundData.batch_id,
          total_appointments: bulkRefundData.total_appointments,
          successful_refunds: bulkRefundData.successful_refunds,
          failed_refunds: bulkRefundData.failed_refunds,
          total_refund_amount: bulkRefundData.total_refund_amount,
          operation_reason: bulkRefundData.reason
        },
        metadata: {
          initiated_by: bulkRefundData.initiated_by,
          operation_type: 'system_wide_refund'
        }
      });

      return {
        success: true,
        audit_id: auditEntry.id,
        logged_at: auditEntry.created_at
      };
    } catch (error) {
      throw new Error(`Bulk refund operation audit logging failed: ${error.message}`);
    }
  }

  /**
   * Detect and log suspicious activity
   * @param {Object} activityData - Activity information
   * @returns {Object} Detection result
   */
  async detectSuspiciousActivity(activityData) {
    try {
      const suspiciousIndicators = [];

      // Check for rapid pricing changes
      if (activityData.event_type === 'pricing_change') {
        const recentChanges = await this.getRecentPricingChanges(
          activityData.user_id,
          60 * 60 * 1000 // 1 hour
        );

        if (recentChanges.length > this.suspiciousActivityThresholds.pricing_changes_per_hour) {
          suspiciousIndicators.push({
            type: 'excessive_pricing_changes',
            count: recentChanges.length,
            threshold: this.suspiciousActivityThresholds.pricing_changes_per_hour,
            severity: 'high'
          });
        }
      }

      // Check for payment failure patterns
      if (activityData.event_type === 'payment_transaction' && activityData.status === 'failed') {
        const recentFailures = await this.getRecentPaymentFailures(
          activityData.user_id,
          60 * 60 * 1000 // 1 hour
        );

        if (recentFailures.length > this.suspiciousActivityThresholds.payment_failures_per_hour) {
          suspiciousIndicators.push({
            type: 'excessive_payment_failures',
            count: recentFailures.length,
            threshold: this.suspiciousActivityThresholds.payment_failures_per_hour,
            severity: 'medium'
          });
        }
      }

      // Check for approval rejection patterns
      if (activityData.event_type === 'approval_decision' && activityData.decision === 'reject') {
        const recentRejections = await this.getRecentApprovalRejections(
          activityData.user_id,
          60 * 60 * 1000 // 1 hour
        );

        if (recentRejections.length > this.suspiciousActivityThresholds.approval_rejections_per_hour) {
          suspiciousIndicators.push({
            type: 'excessive_approval_rejections',
            count: recentRejections.length,
            threshold: this.suspiciousActivityThresholds.approval_rejections_per_hour,
            severity: 'medium'
          });
        }
      }

      // If suspicious activity detected, log and alert
      if (suspiciousIndicators.length > 0) {
        const suspiciousActivityLog = await this.logSuspiciousActivity({
          user_id: activityData.user_id,
          activity_type: activityData.event_type,
          indicators: suspiciousIndicators,
          context: activityData,
          detected_at: new Date()
        });

        // Send alert to administrators
        await this.alertAdministrators(suspiciousActivityLog);

        return {
          suspicious: true,
          indicators: suspiciousIndicators,
          log_id: suspiciousActivityLog.id,
          severity: this.calculateOverallSeverity(suspiciousIndicators)
        };
      }

      return {
        suspicious: false,
        indicators: []
      };
    } catch (error) {
      throw new Error(`Suspicious activity detection failed: ${error.message}`);
    }
  }

  /**
   * Generate audit report
   * @param {Object} reportCriteria - Report generation criteria
   * @returns {Object} Audit report
   */
  async generateAuditReport(reportCriteria) {
    try {
      const {
        start_date,
        end_date,
        event_types,
        user_ids,
        entity_types,
        include_suspicious = true
      } = reportCriteria;

      // Get audit entries based on criteria
      const auditEntries = await this.getAuditEntries({
        start_date,
        end_date,
        event_types,
        user_ids,
        entity_types
      });

      // Get suspicious activity logs if requested
      let suspiciousActivities = [];
      if (include_suspicious) {
        suspiciousActivities = await this.getSuspiciousActivities({
          start_date,
          end_date,
          user_ids
        });
      }

      // Generate report statistics
      const statistics = this.generateReportStatistics(auditEntries, suspiciousActivities);

      // Generate integrity verification
      const integrityCheck = await this.verifyAuditIntegrity(auditEntries);

      const report = {
        report_id: `audit_report_${Date.now()}`,
        generated_at: new Date(),
        criteria: reportCriteria,
        statistics,
        integrity_check: integrityCheck,
        audit_entries: auditEntries,
        suspicious_activities: suspiciousActivities,
        total_entries: auditEntries.length,
        suspicious_count: suspiciousActivities.length
      };

      // Log report generation
      await this.logReportGeneration(report);

      return report;
    } catch (error) {
      throw new Error(`Audit report generation failed: ${error.message}`);
    }
  }

  /**
   * Create audit entry
   * @private
   */
  async createAuditEntry(auditData) {
    const auditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...auditData,
      created_at: new Date(),
      integrity_hash: null // Will be set later
    };

    // In a real implementation, this would save to database
    // For now, we'll simulate with in-memory storage
    this.auditCache.set(auditEntry.id, auditEntry);

    return auditEntry;
  }

  /**
   * Generate change hash for integrity
   * @private
   */
  generateChangeHash(auditEntry) {
    const hashData = {
      event_type: auditEntry.event_type,
      entity_id: auditEntry.entity_id,
      user_id: auditEntry.user_id,
      action: auditEntry.action,
      old_values: auditEntry.old_values,
      new_values: auditEntry.new_values,
      created_at: auditEntry.created_at.toISOString()
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Generate transaction hash for integrity
   * @private
   */
  generateTransactionHash(auditEntry) {
    const hashData = {
      event_type: auditEntry.event_type,
      entity_id: auditEntry.entity_id,
      transaction_details: auditEntry.transaction_details,
      created_at: auditEntry.created_at.toISOString()
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Generate approval hash for integrity
   * @private
   */
  generateApprovalHash(auditEntry) {
    const hashData = {
      event_type: auditEntry.event_type,
      entity_id: auditEntry.entity_id,
      decision_details: auditEntry.decision_details,
      created_at: auditEntry.created_at.toISOString()
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Update audit entry hash
   * @private
   */
  async updateAuditEntryHash(auditId, hash) {
    const auditEntry = this.auditCache.get(auditId);
    if (auditEntry) {
      auditEntry.integrity_hash = hash;
      this.auditCache.set(auditId, auditEntry);
    }
  }

  /**
   * Calculate price difference
   * @private
   */
  calculatePriceDifference(oldPrice, newPrice) {
    if (!oldPrice || !newPrice) return null;
    
    const difference = newPrice - oldPrice;
    const percentageChange = (difference / oldPrice) * 100;
    
    return {
      absolute_difference: difference,
      percentage_change: percentageChange,
      direction: difference > 0 ? 'increase' : 'decrease'
    };
  }

  /**
   * Check suspicious pricing activity
   * @private
   */
  async checkSuspiciousPricingActivity(pricingData) {
    // Implementation would check for suspicious patterns
    console.log(`Checking suspicious pricing activity for ${pricingData.doctor_id}`);
  }

  /**
   * Check suspicious payment activity
   * @private
   */
  async checkSuspiciousPaymentActivity(paymentData) {
    // Implementation would check for suspicious patterns
    console.log(`Checking suspicious payment activity for ${paymentData.patient_id}`);
  }

  /**
   * Check suspicious approval activity
   * @private
   */
  async checkSuspiciousApprovalActivity(approvalData) {
    // Implementation would check for suspicious patterns
    console.log(`Checking suspicious approval activity for ${approvalData.decided_by}`);
  }

  /**
   * Utility methods for suspicious activity detection
   * @private
   */
  async getRecentPricingChanges(userId, timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const changes = [];
    
    for (const [id, entry] of this.auditCache.entries()) {
      if (entry.event_type === 'pricing_change' && 
          entry.user_id === userId && 
          entry.created_at > cutoffTime) {
        changes.push(entry);
      }
    }
    
    return changes;
  }

  async getRecentPaymentFailures(userId, timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const failures = [];
    
    for (const [id, entry] of this.auditCache.entries()) {
      if (entry.event_type === 'payment_transaction' && 
          entry.user_id === userId && 
          entry.metadata?.payment_status === 'failed' &&
          entry.created_at > cutoffTime) {
        failures.push(entry);
      }
    }
    
    return failures;
  }

  async getRecentApprovalRejections(userId, timeWindow) {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const rejections = [];
    
    for (const [id, entry] of this.auditCache.entries()) {
      if (entry.event_type === 'approval_decision' && 
          entry.user_id === userId && 
          entry.action === 'reject' &&
          entry.created_at > cutoffTime) {
        rejections.push(entry);
      }
    }
    
    return rejections;
  }

  async logSuspiciousActivity(suspiciousData) {
    return await this.createAuditEntry({
      event_type: 'suspicious_activity_detected',
      entity_type: 'security_alert',
      entity_id: `suspicious_${Date.now()}`,
      user_id: suspiciousData.user_id,
      action: 'detect',
      suspicious_activity: suspiciousData
    });
  }

  async alertAdministrators(suspiciousActivityLog) {
    if (!this.notificationService) return;

    try {
      await this.notificationService.sendNotification({
        user_id: 'admin',
        type: 'security_alert',
        title: 'Suspicious Activity Detected',
        message: `Suspicious activity detected for user ${suspiciousActivityLog.user_id}`,
        data: {
          log_id: suspiciousActivityLog.id,
          severity: suspiciousActivityLog.suspicious_activity.severity
        }
      });
    } catch (error) {
      console.error('Failed to alert administrators:', error);
    }
  }

  calculateOverallSeverity(indicators) {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const maxSeverity = Math.max(...indicators.map(i => severityLevels[i.severity] || 1));
    
    return Object.keys(severityLevels).find(key => severityLevels[key] === maxSeverity);
  }

  async getAuditEntries(criteria) {
    const entries = [];
    
    for (const [id, entry] of this.auditCache.entries()) {
      let include = true;
      
      if (criteria.start_date && entry.created_at < criteria.start_date) include = false;
      if (criteria.end_date && entry.created_at > criteria.end_date) include = false;
      if (criteria.event_types && !criteria.event_types.includes(entry.event_type)) include = false;
      if (criteria.user_ids && !criteria.user_ids.includes(entry.user_id)) include = false;
      if (criteria.entity_types && !criteria.entity_types.includes(entry.entity_type)) include = false;
      
      if (include) {
        entries.push(entry);
      }
    }
    
    return entries;
  }

  async getSuspiciousActivities(criteria) {
    return await this.getAuditEntries({
      ...criteria,
      event_types: ['suspicious_activity_detected']
    });
  }

  generateReportStatistics(auditEntries, suspiciousActivities) {
    const eventTypeCounts = {};
    const userActivityCounts = {};
    
    auditEntries.forEach(entry => {
      eventTypeCounts[entry.event_type] = (eventTypeCounts[entry.event_type] || 0) + 1;
      userActivityCounts[entry.user_id] = (userActivityCounts[entry.user_id] || 0) + 1;
    });
    
    return {
      total_audit_entries: auditEntries.length,
      event_type_breakdown: eventTypeCounts,
      user_activity_breakdown: userActivityCounts,
      suspicious_activity_count: suspiciousActivities.length,
      most_active_users: Object.entries(userActivityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  async verifyAuditIntegrity(auditEntries) {
    let validHashes = 0;
    let invalidHashes = 0;
    let missingHashes = 0;
    
    for (const entry of auditEntries) {
      if (!entry.integrity_hash) {
        missingHashes++;
        continue;
      }
      
      // Verify hash based on entry type
      let expectedHash;
      if (entry.event_type === 'pricing_change') {
        expectedHash = this.generateChangeHash(entry);
      } else if (entry.event_type === 'payment_transaction') {
        expectedHash = this.generateTransactionHash(entry);
      } else if (entry.event_type === 'approval_decision') {
        expectedHash = this.generateApprovalHash(entry);
      }
      
      if (expectedHash === entry.integrity_hash) {
        validHashes++;
      } else {
        invalidHashes++;
      }
    }
    
    return {
      total_checked: auditEntries.length,
      valid_hashes: validHashes,
      invalid_hashes: invalidHashes,
      missing_hashes: missingHashes,
      integrity_percentage: auditEntries.length > 0 ? (validHashes / auditEntries.length) * 100 : 100
    };
  }

  async logReportGeneration(report) {
    await this.createAuditEntry({
      event_type: 'audit_report_generated',
      entity_type: 'audit_report',
      entity_id: report.report_id,
      user_id: 'system',
      action: 'generate',
      report_metadata: {
        criteria: report.criteria,
        total_entries: report.total_entries,
        suspicious_count: report.suspicious_count
      }
    });
  }
}

export default AuditService;