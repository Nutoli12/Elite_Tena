import { DataTypes } from 'sequelize';

const PatientQueue = (sequelize) => {
  const PatientQueueModel = sequelize.define('PatientQueue', {
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
    queueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'queue_date'
    },
    currentPosition: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'current_position',
      validate: {
        min: 1
      }
    },
    totalPatients: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_patients',
      validate: {
        min: 0
      }
    },
    averageWaitTime: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      field: 'average_wait_time',
      validate: {
        min: 0
      },
      comment: 'Average wait time in minutes'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'last_updated'
    }
  }, {
    tableName: 'patient_queues',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['doctor_wallet_address', 'queue_date'],
        name: 'unique_doctor_queue_date'
      }
    ]
  });

  // Instance methods
  PatientQueueModel.prototype.addPatient = async function(appointmentId) {
    const QueueEntry = sequelize.models.QueueEntry;
    
    // Get the next position
    const lastEntry = await QueueEntry.findOne({
      where: { queueId: this.id },
      order: [['queuePosition', 'DESC']]
    });
    
    const nextPosition = lastEntry ? lastEntry.queuePosition + 1 : 1;
    
    // Create queue entry
    const entry = await QueueEntry.create({
      queueId: this.id,
      appointmentId,
      queuePosition: nextPosition,
      status: 'waiting'
    });
    
    // Update queue statistics will be handled by database trigger
    await this.reload();
    
    return entry;
  };

  PatientQueueModel.prototype.removePatient = async function(appointmentId) {
    const QueueEntry = sequelize.models.QueueEntry;
    
    const entry = await QueueEntry.findOne({
      where: {
        queueId: this.id,
        appointmentId
      }
    });
    
    if (!entry) {
      throw new Error('Patient not found in queue');
    }
    
    const removedPosition = entry.queuePosition;
    await entry.destroy();
    
    // Reorder remaining entries
    await QueueEntry.update(
      {
        queuePosition: sequelize.literal('queue_position - 1')
      },
      {
        where: {
          queueId: this.id,
          queuePosition: {
            [sequelize.Sequelize.Op.gt]: removedPosition
          }
        }
      }
    );
    
    await this.reload();
    return true;
  };

  PatientQueueModel.prototype.callNextPatient = async function() {
    const QueueEntry = sequelize.models.QueueEntry;
    
    const nextEntry = await QueueEntry.findOne({
      where: {
        queueId: this.id,
        status: 'waiting'
      },
      order: [['queuePosition', 'ASC']]
    });
    
    if (!nextEntry) {
      return null;
    }
    
    await nextEntry.update({
      status: 'called',
      calledTime: new Date()
    });
    
    return nextEntry;
  };

  PatientQueueModel.prototype.startConsultation = async function(appointmentId) {
    const QueueEntry = sequelize.models.QueueEntry;
    
    const entry = await QueueEntry.findOne({
      where: {
        queueId: this.id,
        appointmentId,
        status: 'called'
      }
    });
    
    if (!entry) {
      throw new Error('Patient not found or not called yet');
    }
    
    await entry.update({
      status: 'in_progress',
      consultationStartTime: new Date()
    });
    
    return entry;
  };

  PatientQueueModel.prototype.completeConsultation = async function(appointmentId) {
    const QueueEntry = sequelize.models.QueueEntry;
    
    const entry = await QueueEntry.findOne({
      where: {
        queueId: this.id,
        appointmentId,
        status: 'in_progress'
      }
    });
    
    if (!entry) {
      throw new Error('Patient not found or consultation not in progress');
    }
    
    await entry.update({
      status: 'completed',
      consultationEndTime: new Date()
    });
    
    return entry;
  };

  PatientQueueModel.prototype.markNoShow = async function(appointmentId) {
    const QueueEntry = sequelize.models.QueueEntry;
    
    const entry = await QueueEntry.findOne({
      where: {
        queueId: this.id,
        appointmentId
      }
    });
    
    if (!entry) {
      throw new Error('Patient not found in queue');
    }
    
    await entry.update({
      status: 'no_show'
    });
    
    return entry;
  };

  PatientQueueModel.prototype.getWaitingPatients = function() {
    const QueueEntry = sequelize.models.QueueEntry;
    
    return QueueEntry.findAll({
      where: {
        queueId: this.id,
        status: 'waiting'
      },
      order: [['queuePosition', 'ASC']],
      include: [{
        model: sequelize.models.Appointment,
        as: 'appointment',
        include: [{
          model: sequelize.models.Patient,
          as: 'patientDetails'
        }]
      }]
    });
  };

  PatientQueueModel.prototype.getCurrentPatient = function() {
    const QueueEntry = sequelize.models.QueueEntry;
    
    return QueueEntry.findOne({
      where: {
        queueId: this.id,
        status: 'in_progress'
      },
      include: [{
        model: sequelize.models.Appointment,
        as: 'appointment',
        include: [{
          model: sequelize.models.Patient,
          as: 'patientDetails'
        }]
      }]
    });
  };

  PatientQueueModel.prototype.getEstimatedWaitTime = function(position) {
    const positionsAhead = Math.max(0, position - this.currentPosition);
    return positionsAhead * this.averageWaitTime;
  };

  // Static methods
  PatientQueueModel.findOrCreateForDate = async function(doctorWalletAddress, date) {
    const [queue, created] = await this.findOrCreate({
      where: {
        doctorWalletAddress,
        queueDate: date
      },
      defaults: {
        doctorWalletAddress,
        queueDate: date,
        isActive: true
      }
    });
    
    return queue;
  };

  PatientQueueModel.getActiveQueues = function(doctorWalletAddress) {
    return this.findAll({
      where: {
        doctorWalletAddress,
        isActive: true
      },
      order: [['queueDate', 'DESC']]
    });
  };

  PatientQueueModel.associate = function(models) {
    PatientQueueModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });
    
    PatientQueueModel.hasMany(models.QueueEntry, {
      foreignKey: 'queueId',
      as: 'entries',
      onDelete: 'CASCADE'
    });
  };

  return PatientQueueModel;
};

export default PatientQueue;