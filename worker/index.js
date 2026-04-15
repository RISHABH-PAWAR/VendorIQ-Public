'use strict';

/**
 * VendorIQ — Worker Launcher
 * ============================
 * Starts all three Bull queue workers in one process.
 * Each worker connects to MongoDB and Redis independently.
 *
 * Queues:
 *   report     → reportWorker.js     (Phase 2) concurrency=3
 *   monitoring → monitoringWorker.js (Phase 3) concurrency=5
 *   bulk-audit → bulkAuditWorker.js  (Phase 3) concurrency=3
 *
 * Run: node worker/index.js
 */

require('dotenv').config({ path: '../api/.env' });
const logger = require('../api/utils/logger');

logger.info('VendorIQ Worker starting…', {
  pid: process.pid,
  node: process.version,
  env: process.env.NODE_ENV,
});

// Start all workers — each file self-starts on require
require('./reportWorker');
require('./monitoringWorker');
require('./bulkAuditWorker');

logger.info('All 3 workers initialised', {
  workers: ['reportWorker', 'monitoringWorker', 'bulkAuditWorker'],
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`Worker received ${signal} — shutting down gracefully`);
  // Bull queues drain themselves; mongoose disconnect
  try {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception in worker', { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection in worker', { reason: String(reason) });
});
