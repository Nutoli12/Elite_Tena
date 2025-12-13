const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MarketRateAnalytics = sequelize.define('MarketRateAnalytics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  specialty: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  service_type: {
    type: DataTypes.ENUM('in_person', 'video_call', 'chat'),
    allowNull: false
  },
  avg_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  min_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  max_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  median_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  doctor_count: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  calculation_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'market_rate_analytics',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['specialty', 'service_type', 'calculation_date']
    },
    {
      fields: ['specialty']
    },
    {
      fields: ['service_type']
    },
    {
      fields: ['calculation_date']
    }
  ]
});

// Class methods for market analytics
MarketRateAnalytics.calculateAndStore = async function(specialty = null, serviceType = null) {
  const transaction = await sequelize.transaction();
  
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get all specialties if none specified
    let specialties = [];
    if (specialty) {
      specialties = [specialty];
    } else {
      const specialtyQuery = await sequelize.query(`
        SELECT DISTINCT specialty 
        FROM users 
        WHERE role = 'doctor' AND specialty IS NOT NULL
      `, { type: sequelize.QueryTypes.SELECT, transaction });
      specialties = specialtyQuery.map(s => s.specialty);
    }

    // Get all service types if none specified
    const serviceTypes = serviceType ? [serviceType] : ['video_call', 'chat'];
    
    const results = [];

    for (const spec of specialties) {
      for (const svcType of serviceTypes) {
        const marketData = await this.calculateMarketRates(spec, svcType, transaction);
        
        if (marketData && marketData.doctor_count > 0) {
          // Delete existing data for today
          await this.destroy({
            where: {
              specialty: spec,
              service_type: svcType,
              calculation_date: today
            },
            transaction
          });

          // Insert new calculation
          const analyticsRecord = await this.create({
            specialty: spec,
            service_type: svcType,
            avg_rate: marketData.avg_rate,
            min_rate: marketData.min_rate,
            max_rate: marketData.max_rate,
            median_rate: marketData.median_rate,
            doctor_count: marketData.doctor_count,
            calculation_date: today
          }, { transaction });

          results.push(analyticsRecord);
        }
      }
    }

    await transaction.commit();
    console.log(`Market rate analytics calculated for ${results.length} specialty-service combinations`);
    return results;
  } catch (error) {
    await transaction.rollback();
    console.error('Error calculating and storing market rates:', error);
    throw error;
  }
};

MarketRateAnalytics.calculateMarketRates = async function(specialty, serviceType, transaction = null) {
  try {
    // Get all active fees for this specialty and service type
    const fees = await sequelize.query(`
      SELECT dsf.fee_amount 
      FROM doctor_service_fees_enhanced dsf
      JOIN users u ON dsf.doctor_id = u.id
      WHERE u.specialty = :specialty 
      AND dsf.service_type = :service_type 
      AND dsf.is_active = true
      AND dsf.fee_set_by = 'doctor'
      ORDER BY dsf.fee_amount
    `, {
      replacements: { specialty, service_type: serviceType },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    if (fees.length === 0) {
      return null;
    }

    const amounts = fees.map(f => parseFloat(f.fee_amount));
    const sum = amounts.reduce((a, b) => a + b, 0);
    const avg = sum / amounts.length;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    
    // Calculate median
    const sorted = amounts.sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      specialty,
      service_type: serviceType,
      avg_rate: Math.round(avg * 100) / 100, // Round to 2 decimal places
      min_rate: min,
      max_rate: max,
      median_rate: Math.round(median * 100) / 100,
      doctor_count: amounts.length
    };
  } catch (error) {
    console.error('Error calculating market rates:', error);
    throw error;
  }
};

MarketRateAnalytics.getCurrentMarketRates = async function(specialty, serviceType) {
  try {
    const marketData = await this.findOne({
      where: { specialty, service_type: serviceType },
      order: [['calculation_date', 'DESC']]
    });

    if (!marketData) {
      // Calculate on-demand if no recent data
      const calculated = await this.calculateMarketRates(specialty, serviceType);
      return calculated;
    }

    return {
      specialty: marketData.specialty,
      service_type: marketData.service_type,
      avg_rate: parseFloat(marketData.avg_rate),
      min_rate: parseFloat(marketData.min_rate),
      max_rate: parseFloat(marketData.max_rate),
      median_rate: parseFloat(marketData.median_rate),
      doctor_count: marketData.doctor_count,
      last_updated: marketData.calculation_date
    };
  } catch (error) {
    console.error('Error getting current market rates:', error);
    throw error;
  }
};

MarketRateAnalytics.getMarketTrends = async function(specialty, serviceType, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await this.findAll({
      where: {
        specialty,
        service_type: serviceType,
        calculation_date: {
          [sequelize.Op.gte]: startDate.toISOString().split('T')[0]
        }
      },
      order: [['calculation_date', 'ASC']]
    });

    if (trends.length < 2) {
      return { trend: 'insufficient_data', trends: [] };
    }

    // Calculate trend direction
    const first = trends[0];
    const last = trends[trends.length - 1];
    const avgChange = parseFloat(last.avg_rate) - parseFloat(first.avg_rate);
    const percentChange = (avgChange / parseFloat(first.avg_rate)) * 100;

    let trendDirection = 'stable';
    if (percentChange > 5) trendDirection = 'increasing';
    else if (percentChange < -5) trendDirection = 'decreasing';

    return {
      specialty,
      service_type: serviceType,
      trend: trendDirection,
      percent_change: Math.round(percentChange * 100) / 100,
      amount_change: Math.round(avgChange * 100) / 100,
      data_points: trends.length,
      trends: trends.map(t => ({
        date: t.calculation_date,
        avg_rate: parseFloat(t.avg_rate),
        min_rate: parseFloat(t.min_rate),
        max_rate: parseFloat(t.max_rate),
        median_rate: parseFloat(t.median_rate),
        doctor_count: t.doctor_count
      }))
    };
  } catch (error) {
    console.error('Error getting market trends:', error);
    throw error;
  }
};

