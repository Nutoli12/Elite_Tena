import { DataTypes } from 'sequelize';

const Payment = (sequelize) => {
  const PaymentModel = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    patientWallet: {
      type: DataTypes.STRING,
      allowNull: false
    },
    doctorWallet: {
      type: DataTypes.STRING,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'ETB'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.ENUM('chapa', 'telebirr'),
      allowNull: false,
      comment: 'Payment provider used'
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Unique transaction reference'
    },
    providerTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Transaction ID from payment provider'
    },
    providerData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Raw response data from payment provider'
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When payment was verified'
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for payment failure'
    },
    transactionHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blockchain transaction hash if applicable'
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Customer email used for payment'
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Customer phone used for payment'
    }
  }, {
    tableName: 'payments',
    timestamps: true
  });

  PaymentModel.associate = function (models) {
    PaymentModel.belongsTo(models.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });
    PaymentModel.belongsTo(models.User, {
      foreignKey: 'patientWallet',
      targetKey: 'walletAddress',
      as: 'patient'
    });
    PaymentModel.belongsTo(models.User, {
      foreignKey: 'doctorWallet',
      targetKey: 'walletAddress',
      as: 'doctor'
    });
  };

  return PaymentModel;
};

export default Payment;
