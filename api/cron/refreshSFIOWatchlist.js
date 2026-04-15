'use strict';

/**
 * Cron: Refresh SFIO (Serious Fraud Investigation Office) Watchlist
 * ==================================================================
 * Schedule:  Weekly — Every Sunday at 01:00 IST
 * Source:    MCA/SFIO press releases + MCA21 portal
 * Action:    Upsert active investigations into SFIOWatchlist collection
 * Runtime:   ~3-5 minutes
 *
 * Run manually: node cron/refreshSFIOWatchlist.js
 */

require('dotenv').config({ path: '../.env' });
const axios    = require('axios');
const cheerio  = require('cheerio');
const mongoose = require('mongoose');
const logger   = require('../utils/logger');
const { SFIOWatchlist } = require('../models');

// SFIO press releases and investigation orders
const SFIO_SOURCES = [
  'https://sfio.nic.in/sfio/home/investigation',
  'https://www.mca.gov.in/MinistryV2/sfioInvestigation.html',
];

async function refreshSFIOWatchlist() {
  const startTime = Date.now();
  logger.info('SFIO watchlist refresh started');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const records = [];

  for (const sourceUrl of SFIO_SOURCES) {
    try {
      const res = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key:   process.env.SCRAPINGBEE_API_KEY,
          url:       sourceUrl,
          render_js: true,
          premium_proxy: true,
          country_code: 'IN',
          wait: 2000,
        },
        timeout: 45000,
        responseType: 'text',
      });

      const $ = cheerio.load(res.data);
      const pageText = res.data;

      // Extract company names and CINs mentioned in investigation context
      // SFIO typically publishes: "Investigation ordered against <Company> CIN: <CIN>"
      const cinPattern = /[LUu]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/g;
      const cins = (pageText.match(cinPattern) || []).filter(c => c.length === 21);

      // Extract table rows if present
      $('table tr').each((i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const companyName = $(cells[0]).text().trim();
          const cinText     = $(cells[1]).text().trim();
          const statusText  = $(cells[2])?.text().trim() || 'active';

          if (companyName.length > 3 && !/^(company|name|sl)/i.test(companyName)) {
            records.push({
              company_name:        companyName,
              cin:                 cinPattern.test(cinText) ? cinText : null,
              investigation_status: statusText.toLowerCase().includes('complet') ? 'completed' : 'active',
              investigation_details: `Source: ${sourceUrl}`,
              order_reference:     $(cells[3])?.text().trim() || null,
              refreshed_at:        new Date(),
            });
          }
        }
      });

      // Also add standalone CINs found in page text
      for (const cin of [...new Set(cins)]) {
        if (!records.find(r => r.cin === cin)) {
          records.push({
            company_name:        `Company (${cin})`,
            cin,
            investigation_status: 'active',
            investigation_details: `Found in SFIO source: ${sourceUrl}`,
            refreshed_at:         new Date(),
          });
        }
      }

      logger.info('SFIO source processed', { url: sourceUrl, records: records.length });
    } catch (err) {
      logger.warn('SFIO source failed', { url: sourceUrl, error: err.message });
    }
  }

  if (records.length === 0) {
    logger.warn('No SFIO records found — collection not cleared (safety measure)');
    await mongoose.disconnect();
    return { processed: 0, note: 'No records found — existing data preserved' };
  }

  // ── Upsert records ──────────────────────────────────────────
  const refreshedAt = new Date();
  let processed = 0;

  const ops = records.map(record => ({
    updateOne: {
      filter: record.cin ? { cin: record.cin } : { company_name: record.company_name },
      update: { $set: { ...record, refreshed_at: refreshedAt } },
      upsert: true,
    },
  }));

  try {
    const result = await SFIOWatchlist.bulkWrite(ops, { ordered: false });
    processed = result.upsertedCount + result.modifiedCount;
  } catch (err) {
    logger.error('SFIO bulk write failed', { error: err.message });
  }

  // Mark old records as completed (not seen in latest refresh)
  await SFIOWatchlist.updateMany(
    { refreshed_at: { $lt: refreshedAt }, investigation_status: 'active' },
    { $set: { investigation_status: 'completed' } }
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  logger.info('SFIO watchlist refresh complete', { records: records.length, processed, elapsed_seconds: elapsed });

  await mongoose.disconnect();
  return { processed, total: records.length };
}

if (require.main === module) {
  refreshSFIOWatchlist()
    .then(r => { console.log('✅ SFIO refresh complete:', r); process.exit(0); })
    .catch(e => { console.error('❌ SFIO refresh failed:', e.message); process.exit(1); });
}

module.exports = { refreshSFIOWatchlist };
