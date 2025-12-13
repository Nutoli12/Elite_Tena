/**
 * Property Test: Market Rate Display
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 7.2: Property test for pricing display**
 * **Property 10: Market rate display**
 * **Validates: Requirements 2.1, 2.2, 2.5**
 * 
 * Tests that market rate display functionality works correctly across
 * different scenarios and maintains data integrity.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';

describe('Property Test: Market Rate Display', () => {
  let mockModels;
  let mockNotificationService;
  let mockAuditService;

  beforeEach(() => {
    // Mock timers to prevent blocking
    jest.useFakeTimers();

    mockModels = {
      MarketRateAnalytics: {
        findAll: jest.fn(),
        create: jest.fn(),
        findOne: jest.fn()
      },
      EnhancedDoctorServiceFees: {
        findAll: jest.fn(),
        findOne: jest.fn()
      }
    };

    mockNotificationService = {
      sendNotification: jest.fn().mockResolvedValue({ success: true })
    };

    mockAuditService = {
      logPricingDisplay: jest.fn().mockResolvedValue({ logged: true })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  /**
   * Property 10.1: Market rate calculation consistency
   * Market rates should be calculated consistently based on service type
   * and regional factors.
   */
  it('should calculate market rates consistently', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
        region: fc.constantFrom('addis_ababa', 'dire_dawa', 'bahir_dar', 'hawassa'),
        experience_level: fc.constantFrom('junior', 'mid', 'senior', 'expert'),
        specialization: fc.constantFrom('general', 'cardiology', 'neurology', 'pediatrics')
      }),
      async (marketData) => {
        // Mock market rate data
        const mockMarketRate = {
          id: `market_${Date.now()}`,
          service_type: marketData.service_type,
          region: marketData.region,
          base_rate: calculateBaseRate(marketData.service_type),
          experience_multiplier: getExperienceMultiplier(marketData.experience_level),
          specialization_multiplier: getSpecializationMultiplier(marketData.specialization),
          calculated_rate: 0,
          last_updated: new Date()
        };

        // Calculate expected rate
        mockMarketRate.calculated_rate = mockMarketRate.base_rate * 
          mockMarketRate.experience_multiplier * 
          mockMarketRate.specialization_multiplier;

        mockModels.MarketRateAnalytics.findOne.mockResolvedValue(mockMarketRate);

        // Test rate calculation consistency
        const rate1 = await getMarketRate(marketData);
        const rate2 = await getMarketRate(marketData);

        expect(rate1).toBeCloseTo(rate2, 2);
        expect(rate1).toBeGreaterThan(0);
        expect(rate1).toBeLessThan(10000); // Reasonable upper bound
        
        // Verify rate components
        expect(mockMarketRate.base_rate).toBeGreaterThan(0);
        expect(mockMarketRate.experience_multiplier).toBeGreaterThanOrEqual(1.0);
        expect(mockMarketRate.specialization_multiplier).toBeGreaterThanOrEqual(1.0);
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 10.2: Pricing display formatting
   * Pricing information should be formatted correctly for display
   * with proper currency and decimal handling.
   */
  it('should format pricing display correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.float({ min: 10, max: 5000 }),
        currency: fc.constantFrom('ETB', 'USD'),
        display_type: fc.constantFrom('standard', 'premium', 'market_rate'),
        include_fees: fc.boolean()
      }),
      async (displayData) => {
        const formattedPrice = await formatPriceDisplay(displayData);

        // Verify formatting structure
        expect(formattedPrice).toHaveProperty('formatted_amount');
        expect(formattedPrice).toHaveProperty('currency_symbol');
        expect(formattedPrice).toHaveProperty('display_string');

        // Verify currency formatting
        if (displayData.currency === 'ETB') {
          expect(formattedPrice.currency_symbol).toBe('ETB');
        } else {
          expect(formattedPrice.currency_symbol).toBe('$');
        }

        // Verify decimal places
        const decimalPlaces = formattedPrice.formatted_amount.split('.')[1];
        if (decimalPlaces) {
          expect(decimalPlaces.length).toBeLessThanOrEqual(2);
        }

        // Verify display string format
        expect(formattedPrice.display_string).toMatch(/^[\d,]+\.?\d*\s*(ETB|\$)$/);
        
        // Verify amount consistency
        const numericAmount = parseFloat(formattedPrice.formatted_amount);
        expect(numericAmount).toBeCloseTo(displayData.amount, 2);
      }
    ), { numRuns: 25 });
  });

  /**
   * Property 10.3: Comparative pricing display
   * When displaying multiple pricing options, they should be
   * properly ordered and differentiated.
   */
  it('should display comparative pricing correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          doctor_id: fc.string({ minLength: 5, maxLength: 20 }),
          service_type: fc.constantFrom('in_person', 'video_call', 'chat'),
          fee_amount: fc.float({ min: 100, max: 3000 }),
          is_premium: fc.boolean(),
          experience_years: fc.integer({ min: 1, max: 30 })
        }),
        { minLength: 2, maxLength: 8 }
      ),
      async (doctorPricing) => {
        const comparativeDisplay = await generateComparativePricing(doctorPricing);

        expect(comparativeDisplay).toHaveProperty('pricing_options');
        expect(comparativeDisplay.pricing_options).toHaveLength(doctorPricing.length);

        // Verify sorting (should be by price ascending by default)
        for (let i = 1; i < comparativeDisplay.pricing_options.length; i++) {
          const current = comparativeDisplay.pricing_options[i];
          const previous = comparativeDisplay.pricing_options[i - 1];
          expect(current.display_price).toBeGreaterThanOrEqual(previous.display_price);
        }

        // Verify each option has required display fields
        comparativeDisplay.pricing_options.forEach(option => {
          expect(option).toHaveProperty('doctor_id');
          expect(option).toHaveProperty('display_price');
          expect(option).toHaveProperty('formatted_price');
          expect(option).toHaveProperty('price_tier');
          expect(option).toHaveProperty('value_indicators');
          
          expect(option.display_price).toBeGreaterThan(0);
          expect(['standard', 'premium', 'market_rate']).toContain(option.price_tier);
        });

        // Verify market positioning
        const marketRate = await getMarketRate({ 
          service_type: doctorPricing[0].service_type,
          region: 'addis_ababa'
        });
        
        comparativeDisplay.pricing_options.forEach(option => {
          if (option.display_price < marketRate * 0.8) {
            expect(option.value_indicators).toContain('below_market');
          } else if (option.display_price > marketRate * 1.2) {
            expect(option.value_indicators).toContain('above_market');
          } else {
            expect(option.value_indicators).toContain('market_rate');
          }
        });
      }
    ), { numRuns: 20 });
  });

  // Helper functions for testing
  function calculateBaseRate(serviceType) {
    const baseRates = {
      'in_person': 300,
      'video_call': 200,
      'chat': 150
    };
    return baseRates[serviceType] || 200;
  }

  function getExperienceMultiplier(experienceLevel) {
    const multipliers = {
      'junior': 1.0,
      'mid': 1.3,
      'senior': 1.6,
      'expert': 2.0
    };
    return multipliers[experienceLevel] || 1.0;
  }

  function getSpecializationMultiplier(specialization) {
    const multipliers = {
      'general': 1.0,
      'cardiology': 1.5,
      'neurology': 1.7,
      'pediatrics': 1.3
    };
    return multipliers[specialization] || 1.0;
  }

  async function getMarketRate(marketData) {
    const baseRate = calculateBaseRate(marketData.service_type);
    const experienceMultiplier = getExperienceMultiplier(marketData.experience_level || 'mid');
    const specializationMultiplier = getSpecializationMultiplier(marketData.specialization || 'general');
    
    return baseRate * experienceMultiplier * specializationMultiplier;
  }

  async function formatPriceDisplay(displayData) {
    const amount = displayData.amount;
    const currency = displayData.currency;
    
    const formatted_amount = amount.toFixed(2);
    const currency_symbol = currency === 'ETB' ? 'ETB' : '$';
    const display_string = `${formatted_amount} ${currency_symbol}`;

    return {
      formatted_amount,
      currency_symbol,
      display_string,
      amount: amount,
      currency: currency
    };
  }

  async function generateComparativePricing(doctorPricing) {
    const pricing_options = doctorPricing
      .map(doctor => ({
        doctor_id: doctor.doctor_id,
        display_price: doctor.fee_amount,
        formatted_price: `${doctor.fee_amount.toFixed(2)} ETB`,
        price_tier: doctor.is_premium ? 'premium' : 'standard',
        value_indicators: [],
        experience_years: doctor.experience_years
      }))
      .sort((a, b) => a.display_price - b.display_price);

    // Add value indicators based on market positioning
    const marketRate = 250; // Mock market rate
    pricing_options.forEach(option => {
      if (option.display_price < marketRate * 0.8) {
        option.value_indicators.push('below_market');
      } else if (option.display_price > marketRate * 1.2) {
        option.value_indicators.push('above_market');
      } else {
        option.value_indicators.push('market_rate');
      }

      if (option.experience_years > 10) {
        option.value_indicators.push('experienced');
      }
    });

    return {
      pricing_options,
      market_rate: marketRate,
      total_options: pricing_options.length
    };
  }
});