MarketRateAnalytics.getCompetitivePosition = async function(doctorId, serviceType) {
  try {
    // Get doctor's current pricing
    const EnhancedDoctorServiceFees = require('./EnhancedDoctorServiceFees');
    const doctorPricing = await EnhancedDoctorServiceFees.findOne({
      where: { doctor_id: doctorId, service_type: serviceType, is_active: true },
      include: [{
        model: sequelize.models.User,
        attributes: ['specialty']
      }]
    });

    if (!doctorPricing) {
      return { error: 'Doctor pricing not found' };
    }

    const specialty = doctorPricing.User.specialty;
    const doctorFee = parseFloat(doctorPricing.fee_amount);

    // Get current market rates for the specialty
    const marketRates = await this.getCurrentMarketRates(specialty, serviceType);
    
    if (!marketRates) {
      return { error: 'Market data not available' };
    }

    // Calculate competitive position
    const position = {
      doctor_fee: doctorFee,
      market_avg: marketRates.avg_rate,
      market_median: marketRates.median_rate,
      market_min: marketRates.min_rate,
      market_max: marketRates.max_rate,
      percentile: 0,
      position: 'unknown'
    };

    // Calculate percentile position
    if (doctorFee <= marketRates.min_rate) {
      position.percentile = 0;
      position.position = 'lowest';
    } else if (doctorFee >= marketRates.max_rate) {
      position.percentile = 100;
      position.position = 'highest';
    } else {
      // Estimate percentile based on position relative to min, median, max
      if (doctorFee <= marketRates.median_rate) {
        position.percentile = Math.round(((doctorFee - marketRates.min_rate) / (marketRates.median_rate - marketRates.min_rate)) * 50);
        position.position = 'below_median';
      } else {
        position.percentile = Math.round(50 + ((doctorFee - marketRates.median_rate) / (marketRates.max_rate - marketRates.median_rate)) * 50);
        position.position = 'above_median';
      }
    }

    // Add recommendations
    position.recommendations = [];
    
    if (position.percentile < 25) {
      position.recommendations.push('Consider increasing your fee to be more competitive');
    } else if (position.percentile > 75) {
      position.recommendations.push('Your fee is above market average - ensure you provide premium value');
    } else {
      position.recommendations.push('Your pricing is well-positioned in the market');
    }

    return position;
  } catch (error) {
    console.error('Error getting competitive position:', error);
    throw error;
  }
};

MarketRateAnalytics.generateMarketReport = async function(specialty = null) {
  try {
    const whereClause = {};
    if (specialty) {
      whereClause.specialty = specialty;
    }

    // Get latest data for each specialty-service combination
    const latestRates = await sequelize.query(`
      SELECT 
        mra1.specialty,
        mra1.service_type,
        mra1.avg_rate,
        mra1.min_rate,
        mra1.max_rate,
        mra1.median_rate,
        mra1.doctor_count,
        mra1.calculation_date
      FROM market_rate_analytics mra1
      INNER JOIN (
        SELECT specialty, service_type, MAX(calculation_date) as max_date
        FROM market_rate_analytics
        ${specialty ? 'WHERE specialty = :specialty' : ''}
        GROUP BY specialty, service_type
      ) mra2 ON mra1.specialty = mra2.specialty 
        AND mra1.service_type = mra2.service_type 
        AND mra1.calculation_date = mra2.max_date
      ORDER BY mra1.specialty, mra1.service_type
    `, {
      replacements: specialty ? { specialty } : {},
      type: sequelize.QueryTypes.SELECT
    });

    const report = {
      generated_at: new Date(),
      specialty_filter: specialty,
      market_overview: {
        total_specialties: 0,
        total_service_types: 0,
        total_doctors: 0,
        avg_market_rate: 0
      },
      specialty_breakdown: {}
    };

    // Process the data
    const specialties = new Set();
    const serviceTypes = new Set();
    let totalDoctors = 0;
    let totalRateSum = 0;
    let totalRateCount = 0;

    latestRates.forEach(rate => {
      specialties.add(rate.specialty);
      serviceTypes.add(rate.service_type);
      totalDoctors += rate.doctor_count;
      totalRateSum += parseFloat(rate.avg_rate);
      totalRateCount++;

      if (!report.specialty_breakdown[rate.specialty]) {
        report.specialty_breakdown[rate.specialty] = {};
      }

      report.specialty_breakdown[rate.specialty][rate.service_type] = {
        avg_rate: parseFloat(rate.avg_rate),
        min_rate: parseFloat(rate.min_rate),
        max_rate: parseFloat(rate.max_rate),
        median_rate: parseFloat(rate.median_rate),
        doctor_count: rate.doctor_count,
        last_updated: rate.calculation_date
      };
    });

    report.market_overview.total_specialties = specialties.size;
    report.market_overview.total_service_types = serviceTypes.size;
    report.market_overview.total_doctors = totalDoctors;
    report.market_overview.avg_market_rate = totalRateCount > 0 ? 
      Math.round((totalRateSum / totalRateCount) * 100) / 100 : 0;

    return report;
  } catch (error) {
    console.error('Error generating market report:', error);
    throw error;
  }
};

module.exports = MarketRateAnalytics;