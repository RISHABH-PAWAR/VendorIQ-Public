const Redis = require('ioredis');
const logger = require('../utils/logger');

// ─── Redis client ──────────────────────────────────────────────────────────────
// Uses REDIS_URL in dev (local Docker) or Upstash URL in production
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null; // Stop retrying after 5 attempts
    return Math.min(times * 200, 2000);
  },
  enableOfflineQueue: false,
  lazyConnect: true,
});

redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('error', (err) => logger.error('Redis client error', { error: err.message }));
redisClient.on('close', () => logger.warn('Redis connection closed'));

// ─── Cache helpers ─────────────────────────────────────────────────────────────

/**
 * Get cached value. Returns parsed JSON or null on miss/error.
 */
async function getCached(key) {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (err) {
    logger.warn('Cache get failed', { key, error: err.message });
    return null;
  }
}

/**
 * Set cached value with TTL in seconds.
 */
async function setCached(key, value, ttlSeconds) {
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Cache set failed', { key, error: err.message });
    // Never throw — cache failures are non-fatal
  }
}

/**
 * Delete a cached key.
 */
async function deleteCached(key) {
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.warn('Cache delete failed', { key, error: err.message });
  }
}

/**
 * Invalidate all cache keys for a given CIN.
 * Deletes: vendor:{cin}:rawdata, vendor:{cin}:vhs, courts:{cin}:data, etc.
 */
async function invalidateVendorCache(cin) {
  try {
    const patterns = [
      `vendor:${cin}:rawdata`,
      `vendor:${cin}:vhs`,
      `courts:${cin}:data`,
      `nclt:${cin}:data`,
      `sebi:${cin}:data`,
      `sandbox:mca:${cin}`,
      `sandbox:directors:${cin}`,
      `sandbox:charges:${cin}`,
    ];
    if (patterns.length > 0) {
      await redisClient.del(...patterns);
    }
    logger.info('Vendor cache invalidated', { cin, keys: patterns.length });
  } catch (err) {
    logger.warn('Cache invalidation failed', { cin, error: err.message });
  }
}

// ─── Bull queue factory ────────────────────────────────────────────────────────
/**
 * Create a Bull queue connected to the same Redis instance.
 * @param {string} name - Queue name (e.g., 'report', 'bulk-audit', 'monitoring')
 */
function createQueue(name) {
  const Bull = require('bull');
  return new Bull(name, {
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    defaultJobOptions: {
      removeOnComplete: 100,  // Keep last 100 completed jobs
      removeOnFail: 500,      // Keep last 500 failed jobs for debugging
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });
}

module.exports = {
  redisClient,
  getCached,
  setCached,
  deleteCached,
  invalidateVendorCache,
  createQueue,
};
