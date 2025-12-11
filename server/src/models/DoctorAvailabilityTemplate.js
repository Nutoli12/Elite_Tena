import { DataTypes } from 'sequelize';

const DoctorAvailabilityTemplate = (sequelize) => {
  const DoctorAvailabilityTemplateModel = sequelize.define('DoctorAvailabilityTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    doctorWalletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'doctor_wallet_address',
      references: {
        model: 'doctors',
        key: 'walletAddress'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'day_of_week',
      validate: {
        min: 0,
        max: 6
      },
      comment: '0=Sunday, 1=Monday, ..., 6=Saturday'
    },
    availableSlots: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'available_slots',
      validate: {
        isValidSlotsArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('Available slots must be an array');
          }
          
          for (const slot of value) {
            if (!slot.startTime || !slot.endTime || !slot.type) {
              throw new Error('Each slot must have startTime, endTime, and type');
            }
            
            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
              throw new Error('Time must be in HH:MM format');
            }
            
            // Validate slot type
            const validTypes = ['available', 'break', 'lunch', 'unavailable'];
            if (!validTypes.includes(slot.type)) {
              throw new Error('Slot type must be one of: available, break, lunch, unavailable');
            }
            
            // Validate that end time is after start time
            if (slot.endTime <= slot.startTime) {
              throw new Error('End time must be after start time');
            }
          }
        }
      }
    },
    slotDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      field: 'slot_duration',
      validate: {
        min: 1
      },
      comment: 'Duration in minutes'
    },
    bufferTime: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      field: 'buffer_time',
      validate: {
        min: 0
      },
      comment: 'Buffer time in minutes'
    },
    emergencySlotPercentage: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.20,
      field: 'emergency_slot_percentage',
      validate: {
        min: 0,
        max: 1
      },
      comment: 'Percentage of slots reserved for emergencies (0.0-1.0)'
    },
    maxDailyAppointments: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      field: 'max_daily_appointments',
      validate: {
        min: 1
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      field: 'effective_from'
    },
    effectiveUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_until'
    }
  }, {
    tableName: 'doctor_availability_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    validate: {
      effectiveUntilAfterFrom() {
        if (this.effectiveUntil && this.effectiveUntil <= this.effectiveFrom) {
          throw new Error('Effective until date must be after effective from date');
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['doctor_wallet_address', 'day_of_week', 'effective_from'],
        name: 'unique_active_template_per_day'
      }
    ]
  });

  // Instance methods
  DoctorAvailabilityTemplateModel.prototype.getAvailableSlots = function() {
    return this.availableSlots.filter(slot => slot.type === 'available');
  };

  DoctorAvailabilityTemplateModel.prototype.getTotalAvailableMinutes = function() {
    const availableSlots = this.getAvailableSlots();
    let totalMinutes = 0;
    
    for (const slot of availableSlots) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      totalMinutes += endMinutes - startMinutes;
    }
    
    return totalMinutes;
  };

  DoctorAvailabilityTemplateModel.prototype.getMaxAppointments = function() {
    const totalMinutes = this.getTotalAvailableMinutes();
    const slotWithBuffer = this.slotDuration + this.bufferTime;
    const maxFromTime = Math.floor(totalMinutes / slotWithBuffer);
    
    return Math.min(maxFromTime, this.maxDailyAppointments);
  };

  DoctorAvailabilityTemplateModel.prototype.getEmergencySlotCount = function() {
    const maxAppointments = this.getMaxAppointments();
    return Math.floor(maxAppointments * this.emergencySlotPercentage);
  };

  DoctorAvailabilityTemplateModel.prototype.isEffectiveOn = function(date) {
    const checkDate = new Date(date);
    const effectiveFrom = new Date(this.effectiveFrom);
    const effectiveUntil = this.effectiveUntil ? new Date(this.effectiveUntil) : null;
    
    return this.isActive && 
           checkDate >= effectiveFrom && 
           (!effectiveUntil || checkDate <= effectiveUntil);
  };

  DoctorAvailabilityTemplateModel.prototype.generateTimeSlots = function(date) {
    if (!this.isEffectiveOn(date)) {
      return [];
    }

    const slots = [];
    const availableSlots = this.getAvailableSlots();
    const maxAppointments = this.getMaxAppointments();
    const emergencySlotCount = this.getEmergencySlotCount();
    
    let appointmentCount = 0;
    let emergencyCount = 0;

    for (const availableSlot of availableSlots) {
      const [startHour, startMin] = availableSlot.startTime.split(':').map(Number);
      const [endHour, endMin] = availableSlot.endTime.split(':').map(Number);
      
      let currentTime = new Date(date);
      currentTime.setHours(startHour, startMin, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, endMin, 0, 0);
      
      while (currentTime < endTime && appointmentCount < maxAppointments) {
        const slotEndTime = new Date(currentTime.getTime() + this.slotDuration * 60000);
        
        if (slotEndTime > endTime) break;
        
        // Determine if this should be an emergency slot
        const isEmergencySlot = emergencyCount < emergencySlotCount && 
                               Math.random() < this.emergencySlotPercentage;
        
        slots.push({
          doctorWalletAddress: this.doctorWalletAddress,
          startTime: new Date(currentTime),
          endTime: new Date(slotEndTime),
          duration: this.slotDuration,
          status: 'available',
          slotType: isEmergencySlot ? 'emergency' : 'regular',
          availabilityTemplateId: this.id,
          bufferTime: this.bufferTime,
          isBookable: true
        });
        
        if (isEmergencySlot) emergencyCount++;
        appointmentCount++;
        
        // Move to next slot (including buffer time)
        currentTime = new Date(slotEndTime.getTime() + this.bufferTime * 60000);
      }
    }
    
    return slots;
  };

  // Static methods
  DoctorAvailabilityTemplateModel.getActiveTemplateForDay = function(doctorWalletAddress, dayOfWeek, date = new Date()) {
    return this.findOne({
      where: {
        doctorWalletAddress,
        dayOfWeek,
        isActive: true,
        effectiveFrom: {
          [sequelize.Sequelize.Op.lte]: date
        },
        [sequelize.Sequelize.Op.or]: [
          { effectiveUntil: null },
          { effectiveUntil: { [sequelize.Sequelize.Op.gte]: date } }
        ]
      },
      order: [['effectiveFrom', 'DESC']]
    });
  };

  DoctorAvailabilityTemplateModel.getDayName = function(dayOfWeek) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Invalid Day';
  };

  DoctorAvailabilityTemplateModel.associate = function(models) {
    DoctorAvailabilityTemplateModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });
    
    DoctorAvailabilityTemplateModel.hasMany(models.TimeSlot, {
      foreignKey: 'availabilityTemplateId',
      as: 'generatedSlots'
    });
  };

  return DoctorAvailabilityTemplateModel;
};

export default DoctorAvailabilityTemplate;