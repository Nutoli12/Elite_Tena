import { DataTypes } from 'sequelize';

export default function(sequelize) {
  const LabTestCatalog = sequelize.define('LabTestCatalog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    testCode: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      field: 'test_code'
    },
    testName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'test_name'
    },
    testCategory: {
      type: DataTypes.STRING(100),
      field: 'test_category'
    },
    
    // Test Details
    description: {
      type: DataTypes.TEXT
    },
    sampleType: {
      type: DataTypes.STRING(50),
      field: 'sample_type'
    },
    sampleVolume: {
      type: DataTypes.STRING(50),
      field: 'sample_volume'
    },
    fastingRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'fasting_required'
    },
    
    // Reference Ranges
    referenceRanges: {
      type: DataTypes.JSONB,
      field: 'reference_ranges',
      defaultValue: {}
    },
    criticalValues: {
      type: DataTypes.JSONB,
      field: 'critical_values',
      defaultValue: {}
    },
    
    // Pricing & Timing
    standardPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'standard_price'
    },
    turnaroundTimeHours: {
      type: DataTypes.INTEGER,
      defaultValue: 24,
      field: 'turnaround_time_hours'
    },
    
    // Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'requires_approval'
    }
  }, {
    tableName: 'lab_workflow_test_catalog',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

  });

  // Instance methods
  LabTestCatalog.prototype.getEstimatedCompletionTime = function(priority = 'routine') {
    let multiplier = 1;
    
    switch (priority) {
      case 'stat':
        multiplier = 0.25; // 25% of normal time
        break;
      case 'urgent':
        multiplier = 0.5; // 50% of normal time
        break;
      default:
        multiplier = 1; // Normal time
    }
    
    const estimatedHours = this.turnaroundTimeHours * multiplier;
    const completionTime = new Date();
    completionTime.setHours(completionTime.getHours() + estimatedHours);
    
    return {
      hours: estimatedHours,
      estimatedCompletion: completionTime
    };
  };

  LabTestCatalog.prototype.validateResult = function(resultData) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      criticalValues: []
    };

    if (!this.referenceRanges || Object.keys(this.referenceRanges).length === 0) {
      validation.warnings.push('No reference ranges defined for this test');
      return validation;
    }

    // Validate each parameter in the result
    for (const [parameter, value] of Object.entries(resultData)) {
      const referenceRange = this.referenceRanges[parameter];
      const criticalRange = this.criticalValues[parameter];

      if (!referenceRange) {
        validation.warnings.push(`No reference range defined for parameter: ${parameter}`);
        continue;
      }

      // Check if value is within reference range
      if (typeof value === 'number') {
        if (referenceRange.min !== undefined && value < referenceRange.min) {
          validation.warnings.push(`${parameter} (${value}) is below reference range (min: ${referenceRange.min})`);
        }
        
        if (referenceRange.max !== undefined && value > referenceRange.max) {
          validation.warnings.push(`${parameter} (${value}) is above reference range (max: ${referenceRange.max})`);
        }

        // Check for critical values
        if (criticalRange) {
          if (criticalRange.critical_low !== undefined && value < criticalRange.critical_low) {
            validation.criticalValues.push({
              parameter,
              value,
              type: 'critically_low',
              threshold: criticalRange.critical_low
            });
          }
          
          if (criticalRange.critical_high !== undefined && value > criticalRange.critical_high) {
            validation.criticalValues.push({
              parameter,
              value,
              type: 'critically_high',
              threshold: criticalRange.critical_high
            });
          }
        }
      }
    }

    return validation;
  };

  LabTestCatalog.prototype.toJSON = function() {
    const values = { ...this.get() };
    
    // Add computed fields
    values.displayName = `${this.testName} (${this.testCode})`;
    values.categoryDisplay = this.testCategory || 'General';
    values.priceDisplay = this.standardPrice ? `$${this.standardPrice}` : 'Price on request';
    values.turnaroundDisplay = `${this.turnaroundTimeHours} hours`;
    
    return values;
  };

  // Class methods
  LabTestCatalog.getActiveTests = async function(options = {}) {
    return await this.findAll({
      where: { isActive: true },
      order: [['test_category', 'ASC'], ['test_name', 'ASC']],
      ...options
    });
  };

  LabTestCatalog.getTestsByCategory = async function(category, options = {}) {
    return await this.findAll({
      where: { 
        testCategory: category,
        isActive: true 
      },
      order: [['test_name', 'ASC']],
      ...options
    });
  };

  LabTestCatalog.searchTests = async function(searchTerm, options = {}) {
    const { Op } = sequelize.Sequelize;
    
    return await this.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { testName: { [Op.iLike]: `%${searchTerm}%` } },
          { testCode: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['test_name', 'ASC']],
      ...options
    });
  };

  LabTestCatalog.getTestsByCodes = async function(testCodes, options = {}) {
    return await this.findAll({
      where: {
        testCode: {
          [sequelize.Sequelize.Op.in]: testCodes
        },
        isActive: true
      },
      ...options
    });
  };

  LabTestCatalog.calculateTotalPrice = async function(testCodes) {
    const tests = await this.getTestsByCodes(testCodes);
    
    return tests.reduce((total, test) => {
      return total + (parseFloat(test.standardPrice) || 0);
    }, 0);
  };

  return LabTestCatalog;
}