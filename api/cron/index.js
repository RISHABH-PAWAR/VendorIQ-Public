'use strict';

/**
 * VendorIQ — Cron Scheduler (Master)
 * Schedule summary (all IST):
 *   Daily    00:00  → refreshSEBIOrders
 *   Weekly   Sun 01:00 → refreshSFIOWatchlist
 *   Weekly   Mon 02:00 → refreshGeMBlacklist
 *   Monthly  1st 03:00 → downloadDINCSV
 *   Quarterly 1st 04:00 → downloadRBIDefaulters
 *   Nightly   02:00      → enqueueMonitoringJobs
 */

const cron   = require('node-cron');
const logger = require('../utils/logger');

const { refreshSEBIOrders }     = require('./refreshSEBIOrders');
const { refreshSFIOWatchlist }  = require('./refreshSFIOWatchlist');
const { refreshGeMBlacklist }   = require('./refreshGeMBlacklist');
const { downloadDINCSV }        = require('./downloadDINCSV');
const { downloadRBIDefaulters } = require('./downloadRBIDefaulters');
const { enqueueMonitoringJobs }  = require('./runMonitoringJobs');

const jobStatus = {
  sebi:    { last_run: null, last_result: null, last_error: null, running: false },
  sfio:    { last_run: null, last_result: null, last_error: null, running: false },
  gem:     { last_run: null, last_result: null, last_error: null, running: false },
  din_csv: { last_run: null, last_result: null, last_error: null, running: false },
  rbi:        { last_run: null, last_result: null, last_error: null, running: false },
  monitoring: { last_run: null, last_result: null, last_error: null, running: false },
};

async function runJob(name, fn) {
  if (jobStatus[name].running) {
    logger.warn('Cron job already running — skipping', { job: name });
    return;
  }
  jobStatus[name].running  = true;
  jobStatus[name].last_run = new Date();
  logger.info('Cron job started', { job: name });
  try {
    const result = await fn();
    jobStatus[name].last_result = result;
    jobStatus[name].last_error  = null;
    logger.info('Cron job complete', { job: name, result });
  } catch (err) {
    jobStatus[name].last_error = err.message;
    logger.error('Cron job failed', { job: name, error: err.message });
  } finally {
    jobStatus[name].running = false;
  }
}

function getCronHealth() {
  return Object.entries(jobStatus).reduce((acc, [name, s]) => {
    acc[name] = {
      last_run:   s.last_run?.toISOString() || 'never',
      hours_ago:  s.last_run ? Math.round((Date.now() - s.last_run) / 3600000) : null,
      last_error: s.last_error,
      running:    s.running,
      status:     s.last_error ? 'error' : s.last_run ? 'ok' : 'pending',
    };
    return acc;
  }, {});
}

function startCronJobs() {
  logger.info('Registering cron jobs...');

  // Daily 00:00 IST
  cron.schedule('0 18 * * *',      () => runJob('sebi',    refreshSEBIOrders),     { timezone: 'Asia/Kolkata' });
  // Weekly Sunday 01:00 IST
  cron.schedule('0 1 * * 0',       () => runJob('sfio',    refreshSFIOWatchlist),  { timezone: 'Asia/Kolkata' });
  // Weekly Monday 02:00 IST
  cron.schedule('0 2 * * 1',       () => runJob('gem',     refreshGeMBlacklist),   { timezone: 'Asia/Kolkata' });
  // Monthly 1st 03:00 IST
  cron.schedule('0 3 1 * *',       () => runJob('din_csv', downloadDINCSV),        { timezone: 'Asia/Kolkata' });
  // Quarterly 1st 04:00 IST
  cron.schedule('0 4 1 1,4,7,10 *',() => runJob('rbi',     downloadRBIDefaulters), { timezone: 'Asia/Kolkata' });

  // Nightly 02:00 IST — queue all active monitors for VHS re-check
  cron.schedule('0 20 * * *', () => runJob('monitoring', enqueueMonitoringJobs), { timezone: 'Asia/Kolkata' });

  logger.info('All 6 cron jobs registered ✓');
}

module.exports = { startCronJobs, getCronHealth, runJob };
