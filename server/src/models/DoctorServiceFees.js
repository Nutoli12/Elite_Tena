const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DoctorServiceFees = sequelize.define('DoctorServiceFees', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  doctor_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  service_type: {
    type: DataTypes.ENUM('in_person', 'video_call', 'chat'),
    allowNull: false,
    validate: {
      isIn: [['in_person', 'video_call', 'chat']]
    }
  },
  fee_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      customValidation(value) {
        // Enhanced validation for two-tier pricing system
        if (this.service_type === 'in_person' && parseFloat(value) !== 400.00) {
          throw new Error('In-person consultations must be exactly 400.00 ETB');
        }
        if (this.service_type !== 'in_person' && (parseFloat(value) < 2000 || parseFloat(value) > 20000)) {
          throw new Error('Premium services must be between 2,000 and 20,000 ETB');
        }
      }
    }
  },
  fee_set_by: {
    type: DataTypes.ENUM('admin', 'doctor'),
    allowNull: false,
    defaultValue: 'doctor',
    validate: {
      customValidation(value) {
        // Enforce business rules for fee setting authority
        if (this.service_type === 'in_person' && value !== 'admin') {
          throw new Error('In-person consultation fees must be set by admin');
        }
        if (this.service_type !== 'in_person' && value !== 'doctor') {
          throw new Error('Premium service fees must be set by doctor');
        }
      }
    }
  },
  is_auto_approve: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    validate: {
      customValidation(value) {
        // Admin-set fees cannot have auto-approval
        if (this.fee_set_by === 'admin' && value === true) {
          throw new Error('Admin-set fees cannot have auto-approval enabled');
        }
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'doctor_service_fees',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['doctor_id', 'service_type']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['service_type']
    },
    {
      fields: ['is_auto_approve']
    },
    {
      fields: ['fee_set_by']
    },
    {
      fields: ['is_active']
    }
  ],
  hooks: {
    beforeValidate: (instance) => {
      // Automatically set auto-approve for premium services
      if (instance.service_type !== 'in_person' && instance.fee_set_by === 'doctor') {
        instance.is_auto_approve = true;
      }
    },
    beforeCreate: async (instance) => {
      // Log pricing creation for audit trail
      await DoctorServiceFees.logPricingChange(instance, 'create');
    },
    beforeUpdate: async (instance) => {
      // Log pricing updates for audit trail
      if (instance.changed('fee_amount')) {
        await DoctorServiceFees.logPricingChange(instance, 'update');
      }
    }
  }
});

// Enhanced class methods for comprehensive pricing logic
DoctorServiceFees.getPricingForDoctor = async function(doctorId) {
  try {
    const fees = await this.findAll({
      where: {
        doctor_id: doctorId,
        is_active: true
      },
      order: [['service_type', 'ASC']]
    });

    const pricing = {
      in_person: { fee: 400.00, set_by: 'admin', auto_approve: false },
      video_call: null,
      chat: null
    };

    fees.forEach(fee => {
      pricing[fee.service_type] = {
        fee: parseFloat(fee.fee_amount),
        set_by: fee.fee_set_by,
        auto_approve: fee.is_auto_approve,
        id: fee.id,
        updated_at: fee.updated_at
      };
    });

    return pricing;
  } catch (error) {
    console.error('Error getting doctor pricing:', error);
    throw error;
  }
};

DoctorServiceFees.setDoctorPremiumPricing = async function(doctorId, serviceType, feeAmount, changedBy = null) {
  const transaction = await sequelize.transaction();
  
  try {
    // Validate premium pricing rules
    if (serviceType === 'in_person') {
      throw new Error('In-person consultations have fixed admin pricing');
    }

    if (feeAmount < 2000 || feeAmount > 20000) {
      throw new Error('Premium service fees must be between 2,000 and 20,000 ETB');
    }

    // Get existing fee for audit trail
    const existingFee = await this.findOne({
      where: { doctor_id: doctorId, service_type: serviceType },
      transaction
    });

    // Create or update the fee
    const [fee, created] = await this.upsert({
      doctor_id: doctorId,
      service_type: serviceType,
      fee_amount: feeAmount,
      fee_set_by: 'doctor',
      is_auto_approve: true,
      is_active: true
    }, { transaction });

    // Log the pricing change for audit trail
    await this.logPricingChange({
      doctor_id: doctorId,
      service_type: serviceType,
      action_type: created ? 'create' : 'update',
      old_amount: existingFee ? existingFee.fee_amount : null,
      new_amount: feeAmount,
      changed_by: changedBy || doctorId,
      change_reason: created ? 'Initial premium pricing setup' : 'Premium pricing update'
    }, transaction);

    await transaction.commit();
    return fee;
  } catch (error) {
    await transaction.rollback();
    console.error('Error setting doctor premium pricing:', error);
    throw error;
  }
};

