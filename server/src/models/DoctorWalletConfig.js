const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DoctorWalletConfig = sequelize.define('DoctorWalletConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  doctor_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  chapa_account_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telebirr_account: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bank_account_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  account_holder_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verification_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'doctor_wallet_config',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['doctor_id']
    },
    {
      fields: ['is_verified']
    },
    {
      fields: ['is_active']
    }
  ],
  validate: {
    hasPaymentMethod() {
      if (!this.chapa_account_id && !this.telebirr_account && !this.bank_account_number) {
        throw new Error('At least one payment method must be configured');
      }
    },
    bankDetailsComplete() {
      if (this.bank_account_number && (!this.bank_name || !this.account_holder_name)) {
        throw new Error('Bank name and account holder name required for bank account');
      }
    }
  }
});

// Instance methods
DoctorWalletConfig.prototype.verifyWallet = async function(verifiedBy) {
  try {
    await this.update({
      is_verified: true,
      verification_date: new Date()
    });

    // Log verification in audit trail
    const PricingAuditLog = require('./PricingAuditLog');
    await PricingAuditLog.create({
      doctor_id: this.doctor_id,
      service_type: 'video_call', // Generic for wallet verification
      action_type: 'update',
      changed_by: verifiedBy,
      change_reason: 'Wallet configuration verified',
      is_admin_override: true
    });

    console.log(`Wallet verified for doctor ${this.doctor_id}`);
    return this;
  } catch (error) {
    console.error('Error verifying wallet:', error);
    throw error;
  }
};

DoctorWalletConfig.prototype.getPreferredPaymentMethod = function() {
  if (this.chapa_account_id) {
    return {
      type: 'chapa',
      account: this.chapa_account_id,
      display_name: 'Chapa Account'
    };
  }
  
  if (this.telebirr_account) {
    return {
      type: 'telebirr',
      account: this.telebirr_account,
      display_name: 'TeleBirr Account'
    };
  }
  
  if (this.bank_account_number) {
    return {
      type: 'bank',
      account: this.bank_account_number,
      display_name: `${this.bank_name} - ${this.account_holder_name}`
    };
  }
  
  return null;
};

// Class methods
DoctorWalletConfig.setupWallet = async function(doctorId, walletData) {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      chapa_account_id,
      telebirr_account,
      bank_account_number,
      bank_name,
      account_holder_name
    } = walletData;

    // Create or update wallet configuration
    const [walletConfig, created] = await this.upsert({
      doctor_id: doctorId,
      chapa_account_id,
      telebirr_account,
      bank_account_number,
      bank_name,
      account_holder_name,
      is_verified: false, // Requires admin verification
      is_active: true
    }, { transaction });

    // Log wallet setup
    const PricingAuditLog = require('./PricingAuditLog');
    await PricingAuditLog.create({
      doctor_id: doctorId,
      service_type: 'video_call', // Generic for wallet setup
      action_type: created ? 'create' : 'update',
      changed_by: doctorId,
      change_reason: created ? 'Initial wallet setup' : 'Wallet configuration updated'
    }, { transaction });

    await transaction.commit();
    
    console.log(`Wallet ${created ? 'created' : 'updated'} for doctor ${doctorId}`);
    return walletConfig;
  } catch (error) {
    await transaction.rollback();
    console.error('Error setting up wallet:', error);
    throw error;
  }
};

DoctorWalletConfig.getVerifiedWallet = async function(doctorId) {
  try {
    const wallet = await this.findOne({
      where: {
        doctor_id: doctorId,
        is_verified: true,
        is_active: true
      }
    });

    return wallet;
  } catch (error) {
    console.error('Error getting verified wallet:', error);
    throw error;
  }
};

DoctorWalletConfig.getPendingVerifications = async function() {
  try {
    const pendingWallets = await this.findAll({
      where: {
        is_verified: false,
        is_active: true
      },
      include: [{
        model: sequelize.models.User,
        as: 'Doctor',
        attributes: ['id', 'first_name', 'last_name', 'email', 'specialty']
      }],
      order: [['created_at', 'ASC']]
    });

    return pendingWallets;
  } catch (error) {
    console.error('Error getting pending verifications:', error);
    throw error;
  }
};

DoctorWalletConfig.validatePaymentCapability = async function(doctorId, serviceType) {
  try {
    // Only premium services require wallet configuration
    if (serviceType === 'in_person') {
      return { capable: true, reason: 'Standard service uses system wallet' };
    }

    const wallet = await this.getVerifiedWallet(doctorId);
    
    if (!wallet) {
      return { 
        capable: false, 
        reason: 'No verified wallet configured for premium services' 
      };
    }

    const paymentMethod = wallet.getPreferredPaymentMethod();
    
    if (!paymentMethod) {
      return { 
        capable: false, 
        reason: 'No valid payment method configured' 
      };
    }

    return { 
      capable: true, 
      payment_method: paymentMethod,
      wallet_id: wallet.id 
    };
  } catch (error) {
    console.error('Error validating payment capability:', error);
    throw error;
  }
};

DoctorWalletConfig.getWalletAnalytics = async function(doctorId, period = '30d') {
  try {
    const days = period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get payment statistics for this doctor's wallet
    const EnhancedPaymentTransaction = require('./EnhancedPaymentTransaction');
    
    const analytics = await EnhancedPaymentTransaction.findAll({
      where: {
        doctor_id: doctorId,
        payment_destination: 'doctor_wallet',
        created_at: {
          [sequelize.Op.gte]: startDate
        }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'avg_amount'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN transaction_status = 'completed' THEN 1 END")), 'successful_transactions'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN transaction_status = 'failed' THEN 1 END")), 'failed_transactions']
      ],
      raw: true
    });

    const wallet = await this.getVerifiedWallet(doctorId);
    
    return {
      doctor_id: doctorId,
      period: period,
      wallet_status: wallet ? 'verified' : 'not_configured',
      payment_method: wallet ? wallet.getPreferredPaymentMethod() : null,
      analytics: analytics[0] || {
        total_transactions: 0,
        total_amount: 0,
        avg_amount: 0,
        successful_transactions: 0,
        failed_transactions: 0
      }
    };
  } catch (error) {
    console.error('Error getting wallet analytics:', error);
    throw error;
  }
};

module.exports = DoctorWalletConfig;