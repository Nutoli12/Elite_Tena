const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EnhancedPaymentTransaction = sequelize.define('EnhancedPaymentTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  patient_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
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
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  expected_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  is_exact_match: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  payment_destination: {
    type: DataTypes.ENUM('doctor_wallet', 'system_wallet'),
    allowNull: false
  },
  approval_method: {
    type: DataTypes.ENUM('auto_approved', 'manual_approved', 'rejected'),
    allowNull: false
  },
  transaction_status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  chapa_transaction_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  doctor_wallet_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  processing_fees: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  refund_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'enhanced_payment_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // We'll manage updates manually
  indexes: [
    {
      fields: ['appointment_id']
    },
    {
      fields: ['patient_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['approval_method']
    },
    {
      fields: ['transaction_status']
    },
    {
      fields: ['payment_destination']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['doctor_id', 'created_at']
    },
    {
      fields: ['patient_id', 'transaction_status']
    }
  ],
  hooks: {
    beforeCreate: (instance) => {
      // Automatically determine if payment matches expected amount
      instance.is_exact_match = parseFloat(instance.amount) === parseFloat(instance.expected_amount);
    },
    afterUpdate: (instance) => {
      // Set completion timestamp when status changes to completed
      if (instance.transaction_status === 'completed' && !instance.completed_at) {
        instance.completed_at = new Date();
        instance.save({ fields: ['completed_at'] });
      }
    }
  }
});

// Instance methods
EnhancedPaymentTransaction.prototype.processPayment = async function() {
  const transaction = await sequelize.transaction();
  
  try {
    // Update status to processing
    await this.update({ transaction_status: 'processing' }, { transaction });

    // Route payment based on destination
    if (this.payment_destination === 'doctor_wallet') {
      await this.processDoctorWalletPayment(transaction);
    } else {
      await this.processSystemWalletPayment(transaction);
    }

    await transaction.commit();
    return { success: true, transaction_id: this.id };
  } catch (error) {
    await transaction.rollback();
    await this.update({ 
      transaction_status: 'failed',
      refund_reason: error.message 
    });
    throw error;
  }
};

EnhancedPaymentTransaction.prototype.processDoctorWalletPayment = async function(transaction) {
  try {
    // Get doctor wallet configuration
    const DoctorWalletConfig = require('./DoctorWalletConfig');
    const walletConfig = await DoctorWalletConfig.findOne({
      where: { doctor_id: this.doctor_id, is_active: true },
      transaction
    });

    if (!walletConfig || !walletConfig.is_verified) {
      throw new Error('Doctor wallet not configured or verified');
    }

    // Process direct payment via Chapa
    const ChapaService = require('../services/ChapaService');
    const paymentResult = await ChapaService.transferToWallet({
      amount: this.amount,
      recipient_account: walletConfig.chapa_account_id || walletConfig.telebirr_account,
      reference: `premium_payment_${this.id}`,
      description: `Premium ${this.service_type} consultation payment`
    });

    // Update transaction with Chapa details
    await this.update({
      chapa_transaction_id: paymentResult.transaction_id,
      doctor_wallet_address: walletConfig.chapa_account_id || walletConfig.telebirr_account,
      transaction_status: 'completed',
      completed_at: new Date()
    }, { transaction });

    // Log successful direct payment
    console.log(`Direct payment processed: ${this.amount} ETB to doctor ${this.doctor_id}`);
    
  } catch (error) {
    console.error('Error processing doctor wallet payment:', error);
    throw error;
  }
};

EnhancedPaymentTransaction.prototype.processSystemWalletPayment = async function(transaction) {
  try {
    // Hold payment in system wallet (escrow)
    await this.update({
      transaction_status: 'completed',
      completed_at: new Date(),
      doctor_wallet_address: 'system_escrow'
    }, { transaction });

    console.log(`Payment held in system wallet: ${this.amount} ETB for appointment ${this.appointment_id}`);
    
  } catch (error) {
    console.error('Error processing system wallet payment:', error);
    throw error;
  }
};

EnhancedPaymentTransaction.prototype.processRefund = async function(reason) {
  const transaction = await sequelize.transaction();
  
  try {
    if (this.transaction_status === 'refunded') {
      throw new Error('Transaction already refunded');
    }

    // Calculate refund amount (full amount for most cases)
    const refundAmount = this.amount;

    // Process refund via Chapa
    const ChapaService = require('../services/ChapaService');
    const refundResult = await ChapaService.processRefund({
      original_transaction_id: this.chapa_transaction_id,
      amount: refundAmount,
      reason: reason
    });

    // Update transaction status
    await this.update({
      transaction_status: 'refunded',
      refund_amount: refundAmount,
      refund_reason: reason,
      completed_at: new Date()
    }, { transaction });

    await transaction.commit();
    
    console.log(`Refund processed: ${refundAmount} ETB for transaction ${this.id}`);
    return { success: true, refund_amount: refundAmount };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing refund:', error);
    throw error;
  }
};

// Class methods
EnhancedPaymentTransaction.createFromBooking = async function(bookingData) {
  try {
    const { 
      appointment_id, 
      patient_id, 
      doctor_id, 
      service_type, 
      amount, 
      expected_amount,
      approval_method,
      payment_destination 
    } = bookingData;

    const transaction = await this.create({
      appointment_id,
      patient_id,
      doctor_id,
      service_type,
      amount,
      expected_amount,
      approval_method,
      payment_destination,
      transaction_status: 'pending'
    });

    return transaction;
  } catch (error) {
    console.error('Error creating payment transaction:', error);
    throw error;
  }
};

EnhancedPaymentTransaction.getTransactionHistory = async function(doctorId, options = {}) {
  try {
    const { startDate, endDate, status, limit = 50 } = options;
    
    const whereClause = { doctor_id: doctorId };
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    if (status) {
      whereClause.transaction_status = status;
    }

    const transactions = await this.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'Patient',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    return transactions;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    throw error;
  }
};

EnhancedPaymentTransaction.getPaymentAnalytics = async function(doctorId, period = '30d') {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '30d' ? 30 : 7));

    const analytics = await sequelize.query(`
      SELECT 
        service_type,
        approval_method,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        COUNT(CASE WHEN transaction_status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN transaction_status = 'refunded' THEN 1 END) as refunded_count
      FROM enhanced_payment_transactions 
      WHERE doctor_id = :doctorId 
      AND created_at >= :startDate
      GROUP BY service_type, approval_method
      ORDER BY service_type, approval_method
    `, {
      replacements: { doctorId, startDate },
      type: sequelize.QueryTypes.SELECT
    });

    return analytics;
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    throw error;
  }
};

module.exports = EnhancedPaymentTransaction;