import { Model, DataTypes } from 'sequelize';

/**
 * 💬 CONSULTATION MESSAGE MODEL
 * Messages within premium chat consultations
 */
export default (sequelize) => {
  class ConsultationMessage extends Model {
    static associate(models) {
      ConsultationMessage.belongsTo(models.PremiumConsultation, {
        foreignKey: 'consultationId',
        as: 'consultation'
      });
      
      ConsultationMessage.belongsTo(models.User, {
        foreignKey: 'senderWallet',
        targetKey: 'walletAddress',
        as: 'sender'
      });
    }
  }

  ConsultationMessage.init({
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
    
    // Sender (using wallet address as foreign key since User uses walletAddress as PK)
    senderWallet: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'users',
        key: 'wallet_address'
      }
    },
    senderRole: {
      type: DataTypes.ENUM('patient', 'doctor'),
      allowNull: false
    },
    
    // Message Content
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'file', 'prescription', 'system'),
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // File Attachment
    fileUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fileMimeType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Read Status
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'ConsultationMessage',
    tableName: 'consultation_messages',
    underscored: true,
    timestamps: true,
    updatedAt: false, // Messages don't get updated
    indexes: [
      { fields: ['consultation_id'] },
      { fields: ['sender_wallet'] },
      { fields: ['created_at'] },
      { 
        fields: ['consultation_id', 'is_read'],
        where: { is_read: false }
      }
    ]
  });

  return ConsultationMessage;
};
