const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EnhancedDoctorServiceFees = sequelize.define('EnhancedDoctorServiceFees', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  tableName: 'doctor_service_fees_enhanced',
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
    }
  ],
  hooks: {
    beforeValidate: (instance) => {
      // Set auto-approve for premium services by default
      if (instance.service_type !== 'in_person' && instance.fee_set_by === 'doctor') {
        instance.is_auto_approve = true;
      }
    }
  }
});

// Class methods for enhanced pricing logic
EnhancedDoctorServiceFees.getPricingForDoctor = async function(doctorId) {
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

EnhancedDoctorServiceFees.setDoctorPremiumPricing = async function(doctorId, serviceType, feeAmount, changedBy = null) {
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

    // Log the pricing change
    const PricingAuditLog = require('./PricingAuditLog');
    await PricingAuditLog.create({
      doctor_id: doctorId,
      service_type: serviceType,
      action_type: created ? 'create' : 'update',
      old_amount: existingFee ? existingFee.fee_amount : null,
      new_amount: feeAmount,
      changed_by: changedBy || doctorId,
      change_reason: created ? 'Initial premium pricing setup' : 'Premium pricing update'
    }, { transaction });

    await transaction.commit();
    return fee;
  } catch (error) {
    await transaction.rollback();
    console.error('Error setting doctor premium pricing:', error);
    throw error;
  }
};

EnhancedDoctorServiceFees.checkAutoApprovalEligibility = async function(doctorId, serviceType, paidAmount) {
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

    // Auto-approval logic based on design requirements
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

EnhancedDoctorServiceFees.getMarketRates = async function(specialty, serviceType) {
  try {
    const MarketRateAnalytics = require('./MarketRateAnalytics');
    
    const marketData = await MarketRateAnalytics.findOne({
      where: { specialty, service_type: serviceType },
      order: [['calculation_date', 'DESC']]
    });

    if (!marketData) {
      // Calculate on-demand if no recent data
      return await this.calculateMarketRates(specialty, serviceType);
    }

    return {
      specialty,
      service_type: serviceType,
      avg_rate: parseFloat(marketData.avg_rate),
      min_rate: parseFloat(marketData.min_rate),
      max_rate: parseFloat(marketData.max_rate),
      median_rate: parseFloat(marketData.median_rate),
      doctor_count: marketData.doctor_count,
      last_updated: marketData.calculation_date
    };
  } catch (error) {
    console.error('Error getting market rates:', error);
    throw error;
  }
};

EnhancedDoctorServiceFees.calculateMarketRates = async function(specialty, serviceType) {
  try {
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
      return null;
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

    return {
      specialty,
      service_type: serviceType,
      avg_rate: avg,
      min_rate: min,
      max_rate: max,
      median_rate: median,
      doctor_count: amounts.length,
      last_updated: new Date()
    };
  } catch (error) {
    console.error('Error calculating market rates:', error);
    throw error;
  }
};

EnhancedDoctorServiceFees.validatePricingRange = function(serviceType, amount) {
  if (serviceType === 'in_person') {
    return parseFloat(amount) === 400.00;
  }
  
  const numAmount = parseFloat(amount);
  return numAmount >= 2000 && numAmount <= 20000;
};

module.exports = EnhancedDoctorServiceFees;