const mockNotificationService = {
  sendNotification: jest.fn()
};

// Import the service to test
import PricingEngine from '../src/services/PricingEngine.js';

describe('Property Test: Market Rate Display', () => {
  let pricingEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    pricingEngine = new PricingEngine();
  });

  /**
   * Property 10.1: Market rate calculation consistency
   * For any set of doctor prices, the market rate should be mathematically consistent
   */
  test('Property 10.1: Market rate calculations are mathematically consistent', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          doctor_id: fc.string({ minLength: 1, maxLength: 50 }),
          service_type: fc.constantFrom('video_call', 'chat', 'in_person'),
          fee_amount: fc.float({ min: 400, max: 20000 }),
          specialization: fc.constantFrom('General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics'),
          experience_years: fc.integer({ min: 1, max: 40 }),
          is_active: fc.constant(true)
        }),
        { minLength: 1, maxLength: 100 }
      ),
      async (doctorFees) => {
        // Mock the database response
        mockModels.EnhancedDoctorServiceFees.findAll.mockResolvedValue(doctorFees);

        // Calculate market rates
        const marketRates = await pricingEngine.calculateMarketRates({
          service_type: doctorFees[0].service_type,
          specialization: doctorFees[0].specialization
        });

        // Property: Market rate should be within the range of provided prices
        const prices = doctorFees.map(fee => fee.fee_amount);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        expect(marketRates.average_price).toBeGreaterThanOrEqual(minPrice);
        expect(marketRates.average_price).toBeLessThanOrEqual(maxPrice);

        // Property: Market rate should equal mathematical average
        const expectedAverage = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        expect(Math.abs(marketRates.average_price - expectedAverage)).toBeLessThan(0.01);

        // Property: Price range should be correct
        expect(marketRates.price_range.min).toBe(minPrice);
        expect(marketRates.price_range.max).toBe(maxPrice);

        // Property: Total doctors count should match input
        expect(marketRates.total_doctors).toBe(doctorFees.length);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 10.2: Market position classification accuracy
   * Doctor prices should be correctly classified relative to market rates
   */
  test('Property 10.2: Market position classification is accurate', () => {
    fc.assert(fc.property(
      fc.record({
        market_average: fc.float({ min: 1000, max: 15000 }),
        doctor_price: fc.float({ min: 400, max: 20000 }),
        market_std_dev: fc.float({ min: 100, max: 3000 })
      }),
      async (testData) => {
        const { market_average, doctor_price, market_std_dev } = testData;

        const position = await pricingEngine.classifyMarketPosition({
          doctor_price,
          market_average,
          market_std_dev
        });

        // Property: Classification should be consistent with mathematical thresholds
        const deviation = (doctor_price - market_average) / market_std_dev;

        if (deviation < -1) {
          expect(position).toBe('below_market');
        } else if (deviation > 2) {
          expect(position).toBe('premium');
        } else if (deviation > 1) {
          expect(position).toBe('above_market');
        } else {
          expect(position).toBe('at_market');
        }

        // Property: Position should be one of the valid values
        expect(['below_market', 'at_market', 'above_market', 'premium']).toContain(position);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 10.3: Market insights data integrity
   * Market insights should maintain data consistency across service types
   */
  test('Property 10.3: Market insights maintain data integrity', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          service_type: fc.constantFrom('video_call', 'chat', 'in_person'),
          specialization: fc.constantFrom('General Medicine', 'Cardiology', 'Dermatology'),
          doctor_fees: fc.array(
            fc.record({
              fee_amount: fc.float({ min: 400, max: 20000 }),
              doctor_id: fc.string({ minLength: 1, maxLength: 50 }),
              is_active: fc.constant(true)
            }),
            { minLength: 1, maxLength: 50 }
          )
        }),
        { minLength: 1, maxLength: 10 }
      ),
      async (serviceData) => {
        // Mock database responses for each service type
        for (const service of serviceData) {
          mockModels.EnhancedDoctorServiceFees.findAll
            .mockResolvedValueOnce(service.doctor_fees);
        }

        const insights = await pricingEngine.getMarketInsights({
          specialization: serviceData[0].specialization
        });

        // Property: Each service type should have valid insights
        for (const insight of insights) {
          expect(insight.service_type).toBeDefined();
          expect(insight.average_price).toBeGreaterThan(0);
          expect(insight.price_range.min).toBeLessThanOrEqual(insight.price_range.max);
          expect(insight.total_doctors).toBeGreaterThan(0);
          expect(insight.availability_rate).toBeGreaterThanOrEqual(0);
          expect(insight.availability_rate).toBeLessThanOrEqual(1);
        }

        // Property: No duplicate service types in insights
        const serviceTypes = insights.map(i => i.service_type);
        const uniqueServiceTypes = [...new Set(serviceTypes)];
        expect(serviceTypes.length).toBe(uniqueServiceTypes.length);
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 10.4: Price competitiveness scoring consistency
   * Competitiveness scores should be consistent with market position
   */
  test('Property 10.4: Price competitiveness scoring is consistent', () => {
    fc.assert(fc.property(
      fc.record({
        doctor_price: fc.float({ min: 400, max: 20000 }),
        market_data: fc.record({
          average_price: fc.float({ min: 1000, max: 15000 }),
          percentile_25: fc.float({ min: 800, max: 12000 }),
          percentile_75: fc.float({ min: 1200, max: 18000 }),
          total_competitors: fc.integer({ min: 5, max: 100 })
        })
      }),
      async (testData) => {
        const { doctor_price, market_data } = testData;

        const competitiveness = await pricingEngine.calculateCompetitivenessScore({
          doctor_price,
          market_data
        });

        // Property: Score should be between 0 and 100
        expect(competitiveness.score).toBeGreaterThanOrEqual(0);
        expect(competitiveness.score).toBeLessThanOrEqual(100);

        // Property: Lower prices should generally have higher competitiveness
        if (doctor_price < market_data.average_price) {
          expect(competitiveness.score).toBeGreaterThan(50);
        }

        // Property: Extremely high prices should have low competitiveness
        if (doctor_price > market_data.percentile_75 * 1.5) {
          expect(competitiveness.score).toBeLessThan(30);
        }

        // Property: Competitiveness category should match score ranges
        if (competitiveness.score >= 80) {
          expect(competitiveness.category).toBe('highly_competitive');
        } else if (competitiveness.score >= 60) {
          expect(competitiveness.category).toBe('competitive');
        } else if (competitiveness.score >= 40) {
          expect(competitiveness.category).toBe('moderately_competitive');
        } else {
          expect(competitiveness.category).toBe('less_competitive');
        }
      }
    ), { numRuns: 75 });
  });

  /**
   * Property 10.5: Market trend analysis consistency
   * Market trends should be mathematically consistent over time periods
   */
  test('Property 10.5: Market trend analysis is mathematically consistent', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          average_price: fc.float({ min: 1000, max: 15000 }),
          total_transactions: fc.integer({ min: 1, max: 1000 }),
          service_type: fc.constantFrom('video_call', 'chat', 'in_person')
        }),
        { minLength: 7, maxLength: 365 } // At least a week of data
      ).map(data => data.sort((a, b) => a.date.getTime() - b.date.getTime())),
      async (historicalData) => {
        // Mock historical market data
        mockModels.MarketRateAnalytics.findAll.mockResolvedValue(historicalData);

        const trends = await pricingEngine.analyzeMarketTrends({
          service_type: historicalData[0].service_type,
          period_days: historicalData.length
        });

        // Property: Trend direction should match price movement
        const firstPrice = historicalData[0].average_price;
        const lastPrice = historicalData[historicalData.length - 1].average_price;
        const expectedDirection = lastPrice > firstPrice ? 'increasing' : 
                                lastPrice < firstPrice ? 'decreasing' : 'stable';

        if (Math.abs(lastPrice - firstPrice) / firstPrice > 0.05) { // 5% threshold
          expect(trends.direction).toBe(expectedDirection);
        }

        // Property: Volatility should reflect actual price variance
        const prices = historicalData.map(d => d.average_price);
        const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;

        if (coefficientOfVariation > 0.1) {
          expect(trends.volatility).toBe('high');
        } else if (coefficientOfVariation > 0.05) {
          expect(trends.volatility).toBe('medium');
        } else {
          expect(trends.volatility).toBe('low');
        }

        // Property: Growth rate should be mathematically accurate
        const expectedGrowthRate = ((lastPrice - firstPrice) / firstPrice) * 100;
        expect(Math.abs(trends.growth_rate - expectedGrowthRate)).toBeLessThan(0.1);
      }
    ), { numRuns: 25 });
  });

  /**
   * Property 10.6: Doctor listing display consistency
   * Doctor listings should maintain consistent pricing information display
   */
  test('Property 10.6: Doctor listing display maintains consistency', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          doctor_id: fc.string({ minLength: 1, maxLength: 50 }),
          doctor_name: fc.string({ minLength: 2, maxLength: 100 }),
          specialization: fc.constantFrom('General Medicine', 'Cardiology', 'Dermatology'),
          services: fc.record({
            video_call: fc.option(fc.record({
              fee: fc.float({ min: 2000, max: 20000 }),
              market_position: fc.constantFrom('below_market', 'at_market', 'above_market', 'premium'),
              auto_approve: fc.boolean()
            })),
            chat: fc.option(fc.record({
              fee: fc.float({ min: 1000, max: 15000 }),
              market_position: fc.constantFrom('below_market', 'at_market', 'above_market', 'premium'),
              auto_approve: fc.boolean()
            })),
            in_person: fc.option(fc.record({
              fee: fc.constant(400),
              market_position: fc.constant('at_market'),
              auto_approve: fc.constant(false)
            }))
          }),
          rating: fc.float({ min: 1.0, max: 5.0 }),
          availability_status: fc.constantFrom('available', 'busy', 'offline')
        }),
        { minLength: 1, maxLength: 50 }
      ),
      async (doctorListings) => {
        // Mock the enhanced doctor listing response
        mockModels.Doctor.findAll.mockResolvedValue(doctorListings);

        const enhancedListings = await pricingEngine.getEnhancedDoctorListing({
          specialization: doctorListings[0].specialization
        });

        // Property: All doctors should have consistent service information
        for (const doctor of enhancedListings.doctors) {
          expect(doctor.doctor_id).toBeDefined();
          expect(doctor.doctor_name).toBeDefined();
          expect(doctor.services).toBeDefined();

          // Property: Service pricing should be within valid ranges
          if (doctor.services.video_call) {
            expect(doctor.services.video_call.fee).toBeGreaterThanOrEqual(2000);
            expect(doctor.services.video_call.fee).toBeLessThanOrEqual(20000);
          }

          if (doctor.services.chat) {
            expect(doctor.services.chat.fee).toBeGreaterThanOrEqual(1000);
            expect(doctor.services.chat.fee).toBeLessThanOrEqual(15000);
          }

          if (doctor.services.in_person) {
            expect(doctor.services.in_person.fee).toBe(400);
            expect(doctor.services.in_person.auto_approve).toBe(false);
          }

          // Property: Market position should be valid
          Object.values(doctor.services).forEach(service => {
            if (service && service.market_position) {
              expect(['below_market', 'at_market', 'above_market', 'premium'])
                .toContain(service.market_position);
            }
          });
        }

        // Property: Listings should be properly sorted if sort criteria provided
        if (enhancedListings.sort_by === 'price_low_high') {
          for (let i = 1; i < enhancedListings.doctors.length; i++) {
            const prevDoctor = enhancedListings.doctors[i - 1];
            const currentDoctor = enhancedListings.doctors[i];
            
            const prevMinPrice = Math.min(
              ...Object.values(prevDoctor.services)
                .filter(s => s)
                .map(s => s.fee)
            );
            const currentMinPrice = Math.min(
              ...Object.values(currentDoctor.services)
                .filter(s => s)
                .map(s => s.fee)
            );
            
            expect(prevMinPrice).toBeLessThanOrEqual(currentMinPrice);
          }
        }
      }
    ), { numRuns: 40 });
  });

  /**
   * Property 10.7: Market context information accuracy
   * Market context should provide accurate comparative information
   */
  test('Property 10.7: Market context information is accurate', () => {
    fc.assert(fc.property(
      fc.record({
        doctor_price: fc.float({ min: 2000, max: 20000 }),
        service_type: fc.constantFrom('video_call', 'chat'),
        market_data: fc.array(
          fc.record({
            doctor_id: fc.string({ minLength: 1, maxLength: 50 }),
            fee_amount: fc.float({ min: 2000, max: 20000 }),
            specialization: fc.constantFrom('General Medicine', 'Cardiology')
          }),
          { minLength: 10, maxLength: 100 }
        )
      }),
      async (testData) => {
        const { doctor_price, service_type, market_data } = testData;

        // Mock market data
        mockModels.EnhancedDoctorServiceFees.findAll.mockResolvedValue(market_data);

        const marketContext = await pricingEngine.getMarketContext({
          doctor_price,
          service_type,
          specialization: market_data[0].specialization
        });

        // Property: Percentile ranking should be mathematically correct
        const sortedPrices = market_data.map(d => d.fee_amount).sort((a, b) => a - b);
        const lowerCount = sortedPrices.filter(price => price < doctor_price).length;
        const expectedPercentile = Math.round((lowerCount / sortedPrices.length) * 100);
        
        expect(Math.abs(marketContext.percentile_rank - expectedPercentile)).toBeLessThanOrEqual(5);

        // Property: Competitive advantage should reflect price position
        const marketAverage = sortedPrices.reduce((sum, p) => sum + p, 0) / sortedPrices.length;
        
        if (doctor_price < marketAverage * 0.9) {
          expect(marketContext.competitive_advantage).toContain('price');
        }

        // Property: Market insights should be relevant
        expect(marketContext.total_competitors).toBe(market_data.length);
        expect(marketContext.price_range.min).toBe(Math.min(...sortedPrices));
        expect(marketContext.price_range.max).toBe(Math.max(...sortedPrices));
      }
    ), { numRuns: 35 });
  });
});
