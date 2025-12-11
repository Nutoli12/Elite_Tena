/**
 * Mock Redis Lock Manager - For development without Redis
 * This is a temporary fallback that simulates Redis locking in memory
 * WARNING: This is NOT suitable for production use!
 */

class MockRedisLockManager {
  constructor() {
    this.locks = new Map();
    this.lockTimeouts = new Map();
  }

  /**
   * Acquire a distributed lock (mocked in memory)
   * @param {string} key - Lock key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Lock acquired
   */
  async acquireLock(key, ttl = 30) {
    console.log(`[MOCK REDIS] Attempting to acquire lock: ${key}`);
    
    if (this.locks.has(key)) {
      console.log(`[MOCK REDIS] Lock ${key} already exists`);
      return false;
    }
    
    // Set the lock
    this.locks.set(key, {
      acquiredAt: Date.now(),
      ttl: ttl * 1000
    });
    
    // Set auto-expiry
    const timeout = setTimeout(() => {
      this.locks.delete(key);
      this.lockTimeouts.delete(key);
      console.log(`[MOCK REDIS] Lock ${key} auto-expired`);
    }, ttl * 1000);
    
    this.lockTimeouts.set(key, timeout);
    
    console.log(`[MOCK REDIS] Lock ${key} acquired for ${ttl}s`);
    return true;
  }

  /**
   * Release a distributed lock
   * @param {string} key - Lock key
   * @returns {Promise<boolean>} Lock released
   */
  async releaseLock(key) {
    console.log(`[MOCK REDIS] Attempting to release lock: ${key}`);
    
    if (!this.locks.has(key)) {
      console.log(`[MOCK REDIS] Lock ${key} does not exist`);
      return false;
    }
    
    // Clear timeout
    const timeout = this.lockTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.lockTimeouts.delete(key);
    }
    
    // Remove lock
    this.locks.delete(key);
    
    console.log(`[MOCK REDIS] Lock ${key} released`);
    return true;
  }

  /**
   * Check if lock exists
   * @param {string} key - Lock key
   * @returns {Promise<boolean>} Lock exists
   */
  async hasLock(key) {
    return this.locks.has(key);
  }

  /**
   * Get lock info
   * @param {string} key - Lock key
   * @returns {Promise<Object|null>} Lock info
   */
  async getLockInfo(key) {
    const lock = this.locks.get(key);
    if (!lock) return null;
    
    return {
      key,
      acquiredAt: lock.acquiredAt,
      ttl: lock.ttl,
      remainingTime: Math.max(0, (lock.acquiredAt + lock.ttl) - Date.now())
    };
  }

  /**
   * Clean up expired locks
   * @returns {Promise<number>} Number of cleaned locks
   */
  async cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, lock] of this.locks.entries()) {
      if (now > lock.acquiredAt + lock.ttl) {
        this.locks.delete(key);
        const timeout = this.lockTimeouts.get(key);
        if (timeout) {
          clearTimeout(timeout);
          this.lockTimeouts.delete(key);
        }
        cleaned++;
        console.log(`[MOCK REDIS] Cleaned expired lock: ${key}`);
      }
    }
    
    return cleaned;
  }

  /**
   * Get all active locks
   * @returns {Promise<Array>} Active locks
   */
  async getActiveLocks() {
    const locks = [];
    const now = Date.now();
    
    for (const [key, lock] of this.locks.entries()) {
      if (now <= lock.acquiredAt + lock.ttl) {
        locks.push({
          key,
          acquiredAt: lock.acquiredAt,
          ttl: lock.ttl,
          remainingTime: (lock.acquiredAt + lock.ttl) - now
        });
      }
    }
    
    return locks;
  }

  /**
   * Clear all locks (for testing)
   * @returns {Promise<void>}
   */
  async clearAllLocks() {
    console.log(`[MOCK REDIS] Clearing all ${this.locks.size} locks`);
    
    // Clear all timeouts
    for (const timeout of this.lockTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    this.locks.clear();
    this.lockTimeouts.clear();
  }

  /**
   * Get connection status (always connected for mock)
   * @returns {Promise<boolean>} Connection status
   */
  async isConnected() {
    return true;
  }

  /**
   * Get stats
   * @returns {Promise<Object>} Stats
   */
  async getStats() {
    return {
      type: 'mock',
      activeLocks: this.locks.size,
      totalAcquired: 0, // Not tracked in mock
      totalReleased: 0, // Not tracked in mock
      averageLockTime: 0 // Not tracked in mock
    };
  }
}

export default new MockRedisLockManager();