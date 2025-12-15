import { Model, DataTypes } from 'sequelize';

/**
 * 🎥 VIDEO CALL SESSION MODEL
 * Tracks individual video call sessions within consultations
 */
export default (sequelize) => {
  class VideoCallSession extends Model {
    static associate(models) {
      VideoCallSession.belongsTo(models.PremiumConsultation, {
        foreignKey: 'consultationId',
        as: 'consultation'
      });
    }

    // Calculate duration
    getDuration() {
      if (this.durationSeconds) return this.durationSeconds;
      if (this.patientLeftAt && this.patientJoinedAt) {
        return Math.floor((new Date(this.patientLeftAt) - new Date(this.patientJoinedAt)) / 1000);
      }
      return null;
    }
  }

  VideoCallSession.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    consultationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'premium_consultations',
        key: 'id'
      }
    },
    
    // Daily.co Meeting Info
    dailyMeetingId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // Participant Tracking
    patientJoinedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    patientLeftAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    doctorJoinedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    doctorLeftAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Call Quality
    patientNetworkQuality: {
      type: DataTypes.ENUM('good', 'average', 'poor'),
      allowNull: true
    },
    doctorNetworkQuality: {
      type: DataTypes.ENUM('good', 'average', 'poor'),
      allowNull: true
    },
    
    // Recording
    recordingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recordingConsentPatient: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recordingConsentDoctor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recordingUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Call Status
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'ended', 'failed'),
      defaultValue: 'waiting'
    },
    endReason: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    // Duration
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'VideoCallSession',
    tableName: 'video_call_sessions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['consultation_id'] },
      { fields: ['status'] }
    ]
  });

  return VideoCallSession;
};
