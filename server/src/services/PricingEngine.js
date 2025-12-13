/**
 * Core Pricing Engine Service for Enhanced Two-Tier Pricing System
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Requirements: 1.1, 1.2, 2.1, 2.2**
 * 
 * This service handles all pricing-related operations including:
 * - Doctor pricing validation and storage
 * - Market rate calculation and caching
 * - Pricing history management
 * - Suspicious pricing pattern detection
 */

import { Op } from 'sequelize';
import sequelize from '../config/database.js';

class PricingEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Get comprehensive pricing information for a doctor
   * @param {string} doctorId - Doctor's user ID
   * @returns {Object} Complete pricing configuration
   */
  async getDoctorPricing(doctorId) {
    try {
      const { default: EnhancedDoctorServiceFees } = await import('../models/EnhancedDoctorServiceFees.js');
      
      const fees = await EnhancedDoctorServiceFees.findAll({
        where: {
          doctor_id: doctorId,
          is_active: true
        },
        order: [['service_type', 'ASC']]
      });

      const pricing = {
        doctor_id: doctorId,
        services: {
          in_person: { 
            fee: 400.00, 
            set_by: 'admin', 
            auto_approve: false,
            configured: false
          },
          video_call: null,
          chat: null
        },
        last_updated: null,
        total_services: 0
      };

      fees.forEach(fee => {
        pricing.services[fee.service_type] = {
          fee: parseFloat(fee.fee_amount),
          set_by: fee.fee_set_by,
          auto_approve: fee.is_auto_approve,
          configured: true,
          id: fee.id,
          updated_at: fee.updated_at
        };
        pricing.total_services++;
        
        if (!pricing.last_updated || fee.updated_at > pricing.last_updated) {
          pricing.last_updated = fee.updated_at;
        }
      });

      return pricing;
    } catch (error) {
      console.error('Error getting doctor pricing:', error);
      throw new Error('Failed to retrieve doctor pricing configuration');
    }
  }

  /**
   * Set premium pricing for a doctor with comprehensive validation
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type (video_call or chat)
   * @param {number} feeAmount - Fee amount in ETB
   * @param {string} changedBy - User ID who made the change
   * @returns {Object} Updated fee configuration
   */
  async setPremiumPricing(doctorId, serviceType, feeAmount, changedBy = null) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validate input parameters
      await this.validatePricingInput(doctorId, serviceType, feeAmount);

      // Check for suspicious pricing patterns
      const suspiciousCheck = await this.detectSuspiciousPricing(doctorId, serviceType, feeAmount);
      if (suspiciousCheck.suspicious && suspiciousCheck.severity === 'high') {
        await this.flagSuspiciousPricing(doctorId, serviceType, feeAmount, suspiciousCheck, transaction);
      }

      // Get market context for the pricing decision
      const marketContext = await this.getMarketContext(doctorId, serviceType);

      const { default: EnhancedDoctorServiceFees } = await import('../models/EnhancedDoctorServiceFees.js');
      
      // Get existing fee for audit trail
      const existingFee = await EnhancedDoctorServiceFees.findOne({
        where: { doctor_id: doctorId, service_type: serviceType },
        transaction
      });

      // Create or update the fee
      const [fee, created] = await EnhancedDoctorServiceFees.upsert({
        doctor_id: doctorId,
        service_type: serviceType,
        fee_amount: feeAmount,
        fee_set_by: 'doctor',
        is_auto_approve: true,
        is_active: true
      }, { transaction });

      // Log the pricing change with market context
      await this.logPricingChange({
        doctor_id: doctorId,
        service_type: serviceType,
        action_type: created ? 'create' : 'update',
        old_amount: existingFee ? existingFee.fee_amount : null,
        new_amount: feeAmount,
        changed_by: changedBy || doctorId,
        change_reason: created ? 'Initial premium pricing setup' : 'Premium pricing update',
        market_context: marketContext,
        suspicious_flags: suspiciousCheck.suspicious ? suspiciousCheck : null
      }, transaction);

      // Invalidate related caches
      await this.invalidateCache(doctorId, serviceType);

      await transaction.commit();

      return {
        fee,
        created,
        market_context: marketContext,
        suspicious_check: suspiciousCheck
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error setting premium pricing:', error);
      throw error;
    }
  }

  /**
   * Validate pricing input parameters
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @param {number} feeAmount - Fee amount
   */
  async validatePricingInput(doctorId, serviceType, feeAmount) {
    // Validate doctor exists and is active
    const { default: User } = await import('../models/User.js');
    const doctor = await User.findOne({
      where: { id: doctorId, role: 'doctor', is_active: true }
    });
    
    if (!doctor) {
      throw new Error('Doctor not found or inactive');
    }

    // Validate service type
    if (!['video_call', 'chat'].includes(serviceType)) {
      throw new Error('Invalid service type for premium pricing');
    }

    // Validate fee amount
    if (typeof feeAmount !== 'number' || feeAmount < 2000 || feeAmount > 20000) {
      throw new Error('Premium service fees must be between 2,000 and 20,000 ETB');
    }

    // Check if doctor has required wallet configuration for premium services
    const { default: DoctorWalletConfig } = await import('../models/DoctorWalletConfig.js');
    const walletConfig = await DoctorWalletConfig.findOne({
      where: { doctor_id: doctorId, is_active: true }
    });

    if (!walletConfig || !walletConfig.is_verified) {
      throw new Error('Doctor must have a verified wallet configuration for premium services');
    }
  }

  /**
   * Get market context for pricing decisions
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @returns {Object} Market context information
   */
  async getMarketContext(doctorId, serviceType) {
    try {
      const { default: User } = await import('../models/User.js');
      const doctor = await User.findByPk(doctorId);
      
      if (!doctor || !doctor.specialty) {
        return { available: false, reason: 'Doctor specialty not found' };
      }

      // Get cached market rates
      const marketRates = await this.getMarketRates(doctor.specialty, serviceType);
      
      if (!marketRates || marketRates.doctor_count < 3) {
        return { 
          available: false, 
          reason: 'Insufficient market data',
          doctor_count: marketRates ? marketRates.doctor_count : 0
        };
      }

      return {
        available: true,
        specialty: doctor.specialty,
        service_type: serviceType,
        market_avg: marketRates.avg_rate,
        market_min: marketRates.min_rate,
        market_max: marketRates.max_rate,
        market_median: marketRates.median_rate,
        doctor_count: marketRates.doctor_count,
        last_updated: marketRates.last_updated,
        percentile_rank: this.calculatePercentileRank(marketRates, 0) // Will be updated with actual fee
      };
    } catch (error) {
      console.error('Error getting market context:', error);
      return { available: false, reason: 'Error retrieving market data' };
    }
  }

  /**
   * Get market rates with caching
   * @param {string} specialty - Doctor's specialty
   * @param {string} serviceType - Service type
   * @returns {Object} Market rate data
   */
  async getMarketRates(specialty, serviceType) {
    const cacheKey = `market_rates_${specialty}_${serviceType}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const { default: MarketRateAnalytics } = await import('../models/MarketRateAnalytics.js');
      
      // Try to get recent cached data from database
      const marketData = await MarketRateAnalytics.findOne({
        where: { specialty, service_type: serviceType },
        order: [['calculation_date', 'DESC']]
      });

      if (marketData && this.isMarketDataFresh(marketData.calculation_date)) {
        const rates = {
          specialty,
          service_type: serviceType,
          avg_rate: parseFloat(marketData.avg_rate),
          min_rate: parseFloat(marketData.min_rate),
          max_rate: parseFloat(marketData.max_rate),
          median_rate: parseFloat(marketData.median_rate),
          doctor_count: marketData.doctor_count,
          last_updated: marketData.calculation_date,
          is_cached: true
        };

        // Cache in memory
        this.cache.set(cacheKey, {
          data: rates,
          timestamp: Date.now()
        });

        return rates;
      }

      // Calculate fresh market rates
      return await this.calculateMarketRates(specialty, serviceType);
    } catch (error) {
      console.error('Error getting market rates:', error);
      return null;
    }
  }

  /**
   * Calculate fresh market rates
   * @param {string} specialty - Doctor's specialty
   * @param {string} serviceType - Service type
   * @returns {Object} Calculated market rates
   */
  async calculateMarketRates(specialty, serviceType) {
    try {
      const { default: EnhancedDoctorServiceFees } = await import('../models/EnhancedDoctorServiceFees.js');
      
      // Get all active fees for this specialty and service type
      const fees = await sequelize.query(`
        SELECT dsf.fee_amount 
        FROM doctor_service_fees_enhanced dsf
        JOIN users u ON dsf.doctor_id = u.id
        WHERE u.specialty = :specialty 
        AND dsf.service_type = :service_type 
        AND dsf.is_active = true
        AND dsf.fee_set_by = 'doctor'
        ORDER BY dsf.fee_amount
      `, {
        replacements: { specialty, service_type: serviceType },
        type: sequelize.QueryTypes.SELECT
      });

      if (fees.length === 0) {
        return {
          specialty,
          service_type: serviceType,
          avg_rate: null,
          min_rate: null,
          max_rate: null,
          median_rate: null,
          doctor_count: 0,
          last_updated: new Date(),
          is_cached: false
        };
      }

      const amounts = fees.map(f => parseFloat(f.fee_amount));
      const sum = amounts.reduce((a, b) => a + b, 0);
      const avg = sum / amounts.length;
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      
      // Calculate median
      const sorted = amounts.sort((a, b) => a - b);
      const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      const marketData = {
        specialty,
        service_type: serviceType,
        avg_rate: avg,
        min_rate: min,
        max_rate: max,
        median_rate: median,
        doctor_count: amounts.length,
        last_updated: new Date(),
        is_cached: false
      };

      // Cache the calculated data
      await this.cacheMarketData(marketData);

      // Cache in memory
      const cacheKey = `market_rates_${specialty}_${serviceType}`;
      this.cache.set(cacheKey, {
        data: marketData,
        timestamp: Date.now()
      });

      return marketData;
    } catch (error) {
      console.error('Error calculating market rates:', error);
      throw new Error('Failed to calculate market rates');
    }
  }

  /**
   * Detect suspicious pricing patterns
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @param {number} newAmount - New fee amount
   * @returns {Object} Suspicious pricing analysis
   */
  async detectSuspiciousPricing(doctorId, serviceType, newAmount) {
    try {
      const { default: User } = await import('../models/User.js');
      const doctor = await User.findByPk(doctorId);
      
      if (!doctor || !doctor.specialty) {
        return { suspicious: false, reason: 'Doctor specialty not found' };
      }

      // Get market rates for comparison
      const marketRates = await this.getMarketRates(doctor.specialty, serviceType);
      
      if (!marketRates || marketRates.doctor_count < 3) {
        return { suspicious: false, reason: 'Insufficient market data' };
      }

      const amount = parseFloat(newAmount);
      const avgRate = marketRates.avg_rate;
      const maxRate = marketRates.max_rate;
      
      // Calculate deviations
      const deviationFromAvg = (amount - avgRate) / avgRate;
      const deviationFromMax = (amount - maxRate) / maxRate;
      
      // Check for rapid price changes
      const recentChanges = await this.getRecentPricingChanges(doctorId, serviceType, 7); // Last 7 days
      
      let suspiciousReasons = [];
      let severity = 'low';
      
      // Flag significantly above market rates
      if (deviationFromAvg > 0.5) { // 50% above average
        suspiciousReasons.push(`${Math.round(deviationFromAvg * 100)}% above market average`);
        severity = deviationFromAvg > 1.0 ? 'high' : 'medium';
      }
      
      if (deviationFromMax > 0.25) { // 25% above market maximum
        suspiciousReasons.push(`${Math.round(deviationFromMax * 100)}% above market maximum`);
        severity = 'high';
      }

      // Flag frequent price changes
      if (recentChanges.length > 3) {
        suspiciousReasons.push(`${recentChanges.length} price changes in last 7 days`);
        severity = severity === 'high' ? 'high' : 'medium';
      }

      // Flag extreme pricing
      if (amount >= 18000) { // Near maximum allowed
        suspiciousReasons.push('Near maximum allowed pricing limit');
        severity = severity === 'high' ? 'high' : 'medium';
      }

      return {
        suspicious: suspiciousReasons.length > 0,
        reasons: suspiciousReasons,
        severity,
        market_context: {
          avg_rate: avgRate,
          max_rate: maxRate,
          deviation_from_avg: deviationFromAvg,
          deviation_from_max: deviationFromMax
        },
        recent_changes: recentChanges.length,
        analysis_date: new Date()
      };
    } catch (error) {
      console.error('Error detecting suspicious pricing:', error);
      return { suspicious: false, reason: 'Error during analysis' };
    }
  }

  /**
   * Get recent pricing changes for a doctor
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @param {number} days - Number of days to look back
   * @returns {Array} Recent pricing changes
   */
  async getRecentPricingChanges(doctorId, serviceType, days = 30) {
    try {
      const { default: PricingAuditLog } = await import('../models/PricingAuditLog.js');
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const changes = await PricingAuditLog.findAll({
        where: {
          doctor_id: doctorId,
          service_type: serviceType,
          created_at: {
            [Op.gte]: startDate
          }
        },
        order: [['created_at', 'DESC']]
      });

      return changes;
    } catch (error) {
      console.error('Error getting recent pricing changes:', error);
      return [];
    }
  }

  /**
   * Flag suspicious pricing for admin review
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   * @param {number} amount - Fee amount
   * @param {Object} suspiciousCheck - Suspicious pricing analysis
   * @param {Object} transaction - Database transaction
   */
  async flagSuspiciousPricing(doctorId, serviceType, amount, suspiciousCheck, transaction) {
    try {
      // Create notification for admin review
      const { default: Notification } = await import('../models/Notification.js');
      
      await Notification.create({
        userId: 'admin', // System notification
        type: 'suspicious_pricing',
        title: 'Suspicious Pricing Detected',
        message: `Doctor ${doctorId} set ${serviceType} fee to ${amount} ETB. ${suspiciousCheck.reasons.join(', ')}.`,
        data: {
          doctor_id: doctorId,
          service_type: serviceType,
          fee_amount: amount,
          suspicious_analysis: suspiciousCheck
        },
        priority: suspiciousCheck.severity === 'high' ? 'high' : 'medium'
      }, { transaction });

      console.log(`Suspicious pricing flagged for doctor ${doctorId}: ${suspiciousCheck.reasons.join(', ')}`);
    } catch (error) {
      console.error('Error flagging suspicious pricing:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log pricing changes for audit trail
   * @param {Object} changeData - Change data
   * @param {Object} transaction - Database transaction
   */
  async logPricingChange(changeData, transaction) {
    try {
      const { default: PricingAuditLog } = await import('../models/PricingAuditLog.js');
      
      await PricingAuditLog.create({
        doctor_id: changeData.doctor_id,
        service_type: changeData.service_type,
        action_type: changeData.action_type,
        old_amount: changeData.old_amount,
        new_amount: changeData.new_amount,
        changed_by: changeData.changed_by,
        change_reason: changeData.change_reason,
        market_context: changeData.market_context,
        suspicious_flags: changeData.suspicious_flags,
        is_admin_override: changeData.changed_by !== changeData.doctor_id
      }, { transaction });
    } catch (error) {
      console.error('Error logging pricing change:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Calculate percentile rank for a fee amount
   * @param {Object} marketRates - Market rate data
   * @param {number} amount - Fee amount
   * @returns {number} Percentile rank (0-100)
   */
  calculatePercentileRank(marketRates, amount) {
    if (!marketRates || marketRates.doctor_count === 0) {
      return null;
    }

    // Simple percentile calculation based on min/max
    const range = marketRates.max_rate - marketRates.min_rate;
    if (range === 0) return 50; // All fees are the same

    const position = (amount - marketRates.min_rate) / range;
    return Math.max(0, Math.min(100, Math.round(position * 100)));
  }

  /**
   * Check if market data is fresh
   * @param {Date} calculationDate - When the data was calculated
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {boolean} Whether the data is fresh
   */
  isMarketDataFresh(calculationDate, maxAgeHours = 24) {
    const now = new Date();
    const dataAge = (now - new Date(calculationDate)) / (1000 * 60 * 60); // hours
    return dataAge < maxAgeHours;
  }

  /**
   * Cache market data in database
   * @param {Object} marketData - Market rate data
   */
  async cacheMarketData(marketData) {
    try {
      const { default: MarketRateAnalytics } = await import('../models/MarketRateAnalytics.js');
      
      await MarketRateAnalytics.upsert({
        specialty: marketData.specialty,
        service_type: marketData.service_type,
        avg_rate: marketData.avg_rate,
        min_rate: marketData.min_rate,
        max_rate: marketData.max_rate,
        median_rate: marketData.median_rate,
        doctor_count: marketData.doctor_count,
        calculation_date: marketData.last_updated
      });
    } catch (error) {
      console.error('Error caching market data:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Invalidate cache for a doctor's pricing
   * @param {string} doctorId - Doctor's user ID
   * @param {string} serviceType - Service type
   */
  async invalidateCache(doctorId, serviceType) {
    try {
      // Get doctor's specialty to invalidate market rate cache
      const { default: User } = await import('../models/User.js');
      const doctor = await User.findByPk(doctorId);
      
      if (doctor && doctor.specialty) {
        const cacheKey = `market_rates_${doctor.specialty}_${serviceType}`;
        this.cache.delete(cacheKey);
      }

      // Invalidate doctor-specific caches
      const doctorCacheKey = `doctor_pricing_${doctorId}`;
      this.cache.delete(doctorCacheKey);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Get pricing analytics for admin dashboard
   * @param {Object} filters - Filter options
   * @returns {Object} Pricing analytics data
   */
  async getPricingAnalytics(filters = {}) {
    try {
      const { specialty, serviceType, timeRange = 30 } = filters;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Get pricing distribution
      const { default: EnhancedDoctorServiceFees } = await import('../models/EnhancedDoctorServiceFees.js');
      
      let whereClause = {
        is_active: true,
        fee_set_by: 'doctor',
        created_at: { [Op.gte]: startDate }
      };

      if (serviceType) {
        whereClause.service_type = serviceType;
      }

      const query = `
        SELECT 
          dsf.service_type,
          u.specialty,
          COUNT(*) as doctor_count,
          AVG(dsf.fee_amount) as avg_fee,
          MIN(dsf.fee_amount) as min_fee,
          MAX(dsf.fee_amount) as max_fee,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dsf.fee_amount) as median_fee
        FROM doctor_service_fees_enhanced dsf
        JOIN users u ON dsf.doctor_id = u.id
        WHERE dsf.is_active = true 
        AND dsf.fee_set_by = 'doctor'
        AND dsf.created_at >= :startDate
        ${specialty ? 'AND u.specialty = :specialty' : ''}
        ${serviceType ? 'AND dsf.service_type = :serviceType' : ''}
        GROUP BY dsf.service_type, u.specialty
        ORDER BY dsf.service_type, u.specialty
      `;

      const replacements = { startDate };
      if (specialty) replacements.specialty = specialty;
      if (serviceType) replacements.serviceType = serviceType;

      const analytics = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      return {
        time_range: timeRange,
        filters: { specialty, serviceType },
        analytics,
        generated_at: new Date()
      };
    } catch (error) {
      console.error('Error getting pricing analytics:', error);
      throw new Error('Failed to generate pricing analytics');
    }
  }
}

export default PricingEngine;