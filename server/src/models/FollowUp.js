import { DataTypes } from 'sequelize';

const FollowUp = (sequelize) => {
  const FollowUpModel = sequelize.define('FollowUp', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
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
    scheduledDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'reminded', 'booked', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    remindersSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastReminderDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'followups',
    timestamps: true
  });

  return FollowUpModel;
};

export default FollowUp;
