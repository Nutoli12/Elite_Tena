import { DataTypes } from 'sequelize';

const QueueEntry = (sequelize) => {
  const QueueEntryModel = sequelize.define('QueueEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    queueId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'queue_id',
      references: {
        model: 'patient_queues',
        key: 'id'
      }
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'appointment_id',
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    queuePosition: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'queue_position',
      validate: {
        min: 1
      }
    },
    estimatedWaitTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'estimated_wait_time',
      validate: {
        min: 0
      },
      comment: 'Estimated wait time in minutes'
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'check_in_time'
    },
    calledTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'called_time'
    },
    consultationStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'consultation_start_time'
    },
    consultationEndTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'consultation_end_time'
    },
    status: {
      type: DataTypes.ENUM('waiting', 'called', 'in_progress', 'completed', 'no_show'),
      defaultValue: 'waiting'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'queue_entries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    validate: {
      validConsultationTimes() {
        if (this.consultationEndTime && this.consultationStartTime) {
          if (this.consultationEndTime <= this.consultationStartTime) {
            throw new Error('Consultation end time must be after start time');
          }
        }
      },
      validCallTime() {
        if (this.calledTime && this.checkInTime) {
          if (this.calledTime < this.checkInTime) {
            throw new Error('Called time must be after check-in time');
          }
        }
      },
      validConsultationStartTime() {
        if (this.consultationStartTime && this.calledTime) {
          if (this.consultationStartTime < this.calledTime) {
            throw new Error('Consultation start time must be after called time');
          }
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['queue_id', 'queue_position'],
        name: 'unique_queue_position'
      },
      {
        unique: true,
        fields: ['queue_id', 'appointment_id'],
        name: 'unique_appointment_per_queue'
      }
    ]
  });

  // Instance methods
  QueueEntryModel.prototype.checkIn = function() {
    if (this.checkInTime) {
      throw new Error('Patient already checked in');
    }
    
    this.checkInTime = new Date();
    return this.save();
  };

  QueueEntryModel.prototype.call = function() {
    if (this.status !== 'waiting') {
      throw new Error('Can only call waiting patients');
    }
    
    this.status = 'called';
    this.calledTime = new Date();
    return this.save();
  };

  QueueEntryModel.prototype.startConsultation = function() {
    if (this.status !== 'called') {
      throw new Error('Patient must be called before starting consultation');
    }
    
    this.status = 'in_progress';
    this.consultationStartTime = new Date();
    return this.save();
  };

  QueueEntryModel.prototype.completeConsultation = function() {
    if (this.status !== 'in_progress') {
      throw new Error('Consultation must be in progress to complete');
    }
    
    this.status = 'completed';
    this.consultationEndTime = new Date();
    return this.save();
  };

  QueueEntryModel.prototype.markNoShow = function() {
    if (this.status === 'completed') {
      throw new Error('Cannot mark completed consultation as no-show');
    }
    
    this.status = 'no_show';
    return this.save();
  };

  QueueEntryModel.prototype.getActualWaitTime = function() {
    if (!this.checkInTime || !this.consultationStartTime) {
      return null;
    }
    
    return Math.round((this.consultationStartTime - this.checkInTime) / (1000 * 60));
  };

  QueueEntryModel.prototype.getConsultationDuration = function() {
    if (!this.consultationStartTime || !this.consultationEndTime) {
      return null;
    }
    
    return Math.round((this.consultationEndTime - this.consultationStartTime) / (1000 * 60));
  };

  QueueEntryModel.prototype.isOverdue = function() {
    if (!this.checkInTime || !this.estimatedWaitTime) {
      return false;
    }
    
    const expectedCallTime = new Date(this.checkInTime.getTime() + this.estimatedWaitTime * 60000);
    return new Date() > expectedCallTime && this.status === 'waiting';
  };

  QueueEntryModel.prototype.getTimeInQueue = function() {
    if (!this.checkInTime) {
      return null;
    }
    
    const endTime = this.consultationStartTime || new Date();
    return Math.round((endTime - this.checkInTime) / (1000 * 60));
  };

  QueueEntryModel.prototype.updateEstimatedWaitTime = async function() {
    const PatientQueue = sequelize.models.PatientQueue;
    
    const queue = await PatientQueue.findByPk(this.queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }
    
    this.estimatedWaitTime = queue.getEstimatedWaitTime(this.queuePosition);
    return this.save();
  };

  // Static methods
  QueueEntryModel.findByAppointment = function(appointmentId) {
    return this.findOne({
      where: { appointmentId },
      include: [{
        model: sequelize.models.PatientQueue,
        as: 'queue'
      }]
    });
  };

  QueueEntryModel.getWaitingInQueue = function(queueId) {
    return this.findAll({
      where: {
        queueId,
        status: 'waiting'
      },
      order: [['queuePosition', 'ASC']]
    });
  };

  QueueEntryModel.getOverdueEntries = function(queueId) {
    return this.findAll({
      where: {
        queueId,
        status: 'waiting',
        checkInTime: {
          [sequelize.Sequelize.Op.not]: null
        }
      },
      order: [['queuePosition', 'ASC']]
    }).then(entries => {
      return entries.filter(entry => entry.isOverdue());
    });
  };

  QueueEntryModel.associate = function(models) {
    QueueEntryModel.belongsTo(models.PatientQueue, {
      foreignKey: 'queueId',
      as: 'queue'
    });
    
    QueueEntryModel.belongsTo(models.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });
  };

  return QueueEntryModel;
};

export default QueueEntry;