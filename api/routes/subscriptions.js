'use strict';

/**
 * VendorIQ — Subscriptions Routes
 * =================================
 * GET  /api/subscriptions/plans         — list all plans + pricing
 * GET  /api/subscriptions/current       — get user's current plan + usage
 * POST /api/subscriptions/upgrade       — create Razorpay subscription
 * POST /api/subscriptions/cancel        — cancel subscription
 * POST /api/subscriptions/webhook       — Razorpay subscription webhook
 * GET  /api/subscriptions/invoices      — list billing invoices
 */

const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const router   = express.Router();
const { User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Plan definitions (single source of truth) ─────────────────
const PLANS = {
  starter: {
    id:          'starter',
    name:        'Starter',
    description: 'Pay-per-use — ₹2,000 per report',
    price_monthly: 0,
    price_paise:   0,
    reports_limit: null,   // Unlimited pay-per-use
    monitors_limit:0,
    api_calls:     0,
    features: ['Pay-per-use reports', 'PDF download', '90-day report history'],
  },
  pro: {
    id:           'pro',
    name:         'Professional',
    description:  '50 reports/month + 20 monitors',
    price_monthly: 9999,
    price_paise:   999900,
    razorpay_plan_id: process.env.RAZORPAY_PLAN_PRO,
    reports_limit: 50,
    monitors_limit:20,
    api_calls:     0,
    features: ['50 reports/month', '20 vendor monitors', 'Email + WhatsApp alerts', 'Priority support', 'Bulk export'],
  },
  enterprise: {
    id:           'enterprise',
    name:         'Enterprise',
    description:  'Unlimited reports + monitors + API access',
    price_monthly: 34999,
    price_paise:   3499900,
    razorpay_plan_id: process.env.RAZORPAY_PLAN_ENTERPRISE,
    reports_limit: null,
    monitors_limit:null,
    api_calls:     1000,
    features: ['Unlimited reports', 'Unlimited monitors', 'CA Partner API access', 'Custom reports', 'Dedicated support', 'White-label PDFs'],
  },
};

// GET /plans — public (no auth)
router.get('/plans', (req, res) => {
  return res.json({ success: true, data: { plans: Object.values(PLANS) } });
});

// GET /current — user's current subscription + usage
router.get('/current', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.clientId).lean();
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });

    const plan = PLANS[user.subscription_tier] || PLANS.starter;

    // Reset monthly usage if billing cycle has rolled over
    const cycleStart = new Date(user.billing_cycle_start);
    const now        = new Date();
    const monthsElapsed = (now.getFullYear() - cycleStart.getFullYear()) * 12 +
                          (now.getMonth()    - cycleStart.getMonth());

    let usage = {
      reports_used:  user.reports_used_this_month,
      reports_limit: plan.reports_limit,
      monitors_used: user.monitors_used,
      monitors_limit:plan.monitors_limit,
      api_calls_used:user.api_calls_this_month,
      api_calls_limit:plan.api_calls,
      billing_cycle_start: user.billing_cycle_start,
      days_until_reset: 30 - Math.min(30, now.getDate()),
    };

    if (monthsElapsed > 0) {
      // Reset usage counters (lazy — done on read rather than cron)
      await User.findByIdAndUpdate(req.clientId, {
        reports_used_this_month: 0,
        api_calls_this_month:    0,
        billing_cycle_start:     new Date(now.getFullYear(), now.getMonth(), 1),
      });
      usage.reports_used  = 0;
      usage.api_calls_used = 0;
    }

    return res.json({
      success: true,
      data: {
        plan,
        subscription: {
          tier:    user.subscription_tier,
          status:  user.subscription_status,
          start:   user.subscription_start,
          end:     user.subscription_end,
          razorpay_subscription_id: user.razorpay_subscription_id,
        },
        usage,
      },
    });
  } catch (err) { next(err); }
});

