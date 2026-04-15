'use strict';

/**
 * Cron: Refresh SEBI Enforcement Orders (Daily)
 * ================================================
 * Schedule:  Daily at 00:00 IST (midnight)
 * Source:    SEBI website — enforcement/orders page
 * Action:    Upsert active debarments into SEBIDebarred collection
 * Runtime:   ~2-4 minutes
 *
 * Run manually: node cron/refreshSEBIOrders.js
 */

require('dotenv').config({ path: '../.env' });
const axios    = require('axios');
const cheerio  = require('cheerio');
const mongoose = require('mongoose');
const logger   = require('../utils/logger');
const { SEBIDebarred } = require('../models');

const SEBI_ORDERS_URL = 'https://www.sebi.gov.in/enforcement/orders/Mar-2024/';
const SEBI_DEBARMENT_URL = 'https://www.sebi.gov.in/enforcement/orders/';
const SEBI_API_URL = 'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=5&ssid=43&smid=0';

async function refreshSEBIOrders() {
  const startTime = Date.now();
  logger.info('SEBI enforcement orders refresh started');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const records = [];

  try {
    // Fetch SEBI enforcement page — paginated
    const pages = [1, 2, 3]; // First 3 pages = last ~60 orders
    for (const page of pages) {
      try {
        const res = await axios.get('https://app.scrapingbee.com/api/v1/', {
          params: {
            api_key:   process.env.SCRAPINGBEE_API_KEY,
            url:       `https://www.sebi.gov.in/enforcement/orders/?page=${page}`,
            render_js: false,
          },
          timeout: 30000,
          responseType: 'text',
        });

        const $ = cheerio.load(res.data);

        // Parse enforcement orders table
        $('table.myTable tr, table tr').each((i, row) => {
          if (i === 0) return; // Skip header

          const cells = $(row).find('td');
          if (cells.length < 3) return;

          const orderDate   = $(cells[0]).text().trim();
          const entityName  = $(cells[1]).text().trim();
          const orderDetail = $(cells[2]).text().trim();
          const orderUrl    = $(cells[3]).find('a').attr('href') || '';

          if (!entityName || entityName.length < 3) return;
          if (/^(date|entity|order|sl\.|no\.)/i.test(entityName)) return;

          // Extract PAN from order details if present
          const panMatch = orderDetail.match(/[A-Z]{5}[0-9]{4}[A-Z]/);

          // Determine if debarment is active
          const isDebarment = /debar|restrain|prohibit/i.test(orderDetail);
          if (!isDebarment) return;

          // Parse debarment period
          const dateMatch = orderDetail.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);

          records.push({
            entity_name:   entityName,
            entity_type:   /ltd|limited|pvt|llp|corp/i.test(entityName) ? 'company' : 'individual',
            pan:           panMatch ? panMatch[0] : null,
            order_date:    orderDate ? new Date(orderDate) : new Date(),
            debarment_type:'securities_market',
            debarment_period: {
              from:  dateMatch?.[0] ? new Date(dateMatch[0]) : new Date(),
              until: dateMatch?.[1] ? new Date(dateMatch[1]) : null,
            },
            is_active:     true,
            order_url:     orderUrl.startsWith('http') ? orderUrl : `https://www.sebi.gov.in${orderUrl}`,
            refreshed_at:  new Date(),
          });
        });

        logger.info('SEBI page processed', { page, records: records.length });

        // Respect rate limit
        await new Promise(r => setTimeout(r, 2000));
      } catch (pageErr) {
        logger.warn('SEBI page failed', { page, error: pageErr.message });
      }
    }
  } catch (err) {
    logger.error('SEBI fetch failed', { error: err.message });
  }

  if (records.length === 0) {
    logger.warn('No SEBI records found — existing data preserved');
    await mongoose.disconnect();
    return { processed: 0 };
  }

  // ── Upsert ──────────────────────────────────────────────────
  const refreshedAt = new Date();
  let processed = 0;

  const ops = records.map(record => ({
    updateOne: {
      filter: record.pan
        ? { pan: record.pan }
        : { entity_name: record.entity_name, order_date: record.order_date },
      update: { $set: record },
      upsert: true,
    },
  }));

  try {
    const result = await SEBIDebarred.bulkWrite(ops, { ordered: false });
    processed = result.upsertedCount + result.modifiedCount;
  } catch (err) {
    logger.error('SEBI bulk write failed', { error: err.message });
  }

  // Check if debarment periods have expired — mark inactive
  await SEBIDebarred.updateMany(
    { 'debarment_period.until': { $lt: new Date(), $ne: null }, is_active: true },
    { $set: { is_active: false } }
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  logger.info('SEBI refresh complete', { records: records.length, processed, elapsed_seconds: elapsed });

  await mongoose.disconnect();
  return { processed, total: records.length };
}

if (require.main === module) {
  refreshSEBIOrders()
    .then(r => { console.log('✅ SEBI refresh complete:', r); process.exit(0); })
    .catch(e => { console.error('❌ SEBI refresh failed:', e.message); process.exit(1); });
}

module.exports = { refreshSEBIOrders };
