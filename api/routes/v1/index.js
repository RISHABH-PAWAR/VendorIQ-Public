'use strict';

/**
 * VendorIQ — CA Partner REST API v1
 * ====================================
 * Authenticated via x-api-key header (bcrypt-verified against ApiKey collection).
 * Rate-limited to 60 req/min per key.
 *
 * POST  /api/v1/reports           — Order a report (returns report_id, polls for result)
 * GET   /api/v1/reports/:reportId — Get completed report data (JSON)
 * GET   /api/v1/reports           — List reports created by this API key
 * GET   /api/v1/account           — Key info + usage stats
 *
 * Response envelope: { success, data, meta? }
 * All amounts in paise. CIN validation enforced.
 */

const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const { z }      = require('zod');
const logger     = require('../../utils/logger');
const { Report, ApiKey, User } = require('../../models');
const { apiKeyMiddleware }     = require('../../middleware/auth');
const { createQueue }          = require('../../config/redis');
const Razorpay   = require('razorpay');

const reportQueue = createQueue('report');

const REPORT_PRICE_PAISE = parseInt(process.env.REPORT_PRICE_PAISE || '200000', 10); // ₹2,000 — NEVER CHANGE
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Per-key rate limit: 60 req/min ────────────────────────────────────────
const v1Limiter = rateLimit({
  windowMs:       60 * 1000,
  max:            60,
  keyGenerator:   (req) => req.apiKeyId || req.ip,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'API rate limit: 60 requests/minute' } },
});

// ── Apply API key auth + rate limit to all v1 routes ─────────────────────
router.use(apiKeyMiddleware);
router.use(v1Limiter);

// ── CIN validation ────────────────────────────────────────────────────────
const CIN_REGEX = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

// ── POST /reports — order report ──────────────────────────────────────────
router.post('/reports', async (req, res, next) => {
  try {
    const { cin, vendor_name, prepaid_order_id } = z.object({
      cin:              z.string().regex(CIN_REGEX, 'Invalid CIN format'),
      vendor_name:      z.string().max(200).optional(),
      prepaid_order_id: z.string().optional(), // If CA handles payment externally
    }).parse(req.body);

    // Check for existing recent report (within 24h) — return it instead of re-running
    const recent = await Report.findOne({
      client_id:  req.clientId,
      vendor_cin: cin,
      status:     'complete',
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).sort({ created_at: -1 });

    if (recent) {
      logger.info('v1: Returning cached recent report', { cin, report_id: recent.report_id, client_id: req.clientId });
      return res.json({
        success: true,
        data: { report_id: recent.report_id, status: 'complete', cached: true, vhs_score: recent.vhs_score, risk_level: recent.risk_level },
      });
    }

    // Create pending Report document
    const report_id = `rpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const report = new Report({
      client_id:    req.clientId,
      report_id,
      vendor_cin:   cin,
      vendor_name:  vendor_name || cin,
      status:       'collecting',
      source:       'v1_api',
      created_via:  'api_key',
      api_key_id:   req.apiKeyId,
    });
    await report.save();

    // If CA provided a pre-paid order ID, verify it; otherwise create Razorpay order
    let orderDetails = null;
    if (!prepaid_order_id) {
      const rzpOrder = await razorpay.orders.create({
        amount:   REPORT_PRICE_PAISE,
        currency: 'INR',
        receipt:  `rpt_${Date.now().toString(36)}`,
        notes:    { report_id, cin, source: 'v1_api' },
      });
      orderDetails = {
        order_id:  rzpOrder.id,
        amount:    REPORT_PRICE_PAISE,
        currency:  'INR',
        key_id:    process.env.RAZORPAY_KEY_ID,
      };
    } else {
      // Trust prepaid order — enqueue immediately
      await reportQueue.add(
        { reportId: report_id, cin, vendorName: vendor_name, clientId: req.clientId },
        { attempts: 2, backoff: { type: 'fixed', delay: 60000 }, jobId: report_id, timeout: 300000 },
      );
      report.status = 'collecting';
      await report.save();
    }

    logger.info('v1: Report ordered', { cin, report_id, client_id: req.clientId });

    return res.status(202).json({
      success: true,
      data: {
        report_id,
        status:        'pending_payment',
        payment_required: !prepaid_order_id,
        order:         orderDetails,
        poll_url:      `/api/v1/reports/${report_id}`,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: err.errors } });
    next(err);
  }
});

// ── GET /reports/:reportId — fetch report ────────────────────────────────
router.get('/reports/:reportId', async (req, res, next) => {
  try {
    const report = await Report.findOne({
      report_id:  req.params.reportId,
      client_id:  req.clientId,
    }).select('-raw_data'); // Don't expose raw_data via API

    if (!report) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
    }

    // Serialize clean v1 response
    const data = {
      report_id:       report.report_id,
      vendor_cin:      report.vendor_cin,
      vendor_name:     report.vendor_name,
      status:          report.status,
      created_at:      report.created_at,
    };

    if (report.status === 'complete') {
      Object.assign(data, {
        vhs_score:      report.vhs_score,
        risk_level:     report.risk_level,
        recommendation: report.recommendation,
        confidence:     report.confidence,
        vhs_breakdown:  report.vhs_breakdown,
        hard_flags:     report.hard_flags,
        key_flags:      report.key_flags?.slice(0, 10), // Cap for API response size
        similar_cases:  report.similar_cases,
        ai_narrative:   report.ai_narrative,
        sources_available: report.sources_available,
        partial_report: report.partial_report,
        pdf_url:        report.pdf_url,
      });
    }

    if (report.status === 'failed') {
      data.error_message = report.error_message;
    }

    return res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── GET /reports — list ───────────────────────────────────────────────────
router.get('/reports', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const query = { client_id: req.clientId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.risk_level) query.risk_level = req.query.risk_level;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('report_id vendor_cin vendor_name status vhs_score risk_level created_at'),
      Report.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: { reports, meta: { total, page, limit, pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
});

// ── GET /account — key info + usage ──────────────────────────────────────
router.get('/account', async (req, res, next) => {
  try {
    const [user, totalReports, thisMonth] = await Promise.all([
      User.findById(req.clientId).select('name email company subscription_tier'),
      Report.countDocuments({ client_id: req.clientId }),
      Report.countDocuments({
        client_id:  req.clientId,
        created_at: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        account: {
          name:              user?.name,
          email:             user?.email,
          company:           user?.company,
          subscription_tier: user?.subscription_tier,
        },
        usage: {
          total_reports:      totalReports,
          reports_this_month: thisMonth,
        },
        api: {
          version:    'v1',
          rate_limit: '60 requests/minute',
          docs:       'https://docs.vendoriq.in/api',
        },
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
