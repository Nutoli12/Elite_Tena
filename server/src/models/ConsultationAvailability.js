import { Model, DataTypes } from 'sequelize';

/**
 * 📅 CONSULTATION AVAILABILITY MODEL
 * Doctor's available time slots for video consultations
 */
export default (sequelize) => {
  class ConsultationAvailability extends Model {
    static associate(models) {
      ConsultationAvailability.belongsTo(models.User, {
        foreignKey: 'doctorWallet',
        targetKey: 'walletAddress',
        as: 'doctor'
      });
    }

    // Get day name
    getDayName() {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[this.dayOfWeek];
    }
  }

  ConsultationAvailability.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    doctorWallet: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'users',
        key: 'wallet_address'
      }
    },
    
    // Availability Type
    availabilityType: {
      type: DataTypes.ENUM('video', 'chat', 'both'),
      defaultValue: 'video'
    },
    
    // Day of Week (0=Sunday, 6=Saturday)
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 6 }
    },
    
    // Time Slots
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    
    // Slot Duration
    slotDurationMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    
    // Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'ConsultationAvailability',
    tableName: 'consultation_availability',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['doctor_wallet'] },
      { fields: ['day_of_week'] },
      { 
        fields: ['doctor_wallet', 'is_active'],
        where: { is_active: true }
      }
    ]
  });

  return ConsultationAvailability;
};
