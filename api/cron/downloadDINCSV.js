'use strict';

/**
 * Cron: Download MCA Disqualified DIN CSV
 * =========================================
 * Schedule:  Monthly — 1st of every month at 03:00 IST
 * Source:    MCA21 portal — disqualified directors list
 * Action:    Full replace of DisqualifiedDIN collection
 * Runtime:   ~10-15 minutes (large CSV, ~500k+ records)
 *
 * Run manually: node cron/downloadDINCSV.js
 */

require('dotenv').config({ path: '../.env' });
const axios     = require('axios');
const Papa      = require('papaparse');
const mongoose  = require('mongoose');
const logger    = require('../utils/logger');
const { DisqualifiedDIN } = require('../models');

// MCA publishes this CSV monthly at this URL pattern
const MCA_DIN_CSV_URL = 'https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-filing/DINXBRLSearch.html';
// Actual direct download URL (may need to be updated if MCA changes it):
const MCA_DIN_DIRECT_URL = process.env.MCA_DIN_CSV_URL ||
  'https://www.mca.gov.in/MinistryV2/disqualifieddir.html';

const BATCH_SIZE = 1000; // MongoDB bulkWrite batch size

async function downloadDINCSV() {
  const startTime = Date.now();
  logger.info('DIN CSV download started');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  logger.info('DB connected');

  let csvText = '';

  // ── Attempt 1: Direct MCA download ─────────────────────────
  try {
    logger.info('Attempting direct MCA download...');
    const res = await axios.get(MCA_DIN_DIRECT_URL, {
      timeout: 120000,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VendorIQ-DataRefresh/1.0)',
        'Accept': 'text/csv,application/csv,text/plain,*/*',
      },
    });
    csvText = res.data;
    logger.info('Direct download succeeded', { bytes: csvText.length });
  } catch (err) {
    logger.warn('Direct download failed — trying ScrapingBee fallback', { error: err.message });

    // ── Attempt 2: ScrapingBee ───────────────────────────────
    try {
      const res = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key: process.env.SCRAPINGBEE_API_KEY,
          url:     MCA_DIN_DIRECT_URL,
          render_js: false,
        },
        timeout: 60000,
        responseType: 'text',
      });
      csvText = res.data;
      logger.info('ScrapingBee download succeeded', { bytes: csvText.length });
    } catch (sbErr) {
      logger.error('Both download attempts failed', { error: sbErr.message });
      throw new Error('Could not download DIN CSV from MCA');
    }
  }

  // ── Parse CSV ───────────────────────────────────────────────
  const { data: rows, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (errors.length > 0) {
    logger.warn('CSV parse warnings', { count: errors.length, first: errors[0] });
  }

  logger.info('CSV parsed', { rows: rows.length });

  if (rows.length === 0) {
    throw new Error('CSV parsed to 0 rows — aborting to prevent data loss');
  }

  // ── Bulk upsert in batches ──────────────────────────────────
  let processed = 0;
  let failed = 0;
  const refreshedAt = new Date();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const ops = batch
      .filter(row => row.din && /^\d{8}$/.test(row.din?.trim()))
      .map(row => ({
        updateOne: {
          filter: { din: row.din.trim() },
          update: {
            $set: {
              din:                      row.din.trim(),
              director_name:            row.director_name || row.name || '',
              disqualification_date:    row.disqualification_date ? new Date(row.disqualification_date) : null,
              disqualification_section: row.section || 'Section 164(2)',
              company_cin:              row.cin || row.company_cin || '',
              disqualification_reason:  row.reason || '',
              refreshed_at:             refreshedAt,
            },
          },
          upsert: true,
        },
      }));

    if (ops.length === 0) continue;

    try {
      const result = await DisqualifiedDIN.bulkWrite(ops, { ordered: false });
      processed += result.upsertedCount + result.modifiedCount;
    } catch (batchErr) {
      logger.warn('Batch write failed', { batch_start: i, error: batchErr.message });
      failed += batch.length;
    }

    if (i % 10000 === 0 && i > 0) {
      logger.info('DIN upsert progress', { processed, total: rows.length });
    }
  }

  // ── Remove stale records (not in this refresh) ───────────────
  const deleteResult = await DisqualifiedDIN.deleteMany({
    refreshed_at: { $lt: refreshedAt },
  });

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  logger.info('DIN CSV refresh complete', {
    rows_parsed:    rows.length,
    upserted:       processed,
    failed,
    stale_removed:  deleteResult.deletedCount,
    elapsed_seconds: elapsed,
  });

  await mongoose.disconnect();
  return { processed, failed, stale_removed: deleteResult.deletedCount };
}

// Run directly if called as script
if (require.main === module) {
  downloadDINCSV()
    .then(result => {
      console.log('✅ DIN CSV refresh complete:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ DIN CSV refresh failed:', err.message);
      process.exit(1);
    });
}

module.exports = { downloadDINCSV };
