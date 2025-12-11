/**
 * ConcurrencyManager Service
 * Handles concurrent booking requests and race condition prevention
 * Requirements: 1.1, 1.2, 8.1
 */

import SlotManager from './SlotManager.js';
import db from '../models/index.js';

// Try to use Redis, fallback to Mock if Redis is not available
let lockManager;
try {
  const RedisLockManager = await import('./RedisLockManager.js');
  lockManager = RedisLockManager.default;
  console.log('✅ Using Redis Lock Manager');
} catch (error) {
  console.log('⚠️  Redis not available, using Mock Lock Manager');
  const MockRedisLockManager = await import('./MockRedisLockManager.js');
  lockManager = MockRedisLockManager.default;
}

class ConcurrencyManager {
  constructor() {
    this.lockManager = lockManager;
    this.slotManager = SlotManager;
    this.maxConcurrentBookings = 10; // Maximum concurrent booking attempts to handle
    this.bookingTimeout = 15000; // 15 seconds timeout for booking operations
  }

  /**
   * Acquire slot lock with retry mechanism
   * @param {string} slotId - Time slot ID
   * @param {number} timeout - Lock timeout
   * @returns {Promise<Object>} Lock object
   */
  async acquireSlotLock(slotId, timeout = this.bookingTimeout) {
    try {
      return await this.lockManager.acquireSlotLock(slotId, timeout);
    } catch (error) {
      throw new Error(`Failed to acquire slot lock: ${error.message}`);
    }
  }

  /**
   * Release lock safely
   * @param {Object} lock - Lock object
   * @returns {Promise<boolean>} Release success status
   */
  async releaseLock(lock) {
    try {
      return await lock.release();
    } catch (error) {
      console.error('Failed to release lock:', error);
      return false;
    }
  }

  /**
   * Execute atomic booking operation with distributed locking
   * @param {Object} bookingOperation - Booking operation details
   * @returns {Promise<Object>} Booking result
   */
  async executeAtomicBooking(bookingOperation) {
    const { slotId, appointmentData } = bookingOperation;
    
    return await this.lockManager.executeAtomicSlotBooking(slotId, async () => {
      // Double-check slot availability within the lock
      const slot = await db.TimeSlot.findByPk(slotId);
      
      if (!slot) {
        throw new Error('Time slot not found');
      }
      
      if (!slot.isAvailable()) {
        throw new Error('Time slot is no longer available');
      }
      
      // Execute the actual booking
      return await this.slotManager.bookSlot(slotId, appointmentData);
    });
  }

