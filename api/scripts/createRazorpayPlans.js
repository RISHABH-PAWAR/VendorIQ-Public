'use strict';

/**
 * VendorIQ — Create Razorpay Subscription Plans
 * ================================================
 * Run ONCE before Phase 3 billing goes live:
 *   node scripts/createRazorpayPlans.js
 *
 * Creates:
 *   - Professional: ₹9,999/month (999900 paise)
 *   - Enterprise:   ₹34,999/month (3499900 paise)
 *   - Enterprise Annual: ₹27,999/month (2799900 paise)
 *   - CA Partner:   ₹69,000 one-time setup (not a subscription)
 *
 * Saves plan IDs to console — add to .env as:
 *   RAZORPAY_PLAN_PRO=plan_xxx
 *   RAZORPAY_PLAN_ENTERPRISE=plan_xxx
 *   RAZORPAY_PLAN_ENTERPRISE_ANNUAL=plan_xxx
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Razorpay = require('razorpay');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = [
  {
    period: 'monthly',
    interval: 1,
    item: {
      name: 'VendorIQ Professional',
      amount: 999900,     // ₹9,999 in paise
      currency: 'INR',
      description: '50 reports/month, 20 vendor monitors, email alerts',
    },
    notes: {
      tier: 'pro',
      reports_limit: '50',
      monitors_limit: '20',
    },
  },
  {
    period: 'monthly',
    interval: 1,
    item: {
      name: 'VendorIQ Enterprise',
      amount: 3499900,    // ₹34,999 in paise
      currency: 'INR',
      description: 'Unlimited reports, unlimited monitors, API access, WhatsApp alerts',
    },
    notes: {
      tier: 'enterprise',
      reports_limit: 'unlimited',
      monitors_limit: 'unlimited',
    },
  },
  {
    period: 'yearly',
    interval: 1,
    item: {
      name: 'VendorIQ Enterprise Annual (Save 20%)',
      amount: 33599880,   // ₹27,999 × 12 = ₹3,35,998.80 in paise
      currency: 'INR',
      description: 'Annual plan — equivalent to ₹27,999/month (20% savings)',
    },
    notes: {
      tier: 'enterprise',
      billing: 'annual',
      reports_limit: 'unlimited',
      monthly_equiv: '27999',
    },
  },
];

async function createRazorpayPlans() {
  logger.info('Creating Razorpay subscription plans...');
  logger.info('Mode:', { key_id: process.env.RAZORPAY_KEY_ID });

  const createdPlans = {};

  for (const planConfig of PLANS) {
    try {
      logger.info(`Creating plan: ${planConfig.item.name}`);
      const plan = await razorpay.plans.create(planConfig);

      createdPlans[plan.item.name] = plan.id;
      logger.info('Plan created', {
        name: plan.item.name,
        id: plan.id,
        amount: `₹${plan.item.amount / 100}`,
        period: plan.period,
      });
    } catch (err) {
      // Plan may already exist — check if it's a duplicate error
      if (err.error?.description?.includes('already exists')) {
        logger.warn('Plan already exists — skipping', { name: planConfig.item.name });
      } else {
        logger.error('Plan creation failed', { name: planConfig.item.name, error: err.message });
      }
    }
  }

  // ── Print results ──────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  RAZORPAY PLAN IDs — ADD THESE TO api/.env              ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  for (const [name, id] of Object.entries(createdPlans)) {
    console.log(`║  ${name.padEnd(35)} ${id}`);
  }
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\nAdd to api/.env:');
  console.log(`RAZORPAY_PLAN_PRO=${createdPlans['VendorIQ Professional'] || 'plan_xxxx'}`);
  console.log(`RAZORPAY_PLAN_ENTERPRISE=${createdPlans['VendorIQ Enterprise'] || 'plan_xxxx'}`);
  console.log(`RAZORPAY_PLAN_ENTERPRISE_ANNUAL=${createdPlans['VendorIQ Enterprise Annual (Save 20%)'] || 'plan_xxxx'}`);
  console.log('\n⚠️  These are TEST mode plans. Create again with live keys before production.\n');
}

if (require.main === module) {
  createRazorpayPlans()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { createRazorpayPlans };
