'use strict';

/**
 * Cron: Download RBI Wilful Defaulters List
 * ==========================================
 * Schedule:  Quarterly — 1st of Jan/Apr/Jul/Oct at 04:00 IST
 * Source:    RBI website — quarterly PDF publications
 * Action:    Upsert into WilfulDefaulter collection
 * Runtime:   ~5-10 minutes
 *
 * Run manually: node cron/downloadRBIDefaulters.js
 */

require('dotenv').config({ path: '../.env' });
const axios    = require('axios');
const mongoose = require('mongoose');
const logger   = require('../utils/logger');
const { WilfulDefaulter } = require('../models');

// RBI publishes quarterly PDFs at these URLs — update as RBI changes them
const RBI_DEFAULTER_URLS = [
  // Format: /scripts/BS_ViewBulletin.aspx — actual URLs change quarterly
  // Using ScrapingBee to fetch the listing page and extract PDF links
  'https://www.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=2751',
  'https://rbidocs.rbi.org.in/rdocs/content/pdfs/WDCBI01022024.pdf',
];

// Fallback: static data extracted from last known RBI publication
// This is updated manually when RBI changes their publication format
const FALLBACK_SAMPLE_DATA = [
  // Real data populated by seedLocalDBs.js
];

const BATCH_SIZE = 500;

async function downloadRBIDefaulters() {
  const startTime = Date.now();
  logger.info('RBI defaulters refresh started');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  let records = [];

  // ── Try to fetch and parse RBI PDF ─────────────────────────
  try {
    // Step 1: Fetch the RBI listing page to find the latest PDF URL
    const listingRes = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: 'https://www.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=2751',
        render_js: false,
      },
      timeout: 30000,
      responseType: 'text',
    });

    // Extract PDF links using simple regex
    const pdfLinks = (listingRes.data.match(/href="([^"]*\.pdf)"/gi) || [])
      .map(m => m.replace(/href="|"/gi, ''))
      .filter(url => url.toLowerCase().includes('wilful') || url.toLowerCase().includes('defaulter'))
      .slice(0, 3); // Latest 3 publications

    logger.info('Found RBI PDF links', { count: pdfLinks.length });

    // Step 2: Fetch and parse the PDFs
    for (const pdfUrl of pdfLinks) {
      try {
        const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `https://www.rbi.org.in${pdfUrl}`;
        const pdfRes = await axios.get(fullUrl, {
          responseType: 'arraybuffer',
          timeout: 60000,
        });

        // Parse PDF text using pdf-parse
        const pdfParse = require('pdf-parse');
        const pdfData  = await pdfParse(Buffer.from(pdfRes.data));
        const text     = pdfData.text;

        // Extract table rows from PDF text
        // RBI format: "Company Name | PAN | Bank | Amount (Cr) | Status"
        const lines = text.split('\n').filter(l => l.trim().length > 10);
        for (const line of lines) {
          const parts = line.split(/\s{2,}|\|/); // Split on 2+ spaces or pipe
          if (parts.length >= 3) {
            const record = parseRBIRow(parts);
            if (record) records.push(record);
          }
        }

        logger.info('PDF parsed', { url: fullUrl, records: records.length });
      } catch (pdfErr) {
        logger.warn('PDF parse failed', { error: pdfErr.message });
      }
    }
  } catch (fetchErr) {
    logger.warn('RBI fetch failed — using fallback data', { error: fetchErr.message });
    records = FALLBACK_SAMPLE_DATA;
  }

  if (records.length === 0) {
    logger.warn('No RBI records extracted — skipping upsert to prevent data loss');
    await mongoose.disconnect();
    return { processed: 0, note: 'No records — manual update may be required' };
  }

  // ── Bulk upsert ─────────────────────────────────────────────
  const refreshedAt = new Date();
  let processed = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const ops = batch.map(record => ({
      updateOne: {
        filter: { pan: record.pan?.toUpperCase() || undefined, borrower_name: record.borrower_name },
        update: { $set: { ...record, refreshed_at: refreshedAt } },
        upsert: true,
      },
    }));

    try {
      const result = await WilfulDefaulter.bulkWrite(ops, { ordered: false });
      processed += result.upsertedCount + result.modifiedCount;
    } catch (err) {
      logger.warn('RBI batch write failed', { error: err.message });
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  logger.info('RBI defaulters refresh complete', { records: records.length, processed, elapsed_seconds: elapsed });

  await mongoose.disconnect();
  return { processed, total: records.length };
}

function parseRBIRow(parts) {
  // Best-effort extraction from PDF table row
  try {
    const name = parts[0]?.trim();
    if (!name || name.length < 3) return null;
    if (/^(sl\.?|sr\.?|no\.?|name|borrower)/i.test(name)) return null; // Header row

    return {
      borrower_name:      name,
      pan:                parts.find(p => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p?.trim()))?.trim() || null,
      bank_name:          parts[2]?.trim() || null,
      outstanding_amount: parseFloat(parts.find(p => /^\d+\.?\d*$/.test(p?.trim()))) || null,
      category:           'wilful_defaulter',
      reported_date:      new Date(),
    };
  } catch {
    return null;
  }
}

if (require.main === module) {
  downloadRBIDefaulters()
    .then(r => { console.log('✅ RBI refresh complete:', r); process.exit(0); })
    .catch(e => { console.error('❌ RBI refresh failed:', e.message); process.exit(1); });
}

module.exports = { downloadRBIDefaulters };