  /**
   * Handle multiple concurrent booking requests
   * @param {Array} bookingRequests - Array of booking request objects
   * @returns {Promise<Array>} Array of booking results
   */
  async handleConcurrentBookings(bookingRequests) {
    // Limit concurrent processing
    const batches = this.createBatches(bookingRequests, this.maxConcurrentBookings);
    const allResults = [];
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (request) => {
        try {
          const result = await this.executeAtomicBooking(request);
          return {
            success: true,
            requestId: request.requestId,
            slotId: request.slotId,
            result
          };
        } catch (error) {
          return {
            success: false,
            requestId: request.requestId,
            slotId: request.slotId,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
    }
    
    return allResults;
  }

  /**
   * Handle concurrent booking attempts for the same slot
   * @param {string} slotId - Time slot ID
   * @param {Array} appointmentDataArray - Array of appointment data
   * @returns {Promise<Object>} Booking results with winner and losers
   */
  async handleSlotConflict(slotId, appointmentDataArray) {
    const bookingPromises = appointmentDataArray.map(async (appointmentData, index) => {
      try {
        const result = await this.executeAtomicBooking({
          slotId,
          appointmentData: {
            ...appointmentData,
            requestId: `req_${index}_${Date.now()}`
          }
        });
        
        return {
          success: true,
          index,
          appointmentData,
          result
        };
      } catch (error) {
        return {
          success: false,
          index,
          appointmentData,
          error: error.message
        };
      }
    });
    
    const results = await Promise.all(bookingPromises);
    
    const winner = results.find(r => r.success);
    const losers = results.filter(r => !r.success);
    
    return {
      slotId,
      winner,
      losers,
      totalAttempts: results.length,
      successfulBookings: winner ? 1 : 0
    };
  }

  /**
   * Validate booking request before processing
   * @param {Object} bookingRequest - Booking request
   * @returns {Object} Validation result
   */
  validateBookingRequest(bookingRequest) {
    const { slotId, appointmentData } = bookingRequest;
    const errors = [];
    
    if (!slotId) {
      errors.push('Slot ID is required');
    }
    
    if (!appointmentData) {
      errors.push('Appointment data is required');
    } else {
      if (!appointmentData.patientWalletAddress) {
        errors.push('Patient wallet address is required');
      }
      
      if (!appointmentData.reason) {
        errors.push('Appointment reason is required');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process booking with conflict detection and resolution
   * @param {Object} bookingRequest - Booking request
   * @returns {Promise<Object>} Processing result
   */
  async processBookingWithConflictResolution(bookingRequest) {
    // Validate request
    const validation = this.validateBookingRequest(bookingRequest);
    if (!validation.valid) {
      throw new Error(`Invalid booking request: ${validation.errors.join(', ')}`);
    }
    
    const { slotId, appointmentData } = bookingRequest;
    
    try {
      // Check for existing conflicts
      const isLocked = await this.lockManager.isLocked(`slot:${slotId}`);
      
      if (isLocked) {
        // Wait briefly and retry
        await this.sleep(100);
        
        // Check if slot is still available after wait
        const slot = await db.TimeSlot.findByPk(slotId);
        if (!slot || !slot.isAvailable()) {
          throw new Error('Slot became unavailable due to concurrent booking');
        }
      }
      
      // Execute atomic booking
      return await this.executeAtomicBooking(bookingRequest);
      
    } catch (error) {
      // Suggest alternative slots on failure
      const alternatives = await this.suggestAlternativeSlots(
        appointmentData.doctorWalletAddress || bookingRequest.doctorWalletAddress,
        slotId
      );
      
      throw new Error(`Booking failed: ${error.message}. Alternative slots available: ${alternatives.length}`);
    }
  }

  /**
   * Suggest alternative slots when booking fails
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {string} failedSlotId - Failed slot ID
   * @returns {Promise<Array>} Alternative slots
   */
  async suggestAlternativeSlots(doctorWalletAddress, failedSlotId) {
    try {
      const failedSlot = await db.TimeSlot.findByPk(failedSlotId);
      if (!failedSlot) return [];
      
      const slotDate = new Date(failedSlot.startTime);
      const availableSlots = await this.slotManager.getAvailableSlots(doctorWalletAddress, slotDate);
      
      // Return up to 5 alternative slots
      return availableSlots.slice(0, 5).map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.duration
      }));
    } catch (error) {
      console.error('Error suggesting alternative slots:', error);
      return [];
    }
  }

  /**
   * Monitor concurrent booking performance
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date to monitor
   * @returns {Promise<Object>} Performance metrics
   */
  async getBookingPerformanceMetrics(doctorWalletAddress, date) {
    try {
      const lockStats = await this.lockManager.getLockStatistics();
      const slotStats = await this.slotManager.getSlotStatistics(doctorWalletAddress, date);
      
      return {
        lockStatistics: lockStats,
        slotStatistics: slotStats,
        concurrencyLevel: lockStats.slotLocks,
        utilizationRate: slotStats.utilizationRate,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return null;
    }
  }

  /**
   * Cleanup stale locks and resources
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanup() {
    try {
      const cleanedLocks = await this.lockManager.cleanupExpiredLocks();
      
      return {
        cleanedLocks,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { cleanedLocks: 0, error: error.message };
    }
  }

  /**
   * Create batches from array for controlled concurrent processing
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array} Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sleep utility function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for concurrency manager
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const redisHealth = await this.lockManager.healthCheck();
      const lockStats = await this.lockManager.getLockStatistics();
      
      return {
        healthy: redisHealth,
        redisConnection: redisHealth,
        activeLocks: lockStats.totalLocks,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

export default new ConcurrencyManager();