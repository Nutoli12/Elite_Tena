/**
 * Manual Approval Request Model for Enhanced Two-Tier Pricing System
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Requirements: 4.1, 4.2, 4.3, 4.4, 4.5**
 * 
 * This model represents manual approval requests that require doctor review
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ManualApprovalRequest = sequelize.define('ManualApprovalRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  doctor_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  patient_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  service_type: {
    type: DataTypes.ENUM('in_person', 'video_call', 'chat'),
    allowNull: false
  },
  paid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  expected_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  payment_difference: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 10
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'timeout_rejected', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  decision_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  decision_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  decision_data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  approval_context: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  alternatives: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'manual_approval_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['appointment_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['patient_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['service_type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['doctor_id', 'status']
    },
    {
      fields: ['status', 'expires_at']
    }
  ],
  hooks: {
    beforeCreate: (instance) => {
      // Calculate payment difference
      instance.payment_difference = parseFloat(instance.paid_amount) - parseFloat(instance.expected_amount);
      
      // Set expiration if not provided (24 hours from now)
      if (!instance.expires_at) {
        instance.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    },
    afterUpdate: (instance) => {
      // Set decision timestamp when status changes from pending
      if (instance.changed('status') && instance.status !== 'pending' && !instance.decision_at) {
        instance.decision_at = new Date();
        instance.save({ fields: ['decision_at'] });
      }
    }
  }
});

// Instance methods
ManualApprovalRequest.prototype.isExpired = function() {
  return new Date() > this.expires_at && this.status === 'pending';
};

ManualApprovalRequest.prototype.getTimeRemaining = function() {
  if (this.status !== 'pending') {
    return 0;
  }
  
  const now = new Date();
  const remaining = this.expires_at - now;
  return Math.max(0, remaining);
};

ManualApprovalRequest.prototype.getTimeRemainingFormatted = function() {
  const remaining = this.getTimeRemaining();
  
  if (remaining === 0) {
    return 'Expired';
  }
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

ManualApprovalRequest.prototype.getPaymentDifferencePercentage = function() {
  if (parseFloat(this.expected_amount) === 0) {
    return 0;
  }
  
  return (parseFloat(this.payment_difference) / parseFloat(this.expected_amount)) * 100;
};

ManualApprovalRequest.prototype.isPriorityHigh = function() {
  return this.priority >= 7;
};

ManualApprovalRequest.prototype.isPriorityLow = function() {
  return this.priority <= 3;
};

ManualApprovalRequest.prototype.getApprovalSummary = function() {
  return {
    id: this.id,
    appointment_id: this.appointment_id,
    service_type: this.service_type,
    paid_amount: parseFloat(this.paid_amount),
    expected_amount: parseFloat(this.expected_amount),
    payment_difference: parseFloat(this.payment_difference),
    payment_difference_percentage: this.getPaymentDifferencePercentage(),
    priority: this.priority,
    priority_level: this.isPriorityHigh() ? 'high' : this.isPriorityLow() ? 'low' : 'medium',
    status: this.status,
    reason: this.reason,
    time_remaining: this.getTimeRemainingFormatted(),
    is_expired: this.isExpired(),
    created_at: this.created_at,
    expires_at: this.expires_at,
    decision_at: this.decision_at,
    decision_reason: this.decision_reason
  };
};

// Class methods
ManualApprovalRequest.findPendingForDoctor = async function(doctorId, options = {}) {
  const { limit = 20, offset = 0 } = options;
  
  return await this.findAll({
    where: {
      doctor_id: doctorId,
      status: 'pending',
      expires_at: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    },
    order: [['priority', 'DESC'], ['created_at', 'ASC']],
    limit,
    offset
  });
};

ManualApprovalRequest.findExpiredRequests = async function() {
  return await this.findAll({
    where: {
      status: 'pending',
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    }
  });
};

ManualApprovalRequest.getApprovalStats = async function(doctorId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  const stats = await sequelize.query(`
    SELECT 
      status,
      service_type,
      COUNT(*) as count,
      AVG(paid_amount) as avg_amount,
      AVG(EXTRACT(EPOCH FROM (decision_at - created_at))/60) as avg_response_time_minutes,
      AVG(priority) as avg_priority
    FROM manual_approval_requests 
    WHERE doctor_id = :doctorId 
    AND created_at >= :startDate
    GROUP BY status, service_type
    ORDER BY status, service_type
  `, {
    replacements: { doctorId, startDate },
    type: sequelize.QueryTypes.SELECT
  });
  
  return stats;
};

ManualApprovalRequest.cleanupExpiredRequests = async function() {
  const expiredRequests = await this.findExpiredRequests();
  
  const results = [];
  for (const request of expiredRequests) {
    try {
      // This would typically be handled by the ManualApprovalRouter service
      // For now, just mark as expired
      await request.update({
        status: 'expired',
        decision_at: new Date(),
        decision_reason: 'Automatic expiration due to timeout'
      });
      
      results.push({
        id: request.id,
        appointment_id: request.appointment_id,
        status: 'expired'
      });
    } catch (error) {
      console.error(`Error expiring request ${request.id}:`, error);
      results.push({
        id: request.id,
        appointment_id: request.appointment_id,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
};

ManualApprovalRequest.getQueueSummary = async function(doctorId) {
  const summary = await sequelize.query(`
    SELECT 
      COUNT(*) as total_pending,
      COUNT(CASE WHEN priority >= 7 THEN 1 END) as high_priority,
      COUNT(CASE WHEN priority <= 3 THEN 1 END) as low_priority,
      COUNT(CASE WHEN expires_at < NOW() + INTERVAL '2 hours' THEN 1 END) as expiring_soon,
      AVG(priority) as avg_priority,
      MIN(created_at) as oldest_request
    FROM manual_approval_requests 
    WHERE doctor_id = :doctorId 
    AND status = 'pending'
    AND expires_at > NOW()
  `, {
    replacements: { doctorId },
    type: sequelize.QueryTypes.SELECT
  });
  
  return summary[0] || {
    total_pending: 0,
    high_priority: 0,
    low_priority: 0,
    expiring_soon: 0,
    avg_priority: 0,
    oldest_request: null
  };
};

// Define associations
ManualApprovalRequest.associate = function(models) {
  ManualApprovalRequest.belongsTo(models.Appointment, {
    foreignKey: 'appointment_id',
    as: 'Appointment'
  });
  
  ManualApprovalRequest.belongsTo(models.User, {
    foreignKey: 'doctor_id',
    as: 'Doctor'
  });
  
  ManualApprovalRequest.belongsTo(models.User, {
    foreignKey: 'patient_id',
    as: 'Patient'
  });
};

module.exports = ManualApprovalRequest;