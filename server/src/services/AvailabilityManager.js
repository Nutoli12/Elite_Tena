/**
 * AvailabilityManager Service
 * Manages doctor availability and schedule templates with Redis caching
 * Requirements: 2.2, 2.3, 2.4, 8.4
 */

import db from '../models/index.js';
import SlotManager from './SlotManager.js';
import RedisLockManager from './RedisLockManager.js';
import Redis from 'ioredis';
import { Op } from 'sequelize';

class AvailabilityManager {
  constructor() {
    this.slotManager = SlotManager;
    this.lockManager = RedisLockManager;
    
    // Initialize Redis cache connection
    this.cache = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    // Cache configuration
    this.cacheConfig = {
      availabilityTTL: 300, // 5 minutes for availability data
      statisticsTTL: 600,   // 10 minutes for statistics
      templateTTL: 3600,    // 1 hour for templates
      warmupDoctors: new Set() // Doctors to keep warmed up
    };
  }

  /**
   * Generate cache key for availability data
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @returns {string} Cache key
   */
  getCacheKey(doctorWalletAddress, date) {
    const dateStr = date.toISOString().split('T')[0];
    return `availability:${doctorWalletAddress}:${dateStr}`;
  }

  /**
   * Generate cache key for doctor status
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @returns {string} Cache key
   */
  getDoctorStatusCacheKey(doctorWalletAddress) {
    return `doctor_status:${doctorWalletAddress}`;
  }

  /**
   * Generate cache key for statistics
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {string} startDate - Start date string
   * @param {string} endDate - End date string
   * @returns {string} Cache key
   */
  getStatsCacheKey(doctorWalletAddress, startDate, endDate) {
    return `stats:${doctorWalletAddress}:${startDate}:${endDate}`;
  }

