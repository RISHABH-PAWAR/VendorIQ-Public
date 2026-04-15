'use strict';

/**
 * VendorIQ — Admin Routes
 * =========================
 * Internal-only routes protected by ADMIN_SECRET header.
 * Not exposed to regular users.
 *
 * GET /api/admin/health    — Full system health (cron + queues + DB)
 * GET /api/admin/queues    — Bull queue depths per queue
 * GET /api/admin/cron      — Cron job status
 * POST /api/admin/cron/:job/run — Manually trigger a cron job
 */

const express = require('express');
const router  = express.Router();
const logger  = require('../utils/logger');
const { getCronHealth } = require('../cron/index');
const { createQueue }   = require('../config/redis');

// ── Admin auth guard ──────────────────────────────────────────────────────
function adminGuard(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } });
  }
  next();
}
router.use(adminGuard);

const QUEUES = ['report', 'monitoring', 'bulk-audit'];

async function getQueueStats(name) {
  try {
    const q = createQueue(name);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      q.getWaitingCount(),
      q.getActiveCount(),
      q.getCompletedCount(),
      q.getFailedCount(),
      q.getDelayedCount(),
    ]);
    return { name, waiting, active, completed, failed, delayed, status: 'ok' };
  } catch (err) {
    return { name, status: 'error', error: err.message };
  }
}

// ── GET /health ───────────────────────────────────────────────────────────
router.get('/health', async (req, res, next) => {
  try {
    const [mongoose, queueStats] = await Promise.all([
      require('mongoose'),
      Promise.all(QUEUES.map(getQueueStats)),
    ]);

    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    return res.json({
      success: true,
      data: {
        timestamp:   new Date().toISOString(),
        uptime_s:    Math.floor(process.uptime()),
        memory_mb:   Math.round(process.memoryUsage().rss / 1024 / 1024),
        node_version: process.version,
        env:         process.env.NODE_ENV,
        mongodb: {
          state:     dbState[mongoose.connection.readyState] || 'unknown',
          host:      mongoose.connection.host,
        },
        queues:      queueStats,
        cron:        getCronHealth(),
      },
    });
  } catch (err) { next(err); }
});

// ── GET /queues ───────────────────────────────────────────────────────────
router.get('/queues', async (req, res, next) => {
  try {
    const stats = await Promise.all(QUEUES.map(getQueueStats));
    return res.json({ success: true, data: { queues: stats } });
  } catch (err) { next(err); }
});

// ── GET /cron ─────────────────────────────────────────────────────────────
router.get('/cron', (req, res) => {
  return res.json({ success: true, data: { cron: getCronHealth() } });
});

// ── POST /cron/:job/run — manual trigger ──────────────────────────────────
router.post('/cron/:job/run', async (req, res, next) => {
  const JOB_MAP = {
    sebi:       () => require('../cron/refreshSEBIOrders').refreshSEBIOrders(),
    sfio:       () => require('../cron/refreshSFIOWatchlist').refreshSFIOWatchlist(),
    gem:        () => require('../cron/refreshGeMBlacklist').refreshGeMBlacklist(),
    din_csv:    () => require('../cron/downloadDINCSV').downloadDINCSV(),
    rbi:        () => require('../cron/downloadRBIDefaulters').downloadRBIDefaulters(),
    monitoring: () => require('../cron/runMonitoringJobs').enqueueMonitoringJobs(),
  };

  const jobFn = JOB_MAP[req.params.job];
  if (!jobFn) {
    return res.status(404).json({
      success: false,
      error: { code: 'JOB_NOT_FOUND', message: `Unknown job: ${req.params.job}. Valid: ${Object.keys(JOB_MAP).join(', ')}` },
    });
  }

  try {
    logger.info('Admin: manual cron trigger', { job: req.params.job });
    const result = await jobFn();
    return res.json({ success: true, data: { job: req.params.job, result } });
  } catch (err) {
    logger.error('Admin: manual cron failed', { job: req.params.job, error: err.message });
    return res.status(500).json({ success: false, error: { code: 'JOB_FAILED', message: err.message } });
  }
});

// ── GET /stats — aggregate user/report counts ─────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const { User, Report, VendorMonitor, BulkAudit } = require('../models');
    const [users, reports, monitors, bulkJobs, recentReports] = await Promise.all([
      User.countDocuments(),
      Report.countDocuments(),
      VendorMonitor.countDocuments({ active: true }),
      BulkAudit.countDocuments(),
      Report.countDocuments({ created_at: { $gte: new Date(Date.now() - 24 * 3600000) } }),
    ]);
    const riskDist = await Report.aggregate([
      { $match: { status: 'complete' } },
      { $group: { _id: '$risk_level', count: { $sum: 1 } } },
    ]);
    return res.json({
      success: true,
      data: {
        users, reports, active_monitors: monitors, bulk_jobs: bulkJobs,
        reports_24h: recentReports,
        risk_distribution: riskDist.reduce((a, r) => ({ ...a, [r._id]: r.count }), {}),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
