const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PricingAuditLog = sequelize.define('PricingAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  doctor_id: {
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
  action_type: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'suspend'),
    allowNull: false
  },
  old_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  new_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  changed_by: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  change_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_admin_override: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'pricing_audit_log',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // Audit logs should be immutable
  indexes: [
    {
      fields: ['doctor_id']
    },
    {
      fields: ['action_type']
    },
    {
      fields: ['changed_by']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_admin_override']
    },
    {
      fields: ['doctor_id', 'created_at']
    }
  ]
});

// Class methods for audit functionality
PricingAuditLog.logPricingChange = async function(changeData) {
  try {
    const {
      doctor_id,
      service_type,
      action_type,
      old_amount,
      new_amount,
      changed_by,
      change_reason,
      is_admin_override = false
    } = changeData;

    const auditEntry = await this.create({
      doctor_id,
      service_type,
      action_type,
      old_amount,
      new_amount,
      changed_by,
      change_reason,
      is_admin_override
    });

    console.log(`Pricing audit logged: ${action_type} for doctor ${doctor_id}, service ${service_type}`);
    return auditEntry;
  } catch (error) {
    console.error('Error logging pricing change:', error);
    throw error;
  }
};

PricingAuditLog.getDoctorAuditHistory = async function(doctorId, options = {}) {
  try {
    const { startDate, endDate, actionType, limit = 100 } = options;
    
    const whereClause = { doctor_id: doctorId };
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    if (actionType) {
      whereClause.action_type = actionType;
    }

    const auditHistory = await this.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'ChangedBy',
          attributes: ['id', 'first_name', 'last_name', 'role']
        },
        {
          model: sequelize.models.User,
          as: 'Doctor',
          attributes: ['id', 'first_name', 'last_name', 'specialty']
        }
      ]
    });

    return auditHistory;
  } catch (error) {
    console.error('Error getting doctor audit history:', error);
    throw error;
  }
};

PricingAuditLog.getSystemAuditReport = async function(options = {}) {
  try {
    const { 
      startDate, 
      endDate, 
      actionType, 
      isAdminOverride,
      limit = 500 
    } = options;
    
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    if (actionType) {
      whereClause.action_type = actionType;
    }
    
    if (isAdminOverride !== undefined) {
      whereClause.is_admin_override = isAdminOverride;
    }

    const auditReport = await this.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'ChangedBy',
          attributes: ['id', 'first_name', 'last_name', 'role']
        },
        {
          model: sequelize.models.User,
          as: 'Doctor',
          attributes: ['id', 'first_name', 'last_name', 'specialty']
        }
      ]
    });

    return auditReport;
  } catch (error) {
    console.error('Error getting system audit report:', error);
    throw error;
  }
};

PricingAuditLog.detectSuspiciousActivity = async function(doctorId, timeWindow = '24h') {
  try {
    const hours = timeWindow === '24h' ? 24 : 1;
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    // Look for suspicious patterns
    const suspiciousPatterns = await sequelize.query(`
      SELECT 
        doctor_id,
        service_type,
        COUNT(*) as change_count,
        COUNT(DISTINCT new_amount) as unique_amounts,
        MIN(new_amount) as min_amount,
        MAX(new_amount) as max_amount,
        AVG(new_amount) as avg_amount,
        STDDEV(new_amount) as amount_stddev
      FROM pricing_audit_log 
      WHERE doctor_id = :doctorId 
      AND created_at >= :startDate
      AND action_type IN ('create', 'update')
      GROUP BY doctor_id, service_type
      HAVING change_count > 5 OR (MAX(new_amount) - MIN(new_amount)) > 10000
    `, {
      replacements: { doctorId, startDate },
      type: sequelize.QueryTypes.SELECT
    });

    const suspiciousActivity = {
      doctor_id: doctorId,
      time_window: timeWindow,
      patterns_detected: [],
      risk_level: 'low'
    };

    suspiciousPatterns.forEach(pattern => {
      if (pattern.change_count > 10) {
        suspiciousActivity.patterns_detected.push({
          type: 'excessive_changes',
          service_type: pattern.service_type,
          change_count: pattern.change_count,
          severity: 'high'
        });
        suspiciousActivity.risk_level = 'high';
      }

      if (pattern.max_amount - pattern.min_amount > 15000) {
        suspiciousActivity.patterns_detected.push({
          type: 'extreme_price_swings',
          service_type: pattern.service_type,
          price_range: pattern.max_amount - pattern.min_amount,
          severity: 'medium'
        });
        if (suspiciousActivity.risk_level === 'low') {
          suspiciousActivity.risk_level = 'medium';
        }
      }

      if (pattern.amount_stddev > 5000) {
        suspiciousActivity.patterns_detected.push({
          type: 'high_price_volatility',
          service_type: pattern.service_type,
          volatility: pattern.amount_stddev,
          severity: 'medium'
        });
        if (suspiciousActivity.risk_level === 'low') {
          suspiciousActivity.risk_level = 'medium';
        }
      }
    });

    return suspiciousActivity;
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    throw error;
  }
};

PricingAuditLog.generateComplianceReport = async function(startDate, endDate) {
  try {
    const complianceData = await sequelize.query(`
      SELECT 
        action_type,
        service_type,
        is_admin_override,
        COUNT(*) as total_changes,
        COUNT(DISTINCT doctor_id) as unique_doctors,
        COUNT(DISTINCT changed_by) as unique_changers,
        AVG(CASE WHEN old_amount IS NOT NULL AND new_amount IS NOT NULL 
            THEN ABS(new_amount - old_amount) ELSE 0 END) as avg_change_amount,
        MAX(CASE WHEN old_amount IS NOT NULL AND new_amount IS NOT NULL 
            THEN ABS(new_amount - old_amount) ELSE 0 END) as max_change_amount
      FROM pricing_audit_log 
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY action_type, service_type, is_admin_override
      ORDER BY action_type, service_type
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    const report = {
      period: { start: startDate, end: endDate },
      summary: {
        total_changes: 0,
        admin_overrides: 0,
        doctor_changes: 0,
        unique_doctors_affected: 0
      },
      breakdown: complianceData,
      generated_at: new Date()
    };

    // Calculate summary statistics
    complianceData.forEach(row => {
      report.summary.total_changes += parseInt(row.total_changes);
      if (row.is_admin_override) {
        report.summary.admin_overrides += parseInt(row.total_changes);
      } else {
        report.summary.doctor_changes += parseInt(row.total_changes);
      }
    });

    // Get unique doctors count
    const uniqueDoctors = await this.count({
      distinct: true,
      col: 'doctor_id',
      where: {
        created_at: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      }
    });
    report.summary.unique_doctors_affected = uniqueDoctors;

    return report;
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};

module.exports = PricingAuditLog;