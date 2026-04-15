'use strict';

/**
 * VendorIQ — Monitoring Worker
 * ==============================
 * Consumes jobs from the 'monitoring' Bull queue.
 *
 * Job payload: { monitorId, client_id }
 *
 * Pipeline:
 *   1. Load VendorMonitor + User
 *   2. Collect fresh data for vendor_cin
 *   3. Re-score with VHS engine
 *   4. Compare to monitor.last_vhs
 *   5. If score dropped ≥10 OR new hard flags → fire alerts + add to alert_history
 *   6. Update monitor.last_vhs + last_checked
 *
 * Enqueued by:
 *   - api/routes/monitors.js  POST /:id/run  (manual run)
 *   - api/cron/index.js        (nightly at 2am IST — Phase 3 cron addition)
 */

require('dotenv').config({ path: '../api/.env' });

const mongoose  = require('mongoose');
const logger    = require('../api/utils/logger');
const { createQueue }             = require('../api/config/redis');
const { VendorMonitor, User }     = require('../api/models');
const { collectData }             = require('../api/services/dataCollector');
const { calculateVHS }            = require('../api/services/scoringEngine');
const { notifyMonitorAlert }      = require('../api/services/notificationService');

const monitorQueue = createQueue('monitoring');

const CONCURRENCY        = 5;   // Monitor checks are lighter than full reports
const VHS_DROP_THRESHOLD = 10;  // Alert if VHS drops by ≥10 points

// ── Job processor ─────────────────────────────────────────────────────────

monitorQueue.process(CONCURRENCY, async (job) => {
  const { monitorId, client_id } = job.data;
  const jobLog = { monitorId, client_id, jobId: job.id };

  logger.info('Monitor check started', jobLog);
  await job.progress(5);

  // ── Step 1: Load monitor + user ────────────────────────────────────────
  const monitor = await VendorMonitor.findOne({ _id: monitorId, client_id });
  if (!monitor) {
    logger.warn('Monitor not found or wrong client', jobLog);
    return { skipped: true, reason: 'monitor_not_found' };
  }
  if (!monitor.active) {
    logger.info('Monitor inactive — skipping', jobLog);
    return { skipped: true, reason: 'inactive' };
  }

  const user = await User.findById(client_id);
  if (!user) {
    logger.warn('User not found for monitor', jobLog);
    return { skipped: true, reason: 'user_not_found' };
  }

  const cin      = monitor.vendor_cin;
  const prevVhs  = monitor.last_vhs;
  logger.info('Collecting fresh data for monitor', { ...jobLog, cin, prevVhs });
  await job.progress(15);

  // ── Step 2: Collect + score ────────────────────────────────────────────
  let rawData, scoring;
  try {
    rawData = await collectData(cin);
    await job.progress(70);
    scoring = calculateVHS(rawData);
  } catch (err) {
    logger.error('Monitor data collection failed', { ...jobLog, cin, error: err.message });
    // Don't fail the job — mark last_checked and move on
    monitor.last_checked = new Date();
    await monitor.save();
    return { success: false, reason: 'data_collection_failed', error: err.message };
  }

  const newVhs    = scoring.vhs_score;
  const newFlags  = scoring.hard_flags || [];
  await job.progress(80);

  // ── Step 3: Determine if alert needed ─────────────────────────────────
  const prevFlags  = (monitor.last_hard_flags || []).map(f => f.code);
  const addedFlags = newFlags.filter(f => !prevFlags.includes(f.code));
  const vhsDropped = prevVhs !== null && prevVhs !== undefined && (prevVhs - newVhs) >= VHS_DROP_THRESHOLD;

  const shouldAlert = (addedFlags.length > 0 || vhsDropped) && monitor.alert_config?.email;

  logger.info('Monitor check result', {
    ...jobLog, cin,
    prevVhs, newVhs,
    vhsDropped, addedFlags: addedFlags.map(f => f.code),
    shouldAlert,
  });

  // ── Step 4: Persist alert to history ──────────────────────────────────
  if (addedFlags.length > 0 || vhsDropped) {
    const alertEntry = {
      triggered_at: new Date(),
      prev_vhs:     prevVhs,
      new_vhs:      newVhs,
      reason:       vhsDropped ? 'VHS_DROP' : 'NEW_HARD_FLAG',
      flags:        addedFlags.map(f => ({ code: f.code, message: f.message })),
      notified:     false,
    };

    monitor.alert_history.push(alertEntry);
    // Keep only last 100 alerts (already handled by schema slice, but cap here too)
    if (monitor.alert_history.length > 100) {
      monitor.alert_history = monitor.alert_history.slice(-100);
    }
  }

  // ── Step 5: Update monitor state ──────────────────────────────────────
  monitor.last_vhs        = newVhs;
  monitor.last_hard_flags = newFlags;
  monitor.last_checked    = new Date();
  if (!monitor.vendor_name && rawData?.mca_data?.company_name) {
    monitor.vendor_name = rawData.mca_data.company_name;
  }
  await monitor.save();
  await job.progress(90);

  // ── Step 6: Send notifications ─────────────────────────────────────────
  if (shouldAlert) {
    // Build report URL pointing to most recent report for this CIN
    const reportUrl = `${process.env.FRONTEND_URL || 'https://vendoriq.in'}/search?cin=${cin}&name=${encodeURIComponent(monitor.vendor_name || cin)}`;

    try {
      await notifyMonitorAlert({
        userEmail:  user.email,
        userName:   user.name,
        userPhone:  monitor.alert_config?.whatsapp ? user.phone : null,
        vendorName: monitor.vendor_name || cin,
        vendorCin:  cin,
        oldVhs:     prevVhs,
        newVhs,
        newFlags:   addedFlags,
        reportUrl,
      });

      // Mark last alert as notified
      if (monitor.alert_history.length > 0) {
        monitor.alert_history[monitor.alert_history.length - 1].notified = true;
        await monitor.save();
      }
    } catch (notifyErr) {
      logger.error('Alert notification failed', { ...jobLog, error: notifyErr.message });
      // Don't throw — alert history is saved, notification just failed
    }
  }

  await job.progress(100);
  logger.info('Monitor check complete', { ...jobLog, cin, prevVhs, newVhs, alerted: shouldAlert });

  return {
    success:     true,
    cin,
    prev_vhs:    prevVhs,
    new_vhs:     newVhs,
    vhs_dropped: vhsDropped,
    new_flags:   addedFlags.map(f => f.code),
    alerted:     shouldAlert,
  };
});

// ── Queue lifecycle events ─────────────────────────────────────────────────

monitorQueue.on('completed', (job, result) => {
  if (!result?.skipped) {
    logger.info('Monitor job completed', { jobId: job.id, ...result });
  }
});

monitorQueue.on('failed', (job, err) => {
  logger.error('Monitor job failed', {
    jobId:     job.id,
    monitorId: job.data?.monitorId,
    error:     err.message,
    attempts:  job.attemptsMade,
  });
});

monitorQueue.on('stalled', (job) => {
  logger.warn('Monitor job stalled', { jobId: job.id, monitorId: job.data?.monitorId });
});

// ── DB connect + start ─────────────────────────────────────────────────────

async function startMonitoringWorker() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vendoriq', {
    serverSelectionTimeoutMS: 10000,
  });
  logger.info('Monitoring worker ready', { concurrency: CONCURRENCY, queue: 'monitoring' });
}

startMonitoringWorker().catch(err => {
  logger.error('Monitoring worker failed to start', { error: err.message });
  process.exit(1);
});

module.exports = { monitorQueue };
