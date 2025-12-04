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
      type: DataTypes.ENUM('pending', 'paid', 'confirmed', 'refunded'),
      defaultValue: 'pending'
    },
    blockchainTxHash: {      // Transaction hash if paid on blockchain
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // 🆕 PHASE 3: Payment & Approval
    serviceType: {
      type: DataTypes.ENUM('inPerson', 'videoCall', 'chat'),
      defaultValue: 'inPerson',
      comment: 'Type of consultation service'
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether appointment needs doctor approval'
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      comment: 'Doctor approval status for paid services'
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When doctor approved the appointment'
    },
    approvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Doctor wallet who approved'
    },
    paymentMethod: {
      type: DataTypes.ENUM('telebirr', 'cbe_birr', 'cash', 'free'),
      defaultValue: 'free',
      comment: 'Payment method used'
    },
    paymentReceiptUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'IPFS URL of payment receipt'
    },
    paymentConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When payment was confirmed by doctor'
    },
    paymentConfirmedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Doctor wallet who confirmed payment'
    },
    
    // 🆕 PHASE 4: Check-in & Queue
    checkInStatus: {
      type: DataTypes.ENUM('not_checked_in', 'checked_in', 'waiting', 'in_progress', 'completed'),
      defaultValue: 'not_checked_in',
      comment: 'Patient check-in status'
    },
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When patient checked in at reception'
    },
    checkedInBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reception staff who checked in patient'
    },
    queueNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Patient queue number for the day'
    },
    qrCodeData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'QR code data for check-in'
    },
    estimatedWaitTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Estimated wait time in minutes'
    },
    consultationStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When consultation actually started'
    },
    consultationEndedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When consultation ended'
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