DoctorServiceFees.checkAutoApprovalEligibility = async function(doctorId, serviceType, paidAmount) {
  try {
    const fee = await this.findOne({
      where: {
        doctor_id: doctorId,
        service_type: serviceType,
        is_active: true
      }
    });

    if (!fee) {
      return { 
        eligible: false, 
        reason: 'No pricing set for this service',
        decision: 'rejected'
      };
    }

    const exactMatch = parseFloat(paidAmount) === parseFloat(fee.fee_amount);
    const isPremium = fee.fee_set_by === 'doctor';
    const autoApproveEnabled = fee.is_auto_approve;

    // Enhanced auto-approval logic based on design requirements
    if (isPremium && exactMatch && autoApproveEnabled) {
      return { 
        eligible: true, 
        reason: 'Premium service with exact fee payment - auto-approved',
        decision: 'auto_approved',
        fee_amount: fee.fee_amount,
        payment_destination: 'doctor_wallet'
      };
    }

    if (!isPremium) {
      return { 
        eligible: false, 
        reason: 'Standard service requires manual doctor approval',
        decision: 'manual_review',
        fee_amount: fee.fee_amount,
        payment_destination: 'system_wallet'
      };
    }

    if (!exactMatch) {
      return { 
        eligible: false, 
        reason: `Payment amount (${paidAmount} ETB) does not match doctor's fee (${fee.fee_amount} ETB)`,
        decision: 'manual_review',
        fee_amount: fee.fee_amount,
        payment_destination: 'system_wallet'
      };
    }

    return { 
      eligible: false, 
      reason: 'Auto-approval not enabled for this service',
      decision: 'manual_review',
      fee_amount: fee.fee_amount,
      payment_destination: 'system_wallet'
    };
  } catch (error) {
    console.error('Error checking auto-approval eligibility:', error);
    throw error;
  }
};

// Market rate analytics methods
DoctorServiceFees.getMarketRates = async function(specialty, serviceType) {
  try {
    // Try to get cached market data first
    const MarketRateAnalytics = require('./MarketRateAnalytics');
    
    const marketData = await MarketRateAnalytics.findOne({
      where: { specialty, service_type: serviceType },
      order: [['calculation_date', 'DESC']]
    });

    if (marketData && this.isMarketDataFresh(marketData.calculation_date)) {
      return {
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
    }

    // Calculate fresh market rates if no recent data
    return await this.calculateMarketRates(specialty, serviceType);
  } catch (error) {
    console.error('Error getting market rates:', error);
    throw error;
  }
};

DoctorServiceFees.calculateMarketRates = async function(specialty, serviceType) {
  try {
    // Get all active fees for this specialty and service type
    const fees = await sequelize.query(`
      SELECT dsf.fee_amount 
      FROM doctor_service_fees dsf
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

    return marketData;
  } catch (error) {
    console.error('Error calculating market rates:', error);
    throw error;
  }
};

// Pricing validation methods
DoctorServiceFees.validatePricingRange = function(serviceType, amount) {
  if (serviceType === 'in_person') {
    return parseFloat(amount) === 400.00;
  }
  
  const numAmount = parseFloat(amount);
  return numAmount >= 2000 && numAmount <= 20000;
};

DoctorServiceFees.getPricingHistory = async function(doctorId, serviceType = null, limit = 50) {
  try {
    const PricingAuditLog = require('./PricingAuditLog');
    
    const whereClause = { doctor_id: doctorId };
    if (serviceType) {
      whereClause.service_type = serviceType;
    }

    const history = await PricingAuditLog.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'ChangedByUser',
          attributes: ['id', 'first_name', 'last_name', 'role']
        }
      ]
    });

    return history;
  } catch (error) {
    console.error('Error getting pricing history:', error);
    throw error;
  }
};

// Audit trail methods
DoctorServiceFees.logPricingChange = async function(changeData, transaction = null) {
  try {
    const PricingAuditLog = require('./PricingAuditLog');
    
    await PricingAuditLog.create({
      doctor_id: changeData.doctor_id,
      service_type: changeData.service_type,
      action_type: changeData.action_type,
      old_amount: changeData.old_amount,
      new_amount: changeData.new_amount,
      changed_by: changeData.changed_by,
      change_reason: changeData.change_reason,
      is_admin_override: changeData.changed_by !== changeData.doctor_id
    }, { transaction });
  } catch (error) {
    console.error('Error logging pricing change:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Utility methods
DoctorServiceFees.isMarketDataFresh = function(calculationDate, maxAgeHours = 24) {
  const now = new Date();
  const dataAge = (now - new Date(calculationDate)) / (1000 * 60 * 60); // hours
  return dataAge < maxAgeHours;
};

DoctorServiceFees.cacheMarketData = async function(marketData) {
  try {
    const MarketRateAnalytics = require('./MarketRateAnalytics');
    
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
};

// Suspicious pricing detection
DoctorServiceFees.detectSuspiciousPricing = async function(doctorId, serviceType, newAmount) {
  try {
    const User = require('./User');
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
    
    // Flag as suspicious if significantly above market rates
    const deviationFromAvg = (amount - avgRate) / avgRate;
    const deviationFromMax = (amount - maxRate) / maxRate;
    
    if (deviationFromAvg > 0.5) { // 50% above average
      return {
        suspicious: true,
        reason: `Price is ${Math.round(deviationFromAvg * 100)}% above market average`,
        market_avg: avgRate,
        market_max: maxRate,
        severity: deviationFromAvg > 1.0 ? 'high' : 'medium'
      };
    }
    
    if (deviationFromMax > 0.25) { // 25% above market maximum
      return {
        suspicious: true,
        reason: `Price is ${Math.round(deviationFromMax * 100)}% above market maximum`,
        market_avg: avgRate,
        market_max: maxRate,
        severity: 'high'
      };
    }

    return { suspicious: false, reason: 'Price within normal market range' };
  } catch (error) {
    console.error('Error detecting suspicious pricing:', error);
    return { suspicious: false, reason: 'Error during analysis' };
  }
};

module.exports = DoctorServiceFees;