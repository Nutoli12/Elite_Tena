import { DataTypes } from 'sequelize';

const ConsultationSession = (sequelize) => {
  const ConsultationSessionModel = sequelize.define('ConsultationSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'appointment_id',
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    doctorWalletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'doctor_wallet_address'
    },
    patientWalletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'patient_wallet_address'
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'session_id'
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'ended', 'cancelled'),
      defaultValue: 'active'
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'started_at'
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ended_at'
    },
    sessionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'session_notes'
    }
  }, {
    tableName: 'consultation_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ConsultationSessionModel.associate = function(models) {
    ConsultationSessionModel.belongsTo(models.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });
    
    ConsultationSessionModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });
    
    ConsultationSessionModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });
  };

  return ConsultationSessionModel;
};

export default ConsultationSession;