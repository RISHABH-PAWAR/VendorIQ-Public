'use strict';

/**
 * Cron: Refresh GeM (Government e-Marketplace) Blacklisted Vendors
 * =================================================================
 * Schedule:  Weekly — Every Monday at 02:00 IST
 * Source:    GeM portal + MCA debarment data
 * Action:    Upsert into GeMBlacklist collection
 * Runtime:   ~5 minutes
 *
 * Run manually: node cron/refreshGeMBlacklist.js
 */

require('dotenv').config({ path: '../.env' });
const axios    = require('axios');
const cheerio  = require('cheerio');
const mongoose = require('mongoose');
const logger   = require('../utils/logger');
const { GeMBlacklist } = require('../models');

// GeM blacklist is published at:
const GEM_BLACKLIST_URL = 'https://gem.gov.in/resources/pdf/Blacklisted_Vendors.pdf';
const GEM_WEB_URL       = 'https://gem.gov.in/suspension_debarment';

async function refreshGeMBlacklist() {
  const startTime = Date.now();
  logger.info('GeM blacklist refresh started');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const records = [];

  // ── Attempt 1: GeM PDF download ────────────────────────────
  try {
    const pdfRes = await axios.get(GEM_BLACKLIST_URL, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VendorIQ/1.0)' },
    });

    const pdfParse = require('pdf-parse');
    const pdfData  = await pdfParse(Buffer.from(pdfRes.data));
    const lines    = pdfData.text.split('\n').filter(l => l.trim().length > 5);

    for (const line of lines) {
      const parts = line.split(/\s{2,}|\|/);
      if (parts.length >= 2) {
        const record = parseGeMRow(parts);
        if (record) records.push(record);
      }
    }

    logger.info('GeM PDF parsed', { records: records.length });
  } catch (pdfErr) {
    logger.warn('GeM PDF failed — trying web scrape', { error: pdfErr.message });

    // ── Attempt 2: Scrape GeM web page ──────────────────────
    try {
      const res = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key:   process.env.SCRAPINGBEE_API_KEY,
          url:       GEM_WEB_URL,
          render_js: true,
          wait:      3000,
        },
        timeout: 45000,
        responseType: 'text',
      });

      const $ = cheerio.load(res.data);
      $('table tr').each((i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 2) return;

        const record = parseGeMRow(cells.toArray().map(c => $(c).text().trim()));
        if (record) records.push(record);
      });

      logger.info('GeM web scrape done', { records: records.length });
    } catch (webErr) {
      logger.error('GeM web scrape failed', { error: webErr.message });
    }
  }

  if (records.length === 0) {
    logger.warn('No GeM records — existing data preserved');
    await mongoose.disconnect();
    return { processed: 0 };
  }

  // ── Upsert ──────────────────────────────────────────────────
  const refreshedAt = new Date();
  let processed = 0;

  const ops = records.map(record => ({
    updateOne: {
      filter: record.gstin
        ? { gstin: record.gstin }
        : { vendor_name: record.vendor_name },
      update: { $set: { ...record, refreshed_at: refreshedAt } },
      upsert: true,
    },
  }));

  try {
    const result = await GeMBlacklist.bulkWrite(ops, { ordered: false });
    processed = result.upsertedCount + result.modifiedCount;
  } catch (err) {
    logger.error('GeM bulk write failed', { error: err.message });
  }

  // Check expired blacklists
  await GeMBlacklist.updateMany(
    { 'blacklist_period.until': { $lt: new Date(), $ne: null }, is_active: true },
    { $set: { is_active: false } }
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  logger.info('GeM blacklist refresh complete', { records: records.length, processed, elapsed_seconds: elapsed });

  await mongoose.disconnect();
  return { processed, total: records.length };
}

function parseGeMRow(parts) {
  try {
    const name = parts[0]?.trim();
    if (!name || name.length < 3) return null;
    if (/^(sl\.|sr\.|no\.|vendor|name)/i.test(name)) return null;

    const gstinMatch = parts.find(p => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(p?.trim()));
    const panMatch   = parts.find(p => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p?.trim()));

    const dateStrings = parts
      .map(p => p?.trim())
      .filter(p => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(p));

    return {
      vendor_name:     name,
      gstin:           gstinMatch?.trim() || null,
      pan:             panMatch?.trim() || null,
      blacklist_date:  dateStrings[0] ? new Date(dateStrings[0]) : new Date(),
      blacklist_reason: parts[3]?.trim() || 'Blacklisted on GeM portal',
      blacklist_period: {
        from:  dateStrings[0] ? new Date(dateStrings[0]) : new Date(),
        until: dateStrings[1] ? new Date(dateStrings[1]) : null,
      },
      is_active:     true,
      gem_seller_id: parts.find(p => /^[A-Z0-9]{8,}$/.test(p?.trim())) || null,
    };
  } catch {
    return null;
  }
}

if (require.main === module) {
  refreshGeMBlacklist()
    .then(r => { console.log('✅ GeM refresh complete:', r); process.exit(0); })
    .catch(e => { console.error('❌ GeM refresh failed:', e.message); process.exit(1); });
}

module.exports = { refreshGeMBlacklist };
