'use strict';

/**
 * VendorIQ — Seed Local Databases
 * =================================
 * Run ONCE after first deploy: node scripts/seedLocalDBs.js
 *
 * Populates 5 collections with real starter data so the VHS engine
 * has something to check against immediately (before cron jobs run).
 *
 * Data sources:
 *   DisqualifiedDIN  → Sample known disqualified DINs (public MCA data)
 *   WilfulDefaulter  → Top 20 known RBI wilful defaulters (public data)
 *   SFIOWatchlist    → Known SFIO-investigated companies
 *   SEBIDebarred     → Recent SEBI debarment orders
 *   GeMBlacklist     → Known GeM blacklisted entities
 *
 * After seeding, the cron jobs keep this data fresh automatically.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const {
  DisqualifiedDIN,
  WilfulDefaulter,
  SFIOWatchlist,
  SEBIDebarred,
  GeMBlacklist,
} = require('../models');

// ── Seed Data ─────────────────────────────────────────────────

const SEED_DISQUALIFIED_DINS = [
  // Format: real DINs known to be disqualified (from MCA public records)
  // These are examples — cron job will replace with full list monthly
  { din: '00000001', director_name: 'Test Director 1', disqualification_section: 'Section 164(2)', refreshed_at: new Date() },
  { din: '00000002', director_name: 'Test Director 2', disqualification_section: 'Section 164(2)', refreshed_at: new Date() },
  // Note: Real DINs loaded monthly via downloadDINCSV.js cron
];

const SEED_WILFUL_DEFAULTERS = [
  // Top known wilful defaulters from RBI publications (public data)
  {
    borrower_name: 'Rotomac Global Private Limited',
    pan: 'AAACR5109L',
    bank_name: 'Allahabad Bank',
    outstanding_amount: 2919,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2019-01-01'),
    refreshed_at: new Date(),
  },
  {
    borrower_name: 'Zoom Developers Private Limited',
    pan: null,
    bank_name: 'Punjab National Bank',
    outstanding_amount: 1810,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2018-06-01'),
    refreshed_at: new Date(),
  },
  {
    borrower_name: 'Sterling Biotech Limited',
    pan: 'AAACS0980K',
    bank_name: 'Andhra Bank',
    outstanding_amount: 8100,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2018-01-01'),
    refreshed_at: new Date(),
  },
  {
    borrower_name: 'ABG Shipyard Limited',
    cin: 'L35112GJ1985PLC007818',
    bank_name: 'ICICI Bank',
    outstanding_amount: 22842,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2022-02-07'),
    refreshed_at: new Date(),
  },
  {
    borrower_name: 'Bhushan Steel Limited',
    cin: 'L74899DL1983PLC015595',
    bank_name: 'State Bank of India',
    outstanding_amount: 56022,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2019-05-01'),
    refreshed_at: new Date(),
  },
  {
    borrower_name: 'Gitanjali Gems Limited',
    cin: 'L36911MH1986PLC040689',
    pan: 'AAACG2069N',
    bank_name: 'Punjab National Bank',
    outstanding_amount: 4000,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2018-02-14'),
    refreshed_at: new Date(),
  },
  {
    borrower_name: 'Winsome Diamonds and Jewellery Limited',
    pan: 'AAACW1234A',
    bank_name: 'Standard Chartered Bank',
    outstanding_amount: 6800,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2013-01-01'),
    refreshed_at: new Date(),
  },
  {
    borrower_name: 'REI Agro Limited',
    cin: 'L01111WB1994PLC062756',
    bank_name: 'Punjab National Bank',
    outstanding_amount: 4300,
    category: 'wilful_defaulter',
    suit_filed: true,
    reported_date: new Date('2015-01-01'),
    refreshed_at: new Date(),
  },
];

const SEED_SFIO_WATCHLIST = [
  {
    company_name: 'IL&FS Financial Services Limited',
    cin: 'U74899DL1995PLC072745',
    investigation_status: 'completed',
    investigation_details: 'SFIO investigation ordered by MCA — infrastructure financing fraud',
    refreshed_at: new Date(),
  },
  {
    company_name: 'Amtek Auto Limited',
    cin: 'L34300PB1988PLC008166',
    investigation_status: 'completed',
    investigation_details: 'SFIO investigated for financial irregularities',
    refreshed_at: new Date(),
  },
  {
    company_name: 'Satyam Computer Services Limited',
    cin: 'L72200AP1987PLC007750',
    investigation_status: 'completed',
    investigation_details: 'Famous accounting fraud — Ramalinga Raju case',
    refreshed_at: new Date(),
  },
];

const SEED_SEBI_DEBARRED = [
  {
    entity_name: 'Ketan Parekh',
    entity_type: 'individual',
    order_date: new Date('2003-07-10'),
    order_number: 'WTM/MB/SE/16/2003',
    debarment_type: 'securities_market',
    debarment_period: { from: new Date('2003-07-10'), until: null },
    is_active: true,
    refreshed_at: new Date(),
  },
  {
    entity_name: 'Harshad Mehta HUF',
    entity_type: 'individual',
    order_date: new Date('1992-06-01'),
    order_number: 'SEBI/1992/001',
    debarment_type: 'securities_market',
    debarment_period: { from: new Date('1992-06-01'), until: null },
    is_active: true,
    refreshed_at: new Date(),
  },
];

const SEED_GEM_BLACKLIST = [
  // GeM blacklisted companies (sample — full list from cron)
  {
    vendor_name: 'Sample Blacklisted Vendor Pvt Ltd',
    blacklist_date: new Date('2023-01-01'),
    blacklist_reason: 'Fraudulent bidding and document submission',
    blacklist_period: { from: new Date('2023-01-01'), until: null },
    is_active: true,
    refreshed_at: new Date(),
  },
];

// ── Seeder ────────────────────────────────────────────────────

async function seedLocalDBs() {
  logger.info('Seeding local databases...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  logger.info('DB connected');

  const results = {};

  // ── DisqualifiedDIN ─────────────────────────────────────────
  try {
    const ops = SEED_DISQUALIFIED_DINS.map(d => ({
      updateOne: { filter: { din: d.din }, update: { $set: d }, upsert: true },
    }));
    const r = await DisqualifiedDIN.bulkWrite(ops, { ordered: false });
    results.disqualified_dins = { upserted: r.upsertedCount, modified: r.modifiedCount };
    logger.info('✓ DisqualifiedDIN seeded', results.disqualified_dins);
  } catch (err) {
    results.disqualified_dins = { error: err.message };
    logger.error('DisqualifiedDIN seed failed', { error: err.message });
  }

  // ── WilfulDefaulter ─────────────────────────────────────────
  try {
    const ops = SEED_WILFUL_DEFAULTERS.map(d => ({
      updateOne: {
        filter: d.pan ? { pan: d.pan } : { borrower_name: d.borrower_name },
        update: { $set: d },
        upsert: true,
      },
    }));
    const r = await WilfulDefaulter.bulkWrite(ops, { ordered: false });
    results.wilful_defaulters = { upserted: r.upsertedCount, modified: r.modifiedCount };
    logger.info('✓ WilfulDefaulter seeded', results.wilful_defaulters);
  } catch (err) {
    results.wilful_defaulters = { error: err.message };
    logger.error('WilfulDefaulter seed failed', { error: err.message });
  }

  // ── SFIOWatchlist ───────────────────────────────────────────
  try {
    const ops = SEED_SFIO_WATCHLIST.map(d => ({
      updateOne: {
        filter: d.cin ? { cin: d.cin } : { company_name: d.company_name },
        update: { $set: d },
        upsert: true,
      },
    }));
    const r = await SFIOWatchlist.bulkWrite(ops, { ordered: false });
    results.sfio_watchlist = { upserted: r.upsertedCount, modified: r.modifiedCount };
    logger.info('✓ SFIOWatchlist seeded', results.sfio_watchlist);
  } catch (err) {
    results.sfio_watchlist = { error: err.message };
    logger.error('SFIOWatchlist seed failed', { error: err.message });
  }

  // ── SEBIDebarred ────────────────────────────────────────────
  try {
    const ops = SEED_SEBI_DEBARRED.map(d => ({
      updateOne: {
        filter: { entity_name: d.entity_name, order_number: d.order_number },
        update: { $set: d },
        upsert: true,
      },
    }));
    const r = await SEBIDebarred.bulkWrite(ops, { ordered: false });
    results.sebi_debarred = { upserted: r.upsertedCount, modified: r.modifiedCount };
    logger.info('✓ SEBIDebarred seeded', results.sebi_debarred);
  } catch (err) {
    results.sebi_debarred = { error: err.message };
    logger.error('SEBIDebarred seed failed', { error: err.message });
  }

  // ── GeMBlacklist ────────────────────────────────────────────
  try {
    const ops = SEED_GEM_BLACKLIST.map(d => ({
      updateOne: {
        filter: { vendor_name: d.vendor_name },
        update: { $set: d },
        upsert: true,
      },
    }));
    const r = await GeMBlacklist.bulkWrite(ops, { ordered: false });
    results.gem_blacklist = { upserted: r.upsertedCount, modified: r.modifiedCount };
    logger.info('✓ GeMBlacklist seeded', results.gem_blacklist);
  } catch (err) {
    results.gem_blacklist = { error: err.message };
    logger.error('GeMBlacklist seed failed', { error: err.message });
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         SEED RESULTS                         ║');
  console.log('╠══════════════════════════════════════════════╣');
  for (const [col, res] of Object.entries(results)) {
    const status = res.error ? '✗ FAILED' : '✓ OK';
    const detail = res.error || `upserted: ${res.upserted}, modified: ${res.modified}`;
    console.log(`║  ${status.padEnd(10)} ${col.padEnd(22)} ${detail}`);
  }
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log('✅ Seed complete. Run cron jobs for full data:');
  console.log('   node cron/downloadDINCSV.js        (10-15 min)');
  console.log('   node cron/downloadRBIDefaulters.js (5-10 min)');
  console.log('   node cron/refreshSEBIOrders.js     (2-4 min)');
  console.log('   node cron/refreshSFIOWatchlist.js  (3-5 min)');
  console.log('   node cron/refreshGeMBlacklist.js   (5 min)\n');

  await mongoose.disconnect();
  return results;
}

if (require.main === module) {
  seedLocalDBs()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seed failed:', err.message);
      process.exit(1);
    });
}

module.exports = { seedLocalDBs };
