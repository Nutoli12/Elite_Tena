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
      type: DataTypes.ENUM('success', 'info', 'warning', 'error', 'appointment', 'prescription', 'lab_result', 'payment'),
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