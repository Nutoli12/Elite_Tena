import { DataTypes } from 'sequelize';

const Payment = (sequelize) => {
  const PaymentModel = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    appointmentId: {
      type: DataTypes.INTEGER,
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
      allowNull: false
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
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'chapa, telebirr, etc.'
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Transaction reference from payment provider'
    },
    transactionHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blockchain transaction hash if applicable'
    }
  }, {
    tableName: 'payments',
    timestamps: true
  });

  return PaymentModel;
};

export default Payment;