// POST /upgrade — create Razorpay subscription
router.post('/upgrade', authMiddleware, async (req, res, next) => {
  try {
    const { tier } = req.body;
    if (!tier || !PLANS[tier] || tier === 'starter') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid tier required: pro or enterprise' } });
    }

    const plan = PLANS[tier];
    if (!plan.razorpay_plan_id) {
      return res.status(503).json({ success: false, error: { code: 'PLAN_NOT_CONFIGURED', message: 'Subscription plans not yet configured — run createRazorpayPlans.js' } });
    }

    const user = await User.findById(req.clientId);
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id:        plan.razorpay_plan_id,
      total_count:    12,  // 12 billing cycles
      quantity:       1,
      customer_notify:1,
      notes: {
        user_id:  req.userId,
        tier,
        email:    user.email,
      },
    });

    // Save subscription ID (status updates via webhook)
    user.razorpay_subscription_id = subscription.id;
    await user.save();

    logger.info('Subscription created', { user_id: req.userId, tier, subscription_id: subscription.id });

    return res.json({
      success: true,
      data: {
        subscription_id:  subscription.id,
        short_url:        subscription.short_url,
        razorpay_key_id:  process.env.RAZORPAY_KEY_ID,
        plan_name:        plan.name,
        amount_paise:     plan.price_paise,
      },
    });
  } catch (err) { next(err); }
});

// POST /cancel — cancel active subscription
router.post('/cancel', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.clientId);
    if (!user?.razorpay_subscription_id) {
      return res.status(400).json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' } });
    }

    // Cancel at period end (cancel_at_cycle_end: 1 = let current period run out)
    await razorpay.subscriptions.cancel(user.razorpay_subscription_id, true);

    user.subscription_status = 'cancelled';
    await user.save();

    logger.info('Subscription cancelled', { user_id: req.userId, subscription_id: user.razorpay_subscription_id });

    return res.json({
      success: true,
      data: { message: 'Subscription cancelled — access continues until end of billing period' },
    });
  } catch (err) { next(err); }
});

// POST /webhook — Razorpay subscription events
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature  = req.headers['x-razorpay-signature'];
    const bodyString = req.body.toString('utf8');
    const expected   = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyString).digest('hex');

    if (signature !== expected) {
      logger.warn('Subscription webhook signature mismatch');
      return res.status(400).json({ success: false });
    }

    res.status(200).json({ success: true }); // Respond immediately

    try {
      const event        = JSON.parse(bodyString);
      const subscription = event.payload?.subscription?.entity;
      if (!subscription) return;

      const user = await User.findOne({ razorpay_subscription_id: subscription.id });
      if (!user) return logger.warn('User not found for subscription', { id: subscription.id });

      switch (event.event) {
        case 'subscription.activated':
          user.subscription_status = 'active';
          user.subscription_start  = new Date(subscription.current_start * 1000);
          user.subscription_end    = new Date(subscription.current_end   * 1000);
          // Tier already set on upgrade — get from notes
          const tier = subscription.notes?.tier;
          if (tier && PLANS[tier]) {
            user.subscription_tier      = tier;
            user.plan_reports_limit     = PLANS[tier].reports_limit;
            user.plan_monitors_limit    = PLANS[tier].monitors_limit;
            user.plan_api_calls_limit   = PLANS[tier].api_calls;
          }
          break;
        case 'subscription.charged':
          user.subscription_status = 'active';
          user.subscription_end    = new Date(subscription.current_end * 1000);
          user.reports_used_this_month  = 0; // Reset on new billing cycle
          user.api_calls_this_month     = 0;
          user.billing_cycle_start      = new Date();
          break;
        case 'subscription.halted':
        case 'subscription.payment_failed':
          user.subscription_status = 'past_due';
          break;
        case 'subscription.cancelled':
          user.subscription_status = 'cancelled';
          user.subscription_tier   = 'starter';
          break;
      }

      await user.save();
      logger.info('Subscription event processed', { event: event.event, user_id: user._id });

      // Non-fatal: email user about subscription event
      try {
        const { notifySubscriptionEvent } = require('../services/notificationService');
        const eventMap = {
          'subscription.activated':     'activated',
          'subscription.charged':       'charged',
          'subscription.halted':        'halted',
          'subscription.payment_failed':'halted',
          'subscription.cancelled':     'cancelled',
        };
        const evtKey = eventMap[event.event];
        if (evtKey) {
          await notifySubscriptionEvent({
            userEmail:      user.email,
            userName:       user.name,
            event:          evtKey,
            planName:       PLANS[user.subscription_tier]?.name || user.subscription_tier,
            nextBillingDate: user.subscription_end,
          });
        }
      } catch (notifyErr) {
        logger.warn('Subscription notification failed (non-fatal)', { error: notifyErr.message });
      }
    } catch (err) {
      logger.error('Subscription webhook error', { error: err.message });
    }
  }
);

module.exports = router;
