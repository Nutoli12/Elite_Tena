/**
 * Redis-based Distributed Lock Manager
 * Handles distributed locking for concurrent slot booking
 * Requirements: 1.1, 1.2, 8.1
 */

import Redis from 'ioredis';

class RedisLockManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.lockTimeout = 30000; // 30 seconds default timeout
    this.retryDelay = 100; // 100ms retry delay
    this.maxRetries = 50; // Maximum retry attempts
  }

  /**
   * Acquire a distributed lock
   * @param {string} lockKey - Unique lock identifier
   * @param {number} timeout - Lock timeout in milliseconds
   * @returns {Promise<Object>} Lock object with release method
   */
  async acquireLock(lockKey, timeout = this.lockTimeout) {
    const lockId = `lock:${lockKey}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const expireTime = Math.ceil(timeout / 1000);
    
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        // Try to acquire lock using SET with NX and EX options
        const result = await this.redis.set(lockId, lockValue, 'PX', timeout, 'NX');
        
        if (result === 'OK') {
          return {
            lockId,
            lockValue,
            acquired: true,
            release: () => this.releaseLock(lockId, lockValue)
          };
        }
        
        // Lock not acquired, wait and retry
        await this.sleep(this.retryDelay);
        retries++;
        
      } catch (error) {
        console.error('Redis lock acquisition error:', error);
        throw new Error(`Failed to acquire lock: ${error.message}`);
      }
    }
    
    throw new Error(`Failed to acquire lock after ${this.maxRetries} retries`);
  }

  /**
   * Release a distributed lock
   * @param {string} lockId - Lock identifier
   * @param {string} lockValue - Lock value for verification
   * @returns {Promise<boolean>} Success status
   */
  async releaseLock(lockId, lockValue) {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    try {
      const result = await this.redis.eval(script, 1, lockId, lockValue);
      return result === 1;
    } catch (error) {
      console.error('Redis lock release error:', error);
      return false;
    }
  }

  /**
   * Acquire slot-specific lock
   * @param {string} slotId - Time slot ID
   * @param {number} timeout - Lock timeout
   * @returns {Promise<Object>} Lock object
   */
  async acquireSlotLock(slotId, timeout = this.lockTimeout) {
    const lockKey = `slot:${slotId}`;
    return await this.acquireLock(lockKey, timeout);
  }

  /**
   * Acquire doctor availability lock
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {number} timeout - Lock timeout
   * @returns {Promise<Object>} Lock object
   */
  async acquireDoctorAvailabilityLock(doctorWalletAddress, date, timeout = this.lockTimeout) {
    const lockKey = `doctor:${doctorWalletAddress}:${date}`;
    return await this.acquireLock(lockKey, timeout);
  }

  /**
   * Check if a lock exists
   * @param {string} lockKey - Lock key
   * @returns {Promise<boolean>} Lock existence status
   */
  async isLocked(lockKey) {
    try {
      const result = await this.redis.exists(`lock:${lockKey}`);
      return result === 1;
    } catch (error) {
      console.error('Redis lock check error:', error);
      return false;
    }
  }

  /**
   * Get lock TTL (time to live)
   * @param {string} lockKey - Lock key
   * @returns {Promise<number>} TTL in milliseconds, -1 if no TTL, -2 if key doesn't exist
   */
  async getLockTTL(lockKey) {
    try {
      const ttl = await this.redis.pttl(`lock:${lockKey}`);
      return ttl;
    } catch (error) {
      console.error('Redis TTL check error:', error);
      return -2;
    }
  }

  /**
   * Extend lock timeout
   * @param {string} lockId - Lock identifier
   * @param {string} lockValue - Lock value for verification
   * @param {number} additionalTime - Additional time in milliseconds
   * @returns {Promise<boolean>} Success status
   */
  async extendLock(lockId, lockValue, additionalTime) {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    
    try {
      const result = await this.redis.eval(script, 1, lockId, lockValue, additionalTime);
      return result === 1;
    } catch (error) {
      console.error('Redis lock extension error:', error);
      return false;
    }
  }

  /**
   * Execute operation with automatic lock management
   * @param {string} lockKey - Lock key
   * @param {Function} operation - Operation to execute
   * @param {number} timeout - Lock timeout
   * @returns {Promise<any>} Operation result
   */
  async withLock(lockKey, operation, timeout = this.lockTimeout) {
    const lock = await this.acquireLock(lockKey, timeout);
    
    try {
      const result = await operation();
      return result;
    } finally {
      await lock.release();
    }
  }

  /**
   * Execute slot booking with lock
   * @param {string} slotId - Slot ID
   * @param {Function} bookingOperation - Booking operation
   * @returns {Promise<any>} Booking result
   */
  async executeAtomicSlotBooking(slotId, bookingOperation) {
    return await this.withLock(`slot:${slotId}`, bookingOperation, 10000); // 10 second timeout for booking
  }

  /**
   * Cleanup expired locks (maintenance function)
   * @returns {Promise<number>} Number of cleaned locks
   */
  async cleanupExpiredLocks() {
    try {
      const lockKeys = await this.redis.keys('lock:*');
      let cleanedCount = 0;
      
      for (const key of lockKeys) {
        const ttl = await this.redis.pttl(key);
        if (ttl === -1) { // No TTL set, remove it
          await this.redis.del(key);
          cleanedCount++;
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Lock cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get lock statistics
   * @returns {Promise<Object>} Lock statistics
   */
  async getLockStatistics() {
    try {
      const lockKeys = await this.redis.keys('lock:*');
      const stats = {
        totalLocks: lockKeys.length,
        slotLocks: lockKeys.filter(key => key.includes('slot:')).length,
        doctorLocks: lockKeys.filter(key => key.includes('doctor:')).length,
        otherLocks: 0
      };
      
      stats.otherLocks = stats.totalLocks - stats.slotLocks - stats.doctorLocks;
      
      return stats;
    } catch (error) {
      console.error('Lock statistics error:', error);
      return { totalLocks: 0, slotLocks: 0, doctorLocks: 0, otherLocks: 0 };
    }
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
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    await this.redis.quit();
  }

  /**
   * Health check for Redis connection
   * @returns {Promise<boolean>} Connection status
   */
  async healthCheck() {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

export default new RedisLockManager();