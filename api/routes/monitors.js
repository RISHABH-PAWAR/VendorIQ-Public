'use strict';

/**
 * VendorIQ — Vendor Monitor Routes
 * ==================================
 * GET    /api/monitors              — list all monitors for user
 * POST   /api/monitors              — add a vendor to monitor
 * GET    /api/monitors/:id          — get single monitor + alert history
 * PATCH  /api/monitors/:id          — update alert config
 * DELETE /api/monitors/:id          — remove monitor
 * POST   /api/monitors/:id/run      — manual re-check (Admin/Pro+)
 * GET    /api/monitors/:id/alerts   — alert history for a monitor
 */

const express = require('express');
const router  = express.Router();
const { VendorMonitor, User, Report } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Plan-limit middleware ─────────────────────────────────────
async function requireMonitorCapacity(req, res, next) {
  try {
    const user = await User.findById(req.clientId).lean();
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });

    const tier = user.subscription_tier;
    if (tier === 'starter') {
      return res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_PLAN', message: 'Vendor monitoring requires Professional or Enterprise plan' },
      });
    }

    // Check limit
    if (user.plan_monitors_limit !== null) {
      const count = await VendorMonitor.countDocuments({ client_id: req.clientId, active: true });
      if (count >= user.plan_monitors_limit) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MONITOR_LIMIT_REACHED',
            message: `Your ${tier} plan allows ${user.plan_monitors_limit} monitors. Upgrade to add more.`,
          },
        });
      }
    }
    next();
  } catch (err) { next(err); }
}

// GET / — list all monitors
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const monitors = await VendorMonitor.find({ client_id: req.clientId })
      .sort({ created_at: -1 })
      .select('-alert_history') // Exclude history from list — fetch separately
      .lean();

    return res.json({
      success: true,
      data: { monitors, total: monitors.length },
    });
  } catch (err) { next(err); }
});

// POST / — add vendor to monitor
router.post('/', authMiddleware, requireMonitorCapacity, async (req, res, next) => {
  try {
    const { vendor_cin, vendor_name, vendor_gstin, alert_config } = req.body;

    if (!vendor_cin) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'vendor_cin required' } });
    }

    // Prevent duplicate
    const existing = await VendorMonitor.findOne({ client_id: req.clientId, vendor_cin });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_MONITORED', message: 'This vendor is already being monitored' },
        data: { monitor_id: existing._id },
      });
    }

    // Get latest VHS from most recent completed report (if any)
    const lastReport = await Report.findOne({
      client_id:  req.clientId,
      vendor_cin,
      status:     'complete',
    }).sort({ created_at: -1 }).select('vhs_score').lean();

    const monitor = new VendorMonitor({
      client_id:    req.clientId,
      vendor_cin,
      vendor_name:  vendor_name || null,
      vendor_gstin: vendor_gstin || null,
      last_vhs:     lastReport?.vhs_score || null,
      alert_config: {
        whatsapp:         false,
        email:            true,
        min_vhs_drop:     10,
        frequency:        'immediate',
        severity_threshold:'MEDIUM',
        ...(alert_config || {}),
      },
    });

    await monitor.save();

    // Increment user monitor count
    await User.findByIdAndUpdate(req.clientId, { $inc: { monitors_used: 1 } });

    logger.info('Monitor added', { user_id: req.userId, vendor_cin, monitor_id: monitor._id });

    return res.status(201).json({ success: true, data: { monitor } });
  } catch (err) { next(err); }
});

// GET /:id — single monitor with recent alerts
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const monitor = await VendorMonitor.findOne({
      _id:       req.params.id,
      client_id: req.clientId,  // CRITICAL: tenant isolation
    });

    if (!monitor) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Monitor not found' } });
    }

    return res.json({ success: true, data: { monitor } });
  } catch (err) { next(err); }
});

// PATCH /:id — update alert config
router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { active, alert_config } = req.body;

    const monitor = await VendorMonitor.findOne({ _id: req.params.id, client_id: req.clientId });
    if (!monitor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    if (typeof active === 'boolean') {
      monitor.active = active;
      // Update user count
      const delta = active ? 1 : -1;
      await User.findByIdAndUpdate(req.clientId, { $inc: { monitors_used: delta } });
    }

    if (alert_config) {
      monitor.alert_config = { ...monitor.alert_config.toObject(), ...alert_config };
    }

    await monitor.save();
    return res.json({ success: true, data: { monitor } });
  } catch (err) { next(err); }
});

// DELETE /:id — remove monitor
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const monitor = await VendorMonitor.findOneAndDelete({ _id: req.params.id, client_id: req.clientId });
    if (!monitor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    await User.findByIdAndUpdate(req.clientId, { $inc: { monitors_used: -1 } });

    logger.info('Monitor deleted', { user_id: req.userId, vendor_cin: monitor.vendor_cin });
    return res.json({ success: true, data: { message: 'Monitor removed' } });
  } catch (err) { next(err); }
});

// POST /:id/run — manual re-check trigger (Pro+ only)
router.post('/:id/run', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.clientId).lean();
    if (user?.subscription_tier === 'starter') {
      return res.status(403).json({ success: false, error: { code: 'INSUFFICIENT_PLAN', message: 'Pro+ required for manual re-check' } });
    }

    const monitor = await VendorMonitor.findOne({ _id: req.params.id, client_id: req.clientId });
    if (!monitor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    // Enqueue monitoring job
    const { createQueue } = require('../config/redis');
    const monitorQueue    = createQueue('monitoring');
    const job = await monitorQueue.add({
      monitorId:  monitor._id.toString(),
      vendor_cin: monitor.vendor_cin,
      client_id:  req.clientId,
      manual:     true,
    });

    logger.info('Manual monitor check triggered', { monitor_id: monitor._id, job_id: job.id });

    return res.json({
      success: true,
      data: { message: 'Re-check queued — results will trigger alert if changes found', job_id: job.id },
    });
  } catch (err) { next(err); }
});

// GET /:id/alerts — alert history paginated
router.get('/:id/alerts', authMiddleware, async (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const monitor = await VendorMonitor.findOne({ _id: req.params.id, client_id: req.clientId })
      .select('alert_history vendor_cin vendor_name')
      .lean();

    if (!monitor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    const alerts = (monitor.alert_history || []).slice(0, limit);

    return res.json({
      success: true,
      data: { alerts, total: monitor.alert_history?.length || 0, vendor_cin: monitor.vendor_cin },
    });
  } catch (err) { next(err); }
});

module.exports = router;
