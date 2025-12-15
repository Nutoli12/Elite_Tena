import { Model, DataTypes } from 'sequelize';

/**
 * 💬🎥 PREMIUM CONSULTATION MODEL
 * Unified model for chat and video consultations
 */
export default (sequelize) => {
  class PremiumConsultation extends Model {
    static associate(models) {
      // Patient relationship
      PremiumConsultation.belongsTo(models.User, {
        foreignKey: 'patientWallet',
        targetKey: 'walletAddress',
        as: 'patient'
      });
      
      // Doctor relationship
      PremiumConsultation.belongsTo(models.User, {
        foreignKey: 'doctorWallet',
        targetKey: 'walletAddress',
        as: 'doctor'
      });
      
      // Messages
      PremiumConsultation.hasMany(models.ConsultationMessage, {
        foreignKey: 'consultationId',
        as: 'messages'
      });
      
      // Video sessions
      PremiumConsultation.hasMany(models.VideoCallSession, {
        foreignKey: 'consultationId',
        as: 'videoSessions'
      });
    }

    // Check if consultation is active and accessible
    isAccessible() {
      if (this.status !== 'active' && this.status !== 'verified') {
        return false;
      }
      if (this.expiresAt && new Date() > new Date(this.expiresAt)) {
        return false;
      }
      return true;
    }

    // Check if payment is verified
    isPaymentVerified() {
      return this.paymentStatus === 'verified';
    }

    // Get time remaining (for chat consultations)
    getTimeRemaining() {
      if (!this.expiresAt) return null;
      const now = new Date();
      const expires = new Date(this.expiresAt);
      const remaining = expires - now;
      return remaining > 0 ? remaining : 0;
    }
  }

  PremiumConsultation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Participants (using wallet addresses as foreign keys since User uses walletAddress as PK)
    patientWallet: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'wallet_address'
      }
    },
    doctorWallet: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'wallet_address'
      }
    },
    
    // Consultation Type
    consultationType: {
      type: DataTypes.ENUM('chat', 'video'),
      allowNull: false
    },
    
    // Scheduling (for video)
    scheduledTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    
    // Pricing
    consultationFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'ETB'
    },
    
    // Payment Details
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Transaction reference from patient for P2P payments'
    },
    chapaTxRef: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Chapa transaction reference'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'submitted', 'verified', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    paymentVerifiedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Wallet address of doctor who verified payment'
    },
    paymentVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Daily.co Integration (for video)
    dailyRoomName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    dailyRoomUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dailyHostToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dailyParticipantToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Chat Room
    chatRoomId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    
    // Session Status
    status: {
      type: DataTypes.ENUM(
        'requested',
        'payment_pending',
        'payment_submitted',
        'verified',
        'active',
        'completed',
        'cancelled',
        'expired',
        'no_show'
      ),
      defaultValue: 'requested'
    },
    
    // Timestamps
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualDurationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    
    // Consultation Summary
    doctorNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    consultationSummary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    followUpRecommended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    prescriptionIssued: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    // Rating
    patientRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 }
    },
    patientFeedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    doctorRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 }
    },
    
    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'PremiumConsultation',
    tableName: 'premium_consultations',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['patient_wallet'] },
      { fields: ['doctor_wallet'] },
      { fields: ['status'] },
      { fields: ['consultation_type'] },
      { fields: ['scheduled_time'] },
      { fields: ['created_at'] }
    ]
  });

  return PremiumConsultation;
};
