import { DataTypes } from 'sequelize';

const TimeSlot = (sequelize) => {
  const TimeSlotModel = sequelize.define('TimeSlot', {
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
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_time'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_time'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration in minutes'
    },
    status: {
      type: DataTypes.ENUM('available', 'booked', 'blocked', 'emergency_reserved', 'cancelled'),
      defaultValue: 'available'
    },
    slotType: {
      type: DataTypes.ENUM('regular', 'emergency', 'buffer'),
      defaultValue: 'regular',
      field: 'slot_type'
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'appointment_id',
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    availabilityTemplateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'availability_template_id'
    },
    bufferTime: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      field: 'buffer_time',
      comment: 'Buffer time after this slot in minutes'
    },
    isBookable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_bookable'
    },

  }, {
    tableName: 'time_slots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    validate: {
      endTimeAfterStartTime() {
        if (this.endTime <= this.startTime) {
          throw new Error('End time must be after start time');
        }
      },
      durationMatchesTimeRange() {
        const calculatedDuration = Math.round((this.endTime - this.startTime) / (1000 * 60));
        if (this.duration !== calculatedDuration) {
          throw new Error('Duration must match the time range');
        }
      },
      validDuration() {
        if (this.duration <= 0) {
          throw new Error('Duration must be greater than 0');
        }
        if (this.duration > 480) { // 8 hours max
          throw new Error('Duration cannot exceed 8 hours (480 minutes)');
        }
      },
      validBufferTime() {
        if (this.bufferTime < 0) {
          throw new Error('Buffer time cannot be negative');
        }
        if (this.bufferTime > 60) { // 1 hour max buffer
          throw new Error('Buffer time cannot exceed 60 minutes');
        }
      },
      validSlotType() {
        const validTypes = ['regular', 'emergency', 'buffer'];
        if (!validTypes.includes(this.slotType)) {
          throw new Error(`Slot type must be one of: ${validTypes.join(', ')}`);
        }
      },
      validStatus() {
        const validStatuses = ['available', 'booked', 'blocked', 'emergency_reserved', 'cancelled'];
        if (!validStatuses.includes(this.status)) {
          throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        }
      },
      bookedSlotMustHaveAppointment() {
        if (this.status === 'booked' && !this.appointmentId) {
          throw new Error('Booked slots must have an associated appointment ID');
        }
      },
      availableSlotCannotHaveAppointment() {
        if (this.status === 'available' && this.appointmentId) {
          throw new Error('Available slots cannot have an associated appointment ID');
        }
      },
      emergencySlotValidation() {
        if (this.status === 'emergency_reserved' && this.slotType !== 'emergency') {
          throw new Error('Emergency reserved slots must have emergency slot type');
        }
      }
    }
  });

  // Instance methods
  TimeSlotModel.prototype.isAvailable = function() {
    return this.status === 'available' && this.isBookable;
  };

  TimeSlotModel.prototype.canBeBooked = function() {
    return this.status === 'available' && this.isBookable;
  };

  TimeSlotModel.prototype.isBooked = function() {
    return this.status === 'booked' && this.appointmentId !== null;
  };

  TimeSlotModel.prototype.isBlocked = function() {
    return this.status === 'blocked' || !this.isBookable;
  };

  TimeSlotModel.prototype.isEmergencyReserved = function() {
    return this.status === 'emergency_reserved';
  };

  TimeSlotModel.prototype.book = function(appointmentId) {
    if (!this.isAvailable()) {
      throw new Error('Time slot is not available for booking');
    }
    this.status = 'booked';
    this.appointmentId = appointmentId;
    return this.save();
  };

  TimeSlotModel.prototype.release = function() {
    this.status = 'available';
    this.appointmentId = null;
    this.isBookable = true;
    return this.save();
  };

  TimeSlotModel.prototype.block = function(reason = 'blocked') {
    this.status = 'blocked';
    this.isBookable = false;
    return this.save();
  };

  TimeSlotModel.prototype.unblock = function() {
    if (this.status === 'blocked') {
      this.status = 'available';
      this.isBookable = true;
    }
    return this.save();
  };

  TimeSlotModel.prototype.reserveForEmergency = function() {
    if (this.status !== 'available') {
      throw new Error('Can only reserve available slots for emergency');
    }
    this.status = 'emergency_reserved';
    this.slotType = 'emergency';
    return this.save();
  };

  TimeSlotModel.prototype.releaseEmergencyReservation = function() {
    if (this.status === 'emergency_reserved') {
      this.status = 'available';
      this.slotType = 'regular';
    }
    return this.save();
  };

  TimeSlotModel.prototype.cancel = function() {
    this.status = 'cancelled';
    this.appointmentId = null;
    this.isBookable = false;
    return this.save();
  };

  TimeSlotModel.prototype.getStatusInfo = function() {
    return {
      id: this.id,
      status: this.status,
      slotType: this.slotType,
      isAvailable: this.isAvailable(),
      canBeBooked: this.canBeBooked(),
      isBooked: this.isBooked(),
      isBlocked: this.isBlocked(),
      isEmergencyReserved: this.isEmergencyReserved(),
      appointmentId: this.appointmentId,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      bufferTime: this.bufferTime
    };
  };

  TimeSlotModel.prototype.validateTimeRange = function() {
    if (this.endTime <= this.startTime) {
      throw new Error('End time must be after start time');
    }
    
    const calculatedDuration = Math.round((this.endTime - this.startTime) / (1000 * 60));
    if (this.duration !== calculatedDuration) {
      throw new Error(`Duration (${this.duration}) must match the time range (${calculatedDuration} minutes)`);
    }
    
    return true;
  };

  TimeSlotModel.prototype.hasConflictWith = function(otherSlot) {
    if (this.doctorWalletAddress !== otherSlot.doctorWalletAddress) {
      return false;
    }
    
    return (
      (this.startTime < otherSlot.endTime && this.endTime > otherSlot.startTime) ||
      (otherSlot.startTime < this.endTime && otherSlot.endTime > this.startTime)
    );
  };

  TimeSlotModel.prototype.getEndTimeWithBuffer = function() {
    return new Date(this.endTime.getTime() + (this.bufferTime * 60000));
  };

  TimeSlotModel.prototype.canAccommodateAppointment = function(requestedDuration) {
    return this.isAvailable() && this.duration >= requestedDuration;
  };

  // Quick validation method
  TimeSlotModel.prototype.validate = function() {
    return this.validateTimeRange();
  };

  // Static methods
  TimeSlotModel.getAvailableSlots = function(doctorWalletAddress, startDate, endDate, options = {}) {
    const whereClause = {
      doctorWalletAddress,
      startTime: {
        [sequelize.Sequelize.Op.gte]: startDate
      },
      endTime: {
        [sequelize.Sequelize.Op.lte]: endDate
      },
      status: 'available',
      isBookable: true
    };

    // Add optional filters
    if (options.slotType) {
      whereClause.slotType = options.slotType;
    }
    
    if (options.minDuration) {
      whereClause.duration = {
        [sequelize.Sequelize.Op.gte]: options.minDuration
      };
    }

    return this.findAll({
      where: whereClause,
      order: [['startTime', 'ASC']],
      limit: options.limit || null
    });
  };

  TimeSlotModel.getAvailableSlotsForDuration = function(doctorWalletAddress, startDate, endDate, requiredDuration) {
    return this.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [sequelize.Sequelize.Op.gte]: startDate
        },
        endTime: {
          [sequelize.Sequelize.Op.lte]: endDate
        },
        status: 'available',
        isBookable: true,
        duration: {
          [sequelize.Sequelize.Op.gte]: requiredDuration
        }
      },
      order: [['startTime', 'ASC']]
    });
  };

  TimeSlotModel.getEmergencySlots = function(doctorWalletAddress, startDate, endDate) {
    return this.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [sequelize.Sequelize.Op.gte]: startDate
        },
        endTime: {
          [sequelize.Sequelize.Op.lte]: endDate
        },
        [sequelize.Sequelize.Op.or]: [
          { status: 'emergency_reserved' },
          { 
            status: 'available',
            slotType: 'emergency',
            isBookable: true
          }
        ]
      },
      order: [['startTime', 'ASC']]
    });
  };

  TimeSlotModel.getBookedSlots = function(doctorWalletAddress, startDate, endDate) {
    return this.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [sequelize.Sequelize.Op.gte]: startDate
        },
        endTime: {
          [sequelize.Sequelize.Op.lte]: endDate
        },
        status: 'booked',
        appointmentId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      order: [['startTime', 'ASC']],
      include: [{
        association: 'appointment',
        required: false
      }]
    });
  };

  TimeSlotModel.findOverlappingSlots = function(doctorWalletAddress, startTime, endTime, excludeSlotId = null) {
    const whereClause = {
      doctorWalletAddress,
      [sequelize.Sequelize.Op.or]: [
        {
          startTime: {
            [sequelize.Sequelize.Op.between]: [startTime, endTime]
          }
        },
        {
          endTime: {
            [sequelize.Sequelize.Op.between]: [startTime, endTime]
          }
        },
        {
          [sequelize.Sequelize.Op.and]: [
            {
              startTime: {
                [sequelize.Sequelize.Op.lte]: startTime
              }
            },
            {
              endTime: {
                [sequelize.Sequelize.Op.gte]: endTime
              }
            }
          ]
        }
      ],
      status: {
        [sequelize.Sequelize.Op.ne]: 'cancelled'
      }
    };

    if (excludeSlotId) {
      whereClause.id = {
        [sequelize.Sequelize.Op.ne]: excludeSlotId
      };
    }

    return this.findAll({
      where: whereClause,
      order: [['startTime', 'ASC']]
    });
  };

  TimeSlotModel.findNextAvailableSlot = function(doctorWalletAddress, afterTime, requiredDuration = null) {
    const whereClause = {
      doctorWalletAddress,
      startTime: {
        [sequelize.Sequelize.Op.gt]: afterTime
      },
      status: 'available',
      isBookable: true
    };

    if (requiredDuration) {
      whereClause.duration = {
        [sequelize.Sequelize.Op.gte]: requiredDuration
      };
    }

    return this.findOne({
      where: whereClause,
      order: [['startTime', 'ASC']]
    });
  };

  TimeSlotModel.getSlotsInTimeRange = function(doctorWalletAddress, startTime, endTime, includeBuffer = false) {
    let endTimeToUse = endTime;
    
    if (includeBuffer) {
      // Include slots that might have buffer time extending into the range
      endTimeToUse = new Date(endTime.getTime() + (30 * 60000)); // Add 30 minutes for buffer
    }

    return this.findAll({
      where: {
        doctorWalletAddress,
        [sequelize.Sequelize.Op.or]: [
          {
            startTime: {
              [sequelize.Sequelize.Op.between]: [startTime, endTimeToUse]
            }
          },
          {
            endTime: {
              [sequelize.Sequelize.Op.between]: [startTime, endTimeToUse]
            }
          }
        ]
      },
      order: [['startTime', 'ASC']]
    });
  };

  TimeSlotModel.bulkUpdateStatus = function(slotIds, newStatus, options = {}) {
    const updateData = { status: newStatus };
    
    if (options.isBookable !== undefined) {
      updateData.isBookable = options.isBookable;
    }
    
    if (options.appointmentId !== undefined) {
      updateData.appointmentId = options.appointmentId;
    }

    return this.update(updateData, {
      where: {
        id: {
          [sequelize.Sequelize.Op.in]: slotIds
        }
      }
    });
  };

  TimeSlotModel.getDoctorScheduleStats = function(doctorWalletAddress, startDate, endDate) {
    return this.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [sequelize.Sequelize.Op.gte]: startDate
        },
        endTime: {
          [sequelize.Sequelize.Op.lte]: endDate
        }
      },
      attributes: [
        'status',
        'slotType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration']
      ],
      group: ['status', 'slotType'],
      raw: true
    });
  };

  TimeSlotModel.associate = function(models) {
    TimeSlotModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });
    
    TimeSlotModel.belongsTo(models.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    TimeSlotModel.belongsTo(models.DoctorAvailabilityTemplate, {
      foreignKey: 'availabilityTemplateId',
      as: 'availabilityTemplate'
    });


  };

  return TimeSlotModel;
};

export default TimeSlot;