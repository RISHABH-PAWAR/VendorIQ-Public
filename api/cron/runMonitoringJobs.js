'use strict';

/**
 * VendorIQ — Nightly Monitoring Dispatch
 * =========================================
 * Runs nightly at 02:00 IST.
 * Queries all active VendorMonitors and enqueues each one into
 * the 'monitoring' Bull queue for processing by monitoringWorker.js
 *
 * Staggered with 500ms delay per job to avoid hammering Sandbox API.
 */

const logger        = require('../utils/logger');
const VendorMonitor = require('../models/VendorMonitor');
const { createQueue } = require('../config/redis');

const monitorQueue = createQueue('monitoring');

const STAGGER_MS = 500; // 500ms between jobs = max 100 monitors in ~50s

async function enqueueMonitoringJobs() {
  logger.info('Monitoring cron: starting dispatch');

  // Find all active monitors — no client_id filter; this is a system-level sweep
  const monitors = await VendorMonitor.find({ active: true })
    .select('_id client_id vendor_cin vendor_name last_checked')
    .lean();

  if (monitors.length === 0) {
    logger.info('Monitoring cron: no active monitors found');
    return { enqueued: 0, skipped: 0 };
  }

  logger.info('Monitoring cron: found active monitors', { count: monitors.length });

  let enqueued = 0;
  let skipped  = 0;

  for (let i = 0; i < monitors.length; i++) {
    const monitor = monitors[i];
    try {
      const jobId = `monitor_${monitor._id}_${new Date().toISOString().split('T')[0]}`;

      // Skip if already queued today (idempotent by jobId)
      const existing = await monitorQueue.getJob(jobId);
      if (existing) {
        skipped++;
        continue;
      }

      await monitorQueue.add(
        { monitorId: monitor._id.toString(), client_id: monitor.client_id.toString() },
        {
          jobId,
          attempts:  2,
          backoff:   { type: 'fixed', delay: 60000 },
          delay:     i * STAGGER_MS, // Stagger start times
          timeout:   180000,         // 3 min per monitor
          removeOnComplete: { age: 86400 }, // Keep 24h
          removeOnFail:     { age: 86400 },
        },
      );
      enqueued++;
    } catch (err) {
      logger.error('Failed to enqueue monitor', {
        monitorId: monitor._id,
        cin:       monitor.vendor_cin,
        error:     err.message,
      });
      skipped++;
    }
  }

  logger.info('Monitoring cron: dispatch complete', { enqueued, skipped, total: monitors.length });
  return { enqueued, skipped, total: monitors.length };
}

module.exports = { enqueueMonitoringJobs };
