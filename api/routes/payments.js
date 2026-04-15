'use strict';

/**
 * VendorIQ — Payments Routes (Razorpay)
 * =======================================
 * POST /api/payments/create-order      — create Razorpay order for ₹2,000
 * POST /api/payments/webhook           — Razorpay webhook (raw body, HMAC verify)
 * GET  /api/payments/verify/:orderId   — verify payment status
 */

const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const router   = express.Router();
const { Report, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { createQueue }   = require('../config/redis');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CRITICAL: ₹2,000 in paise — NEVER change
const REPORT_PRICE_PAISE = parseInt(process.env.REPORT_PRICE_PAISE || '200000', 10);

const reportQueue = createQueue('report');

// POST /create-order — requires auth
router.post('/create-order', authMiddleware, async (req, res, next) => {
  try {
    const { cin, vendor_name, gstin, pan } = req.body;
    if (!cin) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'CIN is required' } });

    // Create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount:   REPORT_PRICE_PAISE,
      currency: 'INR',
      receipt:  `rpt_${Date.now().toString(36)}`,
      notes: {
        cin,
        vendor_name: vendor_name || '',
        user_id:     req.userId,
      },
    });

    // Create Report document in PENDING state
    const report = new Report({
      report_id:    `rpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      client_id:    req.clientId,
      vendor_cin:   cin,
      vendor_gstin: gstin || null,
      vendor_name:  vendor_name || null,
      status:       'pending',
      payment_id:   rzpOrder.id,
      amount_charged: REPORT_PRICE_PAISE,
    });
    await report.save();

    logger.info('Payment order created', {
      report_id: report.report_id,
      order_id:  rzpOrder.id,
      user_id:   req.userId,
      cin,
    });

    return res.json({
      success: true,
      data: {
        order_id:   rzpOrder.id,
        amount:     REPORT_PRICE_PAISE,
        currency:   'INR',
        report_id:  report.report_id,
        key_id:     process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) { next(err); }
});

// POST /webhook — Razorpay webhook (MUST use raw body for HMAC)
// NOTE: bodyParser.raw() is configured inline here — don't use express.json() on this route
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    // ── Step 1: Verify HMAC signature BEFORE any DB ops ──────────
    const signature  = req.headers['x-razorpay-signature'];
    const bodyString = req.body.toString('utf8');
    const expected   = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyString)
      .digest('hex');

    if (signature !== expected) {
      logger.warn('Razorpay webhook signature mismatch', {
        received:  signature?.slice(0, 10),
        expected:  expected.slice(0, 10),
        ip:        req.ip,
      });
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // ── Step 2: Respond 200 immediately (Razorpay retries on timeout) ──
    res.status(200).json({ success: true });

    // ── Step 3: Process event asynchronously ─────────────────────
    try {
      const event = JSON.parse(bodyString);
      logger.info('Razorpay webhook received', { event: event.event });

      if (event.event === 'payment.captured') {
        await handlePaymentCaptured(event.payload.payment.entity);
      } else if (event.event === 'payment.failed') {
        await handlePaymentFailed(event.payload.payment.entity);
      } else if (event.event === 'order.paid') {
        await handleOrderPaid(event.payload.order.entity);
      }
    } catch (processErr) {
      logger.error('Webhook processing error', { error: processErr.message, stack: processErr.stack });
    }
  }
);

async function handlePaymentCaptured(payment) {
  const { order_id, id: payment_id, notes } = payment;
  const cin        = notes?.cin;
  const vendorName = notes?.vendor_name;

  logger.info('Payment captured', { order_id, payment_id, cin });

  // Find the pending report
  const report = await Report.findOne({ payment_id: order_id });
  if (!report) {
    logger.warn('Report not found for order', { order_id });
    return;
  }

  if (report.status !== 'pending') {
    logger.warn('Report already processed', { report_id: report.report_id, status: report.status });
    return;
  }

  // Update report with payment info
  report.payment_id = payment_id;
  await report.save();

  // Enqueue Bull job
  const job = await reportQueue.add(
    {
      reportId:   report.report_id,
      cin:        report.vendor_cin,
      gstin:      report.vendor_gstin,
      pan:        null,
      vendorName: report.vendor_name || vendorName,
    },
    {
      attempts: 3,
      backoff:  { type: 'exponential', delay: 5000 },
      jobId:    report.report_id, // Idempotent — won't duplicate
    }
  );

  logger.info('Report job enqueued', { report_id: report.report_id, job_id: job.id });
}

async function handlePaymentFailed(payment) {
  const { order_id, error_description } = payment;
  logger.warn('Payment failed', { order_id, error: error_description });
  await Report.findOneAndUpdate(
    { payment_id: order_id, status: 'pending' },
    { status: 'failed', error_message: `Payment failed: ${error_description}` }
  );
}

async function handleOrderPaid(order) {
  // Backup handler — fires if payment.captured doesn't
  logger.info('Order paid', { order_id: order.id });
}

// GET /verify/:orderId — check payment status (frontend polling)
router.get('/verify/:orderId', authMiddleware, async (req, res, next) => {
  try {
    const report = await Report.findOne({
      payment_id: req.params.orderId,
      client_id:  req.clientId,
    }).select('report_id status vhs_score risk_level');

    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    return res.json({
      success: true,
      data: {
        report_id:  report.report_id,
        status:     report.status,
        vhs_score:  report.vhs_score,
        risk_level: report.risk_level,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
