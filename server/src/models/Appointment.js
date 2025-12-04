import { DataTypes } from 'sequelize';

const Appointment = (sequelize) => {
  const AppointmentModel = sequelize.define('Appointment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'patientWallet',  // Map to actual database column
      references: {
        model: 'patients',
        key: 'walletAddress'
      }
    },
    doctorWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'doctorWallet',  // Map to actual database column
      references: {
        model: 'doctors',
        key: 'walletAddress'
      }
    },
    appointmentDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no-show'),
      defaultValue: 'scheduled'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,  // Appointment duration in minutes
      defaultValue: 30
    },
    notes: {
      type: DataTypes.TEXT,     // Doctor's notes after appointment
      allowNull: true
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),  // Appointment fee
      defaultValue: 0.00
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'refunded'),
      defaultValue: 'pending'
    },
    blockchainTxHash: {      // Transaction hash if paid on blockchain
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'appointments',
    timestamps: true
  });

  AppointmentModel.associate = function(models) {
    AppointmentModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      as: 'patientDetails'
    });
    AppointmentModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      as: 'doctorDetails'
    });
    AppointmentModel.belongsTo(models.User, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patientUser'
    });
    AppointmentModel.belongsTo(models.User, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctorUser'
    });
  };

  return AppointmentModel;
};

export default Appointment;