export default (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'walletAddress'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM(
        // General
        'success', 'info', 'warning', 'error',
        // Patient notifications
        'appointment_reminder', 'appointment_confirmed', 'appointment_cancelled',
        'payment_required', 'payment_confirmed',
        'lab_results_ready', 'prescription_ready',
        'video_call_ready', 'chat_message',
        // Doctor notifications
        'new_appointment_request', 'patient_checked_in',
        'lab_results_to_review', 'prescription_request',
        'payment_received', 'video_call_request',
        // Pharmacist notifications
        'new_prescription', 'prescription_picked_up', 'stock_alert',
        // Lab technician notifications
        'new_lab_order', 'urgent_test', 'results_uploaded',
        // Consent notifications
        'consent_request', 'consent_granted', 'consent_revoked', 'consent_expired',
        // Prescription access notifications
        'prescription_access_granted', 'prescription_access_revoked',
        'prescription_dispensed', 'prescription_access_expires_soon',
        'prescription_emergency_access',
        // System notifications
        'system_update', 'maintenance_scheduled'
      ),
      allowNull: false,
      defaultValue: 'info'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    relatedId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    relatedType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional data for the notification (JSON format)'
    }
  }, {
    tableName: 'notifications',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['isRead']
      },
      {
        fields: ['type']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      targetKey: 'walletAddress',
      as: 'user'
    });
  };

  return Notification;
};