  /**
   * Cache availability data
   * @param {string} cacheKey - Cache key
   * @param {Object} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<void>}
   */
  async cacheAvailabilityData(cacheKey, data, ttl = this.cacheConfig.availabilityTTL) {
    try {
      await this.cache.setex(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache write error:', error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Get cached availability data
   * @param {string} cacheKey - Cache key
   * @returns {Promise<Object|null>} Cached data or null
   */
  async getCachedAvailabilityData(cacheKey) {
    try {
      const cached = await this.cache.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Invalidate cache for doctor availability
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date (optional, if not provided invalidates all dates)
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateAvailabilityCache(doctorWalletAddress, date = null) {
    try {
      let pattern;
      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        pattern = `availability:${doctorWalletAddress}:${dateStr}`;
        await this.cache.del(pattern);
        return 1;
      } else {
        pattern = `availability:${doctorWalletAddress}:*`;
        const keys = await this.cache.keys(pattern);
        if (keys.length > 0) {
          await this.cache.del(...keys);
        }
        return keys.length;
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Set doctor availability for a specific date
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @param {Object} availabilityData - Availability configuration
   * @returns {Promise<Array>} Created time slots
   */
  async setAvailability(doctorWalletAddress, date, availabilityData) {
    const lock = await this.lockManager.acquireDoctorAvailabilityLock(
      doctorWalletAddress, 
      date.toISOString().split('T')[0]
    );
    
    try {
      // Remove existing slots for the date
      await this.clearAvailability(doctorWalletAddress, date);
      
      // Create new slots based on availability data
      const slots = [];
      
      for (const period of availabilityData.availablePeriods) {
        const periodSlots = await this.slotManager.createSlots(doctorWalletAddress, {
          date: date.toISOString().split('T')[0],
          startTime: period.startTime,
          endTime: period.endTime,
          slotDuration: availabilityData.slotDuration || 30,
          bufferTime: availabilityData.bufferTime || 15,
          slotType: period.slotType || 'regular'
        });
        slots.push(...periodSlots);
      }
      
      // Reserve emergency slots if specified
      if (availabilityData.emergencySlotPercentage > 0) {
        await this.slotManager.reserveEmergencySlots(
          doctorWalletAddress,
          date,
          availabilityData.emergencySlotPercentage
        );
      }
      
      // Invalidate cache for this doctor and date
      await this.invalidateAvailabilityCache(doctorWalletAddress, date);
      
      // Cache the new availability data
      const availabilityInfo = await this.getAvailabilityFromDatabase(doctorWalletAddress, date);
      const cacheKey = this.getCacheKey(doctorWalletAddress, date);
      await this.cacheAvailabilityData(cacheKey, availabilityInfo);
      
      return slots;
    } finally {
      await lock.release();
    }
  }

  /**
   * Get doctor availability from database (without caching)
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @returns {Promise<Object>} Availability information
   */
  async getAvailabilityFromDatabase(doctorWalletAddress, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const slots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      },
      order: [['startTime', 'ASC']]
    });
    
    const availableSlots = slots.filter(slot => slot.status === 'available');
    const bookedSlots = slots.filter(slot => slot.status === 'booked');
    const blockedSlots = slots.filter(slot => slot.status === 'blocked');
    const emergencySlots = slots.filter(slot => slot.status === 'emergency_reserved');
    
    return {
      date,
      doctorWalletAddress,
      totalSlots: slots.length,
      availableSlots: availableSlots.length,
      bookedSlots: bookedSlots.length,
      blockedSlots: blockedSlots.length,
      emergencySlots: emergencySlots.length,
      lastUpdated: new Date(),
      slots: slots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        slotType: slot.slotType,
        duration: slot.duration
      }))
    };
  }

  /**
   * Get doctor availability for a date (with caching)
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @returns {Promise<Object>} Availability information
   */
  async getAvailability(doctorWalletAddress, date) {
    const cacheKey = this.getCacheKey(doctorWalletAddress, date);
    
    // Try to get from cache first
    const cached = await this.getCachedAvailabilityData(cacheKey);
    if (cached) {
      return cached;
    }
    
    // If not in cache, get from database
    const availability = await this.getAvailabilityFromDatabase(doctorWalletAddress, date);
    
    // Cache the result
    await this.cacheAvailabilityData(cacheKey, availability);
    
    return availability;
  }

  /**
   * Apply availability template to generate slots
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date to apply template
   * @param {string} templateId - Template ID (optional, uses active template if not provided)
   * @returns {Promise<Array>} Generated slots
   */
  async applyTemplate(doctorWalletAddress, date, templateId = null) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    let template;
    if (templateId) {
      template = await db.DoctorAvailabilityTemplate.findByPk(templateId);
    } else {
      template = await db.DoctorAvailabilityTemplate.findOne({
        where: {
          doctorWalletAddress,
          dayOfWeek,
          isActive: true,
          effectiveFrom: {
            [Op.lte]: date
          },
          [Op.or]: [
            { effectiveUntil: null },
            { effectiveUntil: { [Op.gte]: date } }
          ]
        }
      });
    }
    
    if (!template) {
      throw new Error(`No availability template found for ${doctorWalletAddress} on day ${dayOfWeek}`);
    }
    
    // Parse available slots from template
    const availableSlots = template.availableSlots;
    const availabilityData = {
      availablePeriods: availableSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotType: slot.type || 'regular'
      })),
      slotDuration: template.slotDuration,
      bufferTime: template.bufferTime,
      emergencySlotPercentage: template.emergencySlotPercentage
    };
    
    return await this.setAvailability(doctorWalletAddress, date, availabilityData);
  }

  /**
   * Update doctor availability in real-time
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Object} updates - Availability updates
   * @returns {Promise<Object>} Update result
   */
  async updateAvailability(doctorWalletAddress, updates) {
    const { date, action, timeRange, reason } = updates;
    
    const lock = await this.lockManager.acquireDoctorAvailabilityLock(
      doctorWalletAddress,
      date.toISOString().split('T')[0]
    );
    
    try {
      let affectedSlots = [];
      
      switch (action) {
        case 'block':
          affectedSlots = await this.slotManager.blockSlots(
            doctorWalletAddress,
            new Date(`${date.toISOString().split('T')[0]}T${timeRange.startTime}`),
            new Date(`${date.toISOString().split('T')[0]}T${timeRange.endTime}`)
          );
          break;
          
        case 'unblock':
          affectedSlots = await this.unblockSlots(
            doctorWalletAddress,
            new Date(`${date.toISOString().split('T')[0]}T${timeRange.startTime}`),
            new Date(`${date.toISOString().split('T')[0]}T${timeRange.endTime}`)
          );
          break;
          
        case 'mark_unavailable':
          await this.markDoctorUnavailable(doctorWalletAddress, date);
          break;
          
        case 'mark_available':
          await this.markDoctorAvailable(doctorWalletAddress, date);
          break;
          
        default:
          throw new Error(`Unknown availability action: ${action}`);
      }
      
      // Invalidate cache for this doctor and date
      await this.invalidateAvailabilityCache(doctorWalletAddress, date);
      
      // Update cache with fresh data
      const updatedAvailability = await this.getAvailabilityFromDatabase(doctorWalletAddress, date);
      const cacheKey = this.getCacheKey(doctorWalletAddress, date);
      await this.cacheAvailabilityData(cacheKey, updatedAvailability);
      
      return {
        success: true,
        action,
        affectedSlots: affectedSlots.length,
        reason,
        timestamp: new Date()
      };
    } finally {
      await lock.release();
    }
  }

  /**
   * Add doctor to cache warming list
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @returns {void}
   */
  addDoctorToWarmup(doctorWalletAddress) {
    this.cacheConfig.warmupDoctors.add(doctorWalletAddress);
  }

  /**
   * Remove doctor from cache warming list
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @returns {void}
   */
  removeDoctorFromWarmup(doctorWalletAddress) {
    this.cacheConfig.warmupDoctors.delete(doctorWalletAddress);
  }

  /**
   * Warm up cache for frequently accessed doctors
   * @param {number} daysAhead - Number of days ahead to warm up
   * @returns {Promise<Object>} Warmup result
   */
  async warmupCache(daysAhead = 7) {
    const results = {
      doctorsWarmedUp: 0,
      daysWarmedUp: 0,
      totalCacheEntries: 0,
      errors: []
    };
    
    const today = new Date();
    
    for (const doctorWalletAddress of this.cacheConfig.warmupDoctors) {
      try {
        for (let i = 0; i < daysAhead; i++) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + i);
          
          // Pre-load availability data into cache
          await this.getAvailability(doctorWalletAddress, targetDate);
          results.totalCacheEntries++;
        }
        
        results.doctorsWarmedUp++;
        results.daysWarmedUp = daysAhead;
      } catch (error) {
        results.errors.push({
          doctorWalletAddress,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStatistics() {
    try {
      const availabilityKeys = await this.cache.keys('availability:*');
      const statusKeys = await this.cache.keys('doctor_status:*');
      const statsKeys = await this.cache.keys('stats:*');
      
      return {
        totalKeys: availabilityKeys.length + statusKeys.length + statsKeys.length,
        availabilityKeys: availabilityKeys.length,
        statusKeys: statusKeys.length,
        statsKeys: statsKeys.length,
        warmupDoctors: this.cacheConfig.warmupDoctors.size
      };
    } catch (error) {
      console.error('Cache statistics error:', error);
      return {
        totalKeys: 0,
        availabilityKeys: 0,
        statusKeys: 0,
        statsKeys: 0,
        warmupDoctors: 0
      };
    }
  }

  /**
   * Clear all availability for a doctor on a specific date
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @returns {Promise<number>} Number of deleted slots
   */
  async clearAvailability(doctorWalletAddress, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const deletedCount = await db.TimeSlot.destroy({
      where: {
        doctorWalletAddress,
        startTime: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        },
        status: {
          [Op.in]: ['available', 'blocked', 'emergency_reserved']
        }
      }
    });
    
    return deletedCount;
  }

  /**
   * Unblock time slots
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Promise<Array>} Unblocked slots
   */
  async unblockSlots(doctorWalletAddress, startTime, endTime) {
    const slots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [Op.gte]: startTime
        },
        endTime: {
          [Op.lte]: endTime
        },
        status: 'blocked'
      }
    });
    
    const unblockedSlots = [];
    for (const slot of slots) {
      await slot.update({
        status: 'available',
        isBookable: true
      });
      unblockedSlots.push(slot);
    }
    
    return unblockedSlots;
  }

  /**
   * Mark doctor as unavailable for entire day
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @returns {Promise<number>} Number of affected slots
   */
  async markDoctorUnavailable(doctorWalletAddress, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [affectedRows] = await db.TimeSlot.update(
      {
        status: 'blocked',
        isBookable: false
      },
      {
        where: {
          doctorWalletAddress,
          startTime: {
            [Op.gte]: startOfDay,
            [Op.lte]: endOfDay
          },
          status: 'available'
        }
      }
    );
    
    return affectedRows;
  }

  /**
   * Mark doctor as available for entire day
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @returns {Promise<number>} Number of affected slots
   */
  async markDoctorAvailable(doctorWalletAddress, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [affectedRows] = await db.TimeSlot.update(
      {
        status: 'available',
        isBookable: true
      },
      {
        where: {
          doctorWalletAddress,
          startTime: {
            [Op.gte]: startOfDay,
            [Op.lte]: endOfDay
          },
          status: 'blocked'
        }
      }
    );
    
    return affectedRows;
  }

  /**
   * Get availability statistics for a doctor (with caching)
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Availability statistics
   */
  async getAvailabilityStatistics(doctorWalletAddress, startDate, endDate) {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const cacheKey = this.getStatsCacheKey(doctorWalletAddress, startDateStr, endDateStr);
    
    // Try to get from cache first
    const cached = await this.getCachedAvailabilityData(cacheKey);
    if (cached) {
      return cached;
    }
    
    // If not in cache, calculate from database
    const slots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });
    
    const stats = {
      doctorWalletAddress,
      startDate: startDateStr,
      endDate: endDateStr,
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.status === 'available').length,
      bookedSlots: slots.filter(s => s.status === 'booked').length,
      blockedSlots: slots.filter(s => s.status === 'blocked').length,
      emergencySlots: slots.filter(s => s.status === 'emergency_reserved').length,
      utilizationRate: 0,
      availabilityRate: 0,
      generatedAt: new Date()
    };
    
    if (stats.totalSlots > 0) {
      stats.utilizationRate = (stats.bookedSlots / stats.totalSlots) * 100;
      stats.availabilityRate = (stats.availableSlots / stats.totalSlots) * 100;
    }
    
    // Cache the statistics
    await this.cacheAvailabilityData(cacheKey, stats, this.cacheConfig.statisticsTTL);
    
    return stats;
  }

  /**
   * Generate availability for multiple days using templates
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Generation result
   */
  async generateAvailabilityFromTemplates(doctorWalletAddress, startDate, endDate) {
    const results = {
      generatedDays: 0,
      totalSlots: 0,
      skippedDays: [],
      errors: []
    };
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      try {
        const slots = await this.applyTemplate(doctorWalletAddress, new Date(currentDate));
        results.generatedDays++;
        results.totalSlots += slots.length;
        
        // Invalidate cache for the generated date
        await this.invalidateAvailabilityCache(doctorWalletAddress, new Date(currentDate));
      } catch (error) {
        results.skippedDays.push({
          date: new Date(currentDate),
          reason: error.message
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return results;
  }

  /**
   * Clean up expired cache entries
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredCache() {
    try {
      const allKeys = await this.cache.keys('availability:*');
      let expiredCount = 0;
      
      for (const key of allKeys) {
        const ttl = await this.cache.ttl(key);
        if (ttl === -1) { // No TTL set, remove it
          await this.cache.del(key);
          expiredCount++;
        }
      }
      
      return {
        success: true,
        totalKeys: allKeys.length,
        expiredKeys: expiredCount,
        cleanedAt: new Date()
      };
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return {
        success: false,
        error: error.message,
        cleanedAt: new Date()
      };
    }
  }

  /**
   * Flush all availability cache
   * @returns {Promise<Object>} Flush result
   */
  async flushAvailabilityCache() {
    try {
      const availabilityKeys = await this.cache.keys('availability:*');
      const statusKeys = await this.cache.keys('doctor_status:*');
      const statsKeys = await this.cache.keys('stats:*');
      
      const allKeys = [...availabilityKeys, ...statusKeys, ...statsKeys];
      
      if (allKeys.length > 0) {
        await this.cache.del(...allKeys);
      }
      
      return {
        success: true,
        deletedKeys: allKeys.length,
        flushedAt: new Date()
      };
    } catch (error) {
      console.error('Cache flush error:', error);
      return {
        success: false,
        error: error.message,
        flushedAt: new Date()
      };
    }
  }

  /**
   * Health check for cache system
   * @returns {Promise<Object>} Health status
   */
  async cacheHealthCheck() {
    try {
      const start = Date.now();
      
      // Test basic operations
      const testKey = 'health_check_test';
      const testData = { timestamp: new Date(), test: true };
      
      await this.cache.setex(testKey, 10, JSON.stringify(testData));
      const retrieved = await this.cache.get(testKey);
      await this.cache.del(testKey);
      
      const responseTime = Date.now() - start;
      
      const isHealthy = retrieved && JSON.parse(retrieved).test === true;
      
      return {
        healthy: isHealthy,
        responseTime,
        timestamp: new Date(),
        cacheConfig: {
          availabilityTTL: this.cacheConfig.availabilityTTL,
          statisticsTTL: this.cacheConfig.statisticsTTL,
          templateTTL: this.cacheConfig.templateTTL,
          warmupDoctors: this.cacheConfig.warmupDoctors.size
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Close cache connection
   * @returns {Promise<void>}
   */
  async closeCache() {
    try {
      await this.cache.quit();
    } catch (error) {
      console.error('Cache close error:', error);
    }
  }
}

export default new AvailabilityManager();