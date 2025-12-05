import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class VideoCall extends Model {
    static associate(models) {
      VideoCall.belongsTo(models.Appointment, {
        foreignKey: 'appointmentId',
        as: 'appointment'
      });
      VideoCall.belongsTo(models.User, {
        foreignKey: 'initiatorWallet',
        targetKey: 'walletAddress',
        as: 'initiator'
      });
      VideoCall.belongsTo(models.User, {
        foreignKey: 'receiverWallet',
        targetKey: 'walletAddress',
        as: 'receiver'
      });
    }
  }

  VideoCall.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Associated appointment (optional)'
    },
    initiatorWallet: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'User who initiated the call'
    },
    receiverWallet: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'User who received the call'
    },
    roomId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Unique room identifier for the call'
    },
    status: {
      type: DataTypes.ENUM(
        'initiated',    // Call initiated, waiting for answer
        'ringing',      // Ringing on receiver's end
        'active',       // Call in progress
        'ended',        // Call ended normally
        'missed',       // Call not answered
        'rejected',     // Call rejected by receiver
        'failed'        // Call failed due to error
      ),
      defaultValue: 'initiated'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the call actually started (both parties connected)'
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the call ended'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Call duration in seconds'
    },
    endReason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reason for call ending (normal, timeout, error, etc.)'
    },
    quality: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Call quality metrics (bandwidth, packet loss, etc.)'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional call metadata'
    }
  }, {
    sequelize,
    modelName: 'VideoCall',
    tableName: 'video_calls',
    indexes: [
      {
        fields: ['appointmentId']
      },
      {
        fields: ['initiatorWallet', 'receiverWallet']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return VideoCall;
};
