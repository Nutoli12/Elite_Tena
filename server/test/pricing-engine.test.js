/**
 * Unit Tests for PricingEngine Service
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Tests: Core pricing engine functionality**
 */

import { describe, it, test, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies first
jest.unstable_mockModule('../src/models/EnhancedDoctorServiceFees.js', () => ({
  default: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.unstable_mockModule('../src/models/MarketRateAnalytics.js', () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.unstable_mockModule('../src/models/PricingAuditLog.js', () => ({
  default: {
    create: jest.fn()
  }
}));

jest.unstable_mockModule('../src/models/DoctorWalletConfig.js', () => ({
  default: {
    findOne: jest.fn()
  }
}));

jest.unstable_mockModule('../src/models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn()
  }
}));

jest.unstable_mockModule('../src/models/Notification.js', () => ({
  default: {
    create: jest.fn()
  }
}));

const PricingEngine = (await import('../src/services/PricingEngine.js')).default;
const EnhancedDoctorServiceFees = (await import('../src/models/EnhancedDoctorServiceFees.js')).default;
const MarketRateAnalytics = (await import('../src/models/MarketRateAnalytics.js')).default;
const DoctorWalletConfig = (await import('../src/models/DoctorWalletConfig.js')).default;
const User = (await import('../src/models/User.js')).default;

describe('PricingEngine Service', () => {
  let pricingEngine;

  beforeEach(() => {
    pricingEngine = new PricingEngine();
    jest.clearAllMocks();
  });

  describe('getDoctorPricing', () => {
    test('should return comprehensive pricing configuration for a doctor', async () => {
      const mockFees = [
        {
          service_type: 'video_call',
          fee_amount: 5000,
          fee_set_by: 'doctor',
          is_auto_approve: true,
          id: 'fee1',
          updated_at: new Date()
        }
      ];

      EnhancedDoctorServiceFees.findAll.mockResolvedValue(mockFees);

      const result = await pricingEngine.getDoctorPricing('doctor123');

      expect(result).toHaveProperty('doctor_id', 'doctor123');
      expect(result).toHaveProperty('services');
      expect(result.services.video_call).toEqual({
        fee: 5000,
        set_by: 'doctor',
        auto_approve: true,
        configured: true,
        id: 'fee1',
        updated_at: mockFees[0].updated_at
      });
      expect(result.services.in_person).toEqual({
        fee: 400.00,
        set_by: 'admin',
        auto_approve: false,
        configured: false
      });
    });

    test('should handle errors gracefully', async () => {
      EnhancedDoctorServiceFees.findAll.mockRejectedValue(new Error('Database error'));

      await expect(pricingEngine.getDoctorPricing('doctor123'))
        .rejects.toThrow('Failed to retrieve doctor pricing configuration');
    });
  });

  describe('validatePricingInput', () => {
    test('should validate valid premium pricing input', async () => {
      User.findOne.mockResolvedValue({
        id: 'doctor123',
        role: 'doctor',
        is_active: true
      });

      DoctorWalletConfig.findOne.mockResolvedValue({
        doctor_id: 'doctor123',
        is_verified: true,
        is_active: true
      });

      await expect(
        pricingEngine.validatePricingInput('doctor123', 'video_call', 5000)
      ).resolves.not.toThrow();
    });

    test('should reject invalid service type', async () => {
      User.findOne.mockResolvedValue({
        id: 'doctor123',
        role: 'doctor',
        is_active: true
      });

      await expect(
        pricingEngine.validatePricingInput('doctor123', 'in_person', 400)
      ).rejects.toThrow('Invalid service type for premium pricing');
    });

    test('should reject invalid fee amount', async () => {
      User.findOne.mockResolvedValue({
        id: 'doctor123',
        role: 'doctor',
        is_active: true
      });

      await expect(
        pricingEngine.validatePricingInput('doctor123', 'video_call', 1000)
      ).rejects.toThrow('Premium service fees must be between 2,000 and 20,000 ETB');
    });

    test('should reject doctor without verified wallet', async () => {
      User.findOne.mockResolvedValue({
        id: 'doctor123',
        role: 'doctor',
        is_active: true
      });

      DoctorWalletConfig.findOne.mockResolvedValue(null);

      await expect(
        pricingEngine.validatePricingInput('doctor123', 'video_call', 5000)
      ).rejects.toThrow('Doctor must have a verified wallet configuration for premium services');
    });
  });

  describe('detectSuspiciousPricing', () => {
    test('should detect pricing significantly above market average', async () => {
      User.findByPk.mockResolvedValue({
        id: 'doctor123',
        specialty: 'cardiology'
      });

      // Mock market rates
      pricingEngine.getMarketRates = jest.fn().mockResolvedValue({
        avg_rate: 4000,
        max_rate: 6000,
        doctor_count: 10
      });

      pricingEngine.getRecentPricingChanges = jest.fn().mockResolvedValue([]);

      const result = await pricingEngine.detectSuspiciousPricing('doctor123', 'video_call', 8000);

      expect(result.suspicious).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.reasons).toContain('100% above market average');
    });

    test('should not flag normal pricing', async () => {
      User.findByPk.mockResolvedValue({
        id: 'doctor123',
        specialty: 'cardiology'
      });

      pricingEngine.getMarketRates = jest.fn().mockResolvedValue({
        avg_rate: 4000,
        max_rate: 6000,
        doctor_count: 10
      });

      pricingEngine.getRecentPricingChanges = jest.fn().mockResolvedValue([]);

      const result = await pricingEngine.detectSuspiciousPricing('doctor123', 'video_call', 4500);

      expect(result.suspicious).toBe(false);
    });

    test('should flag frequent price changes', async () => {
      User.findByPk.mockResolvedValue({
        id: 'doctor123',
        specialty: 'cardiology'
      });

      pricingEngine.getMarketRates = jest.fn().mockResolvedValue({
        avg_rate: 4000,
        max_rate: 6000,
        doctor_count: 10
      });

      // Mock frequent changes
      pricingEngine.getRecentPricingChanges = jest.fn().mockResolvedValue([
        {}, {}, {}, {} // 4 recent changes
      ]);

      const result = await pricingEngine.detectSuspiciousPricing('doctor123', 'video_call', 4500);

      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('4 price changes in last 7 days');
    });
  });

  describe('calculatePercentileRank', () => {
    test('should calculate correct percentile rank', () => {
      const marketRates = {
        min_rate: 2000,
        max_rate: 8000,
        doctor_count: 10
      };

      // Test middle value
      expect(pricingEngine.calculatePercentileRank(marketRates, 5000)).toBe(50);

      // Test minimum value
      expect(pricingEngine.calculatePercentileRank(marketRates, 2000)).toBe(0);

      // Test maximum value
      expect(pricingEngine.calculatePercentileRank(marketRates, 8000)).toBe(100);

      // Test 75th percentile
      expect(pricingEngine.calculatePercentileRank(marketRates, 6500)).toBe(75);
    });

    test('should handle edge cases', () => {
      // No market data
      expect(pricingEngine.calculatePercentileRank(null, 5000)).toBeNull();

      // All fees are the same
      const uniformRates = {
        min_rate: 5000,
        max_rate: 5000,
        doctor_count: 5
      };
      expect(pricingEngine.calculatePercentileRank(uniformRates, 5000)).toBe(50);
    });
  });

  describe('isMarketDataFresh', () => {
    test('should correctly identify fresh data', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      
      expect(pricingEngine.isMarketDataFresh(recentDate, 24)).toBe(true);
    });

    test('should correctly identify stale data', () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
      
      expect(pricingEngine.isMarketDataFresh(oldDate, 24)).toBe(false);
    });
  });

  describe('cache management', () => {
    test('should cache and retrieve market rates', async () => {
      const marketData = {
        specialty: 'cardiology',
        service_type: 'video_call',
        avg_rate: 5000,
        doctor_count: 10,
        last_updated: new Date()
      };

      // Mock database calls
      MarketRateAnalytics.findOne.mockResolvedValue(null);

      pricingEngine.calculateMarketRates = jest.fn().mockResolvedValue(marketData);

      // First call should calculate and cache
      const result1 = await pricingEngine.getMarketRates('cardiology', 'video_call');
      expect(result1).toEqual(marketData);
      expect(pricingEngine.calculateMarketRates).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await pricingEngine.getMarketRates('cardiology', 'video_call');
      expect(result2).toEqual(marketData);
      expect(pricingEngine.calculateMarketRates).toHaveBeenCalledTimes(1); // Still 1
    });

    test('should invalidate cache correctly', async () => {
      User.findByPk.mockResolvedValue({
        id: 'doctor123',
        specialty: 'cardiology'
      });

      // Set up cache
      pricingEngine.cache.set('market_rates_cardiology_video_call', {
        data: { avg_rate: 5000 },
        timestamp: Date.now()
      });

      expect(pricingEngine.cache.has('market_rates_cardiology_video_call')).toBe(true);

      await pricingEngine.invalidateCache('doctor123', 'video_call');

      expect(pricingEngine.cache.has('market_rates_cardiology_video_call')).toBe(false);
    });
  });
});