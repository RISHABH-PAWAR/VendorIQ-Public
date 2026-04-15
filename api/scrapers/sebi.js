'use strict';
const axios = require('axios');
const { getCached, setCached } = require('../config/redis');
const logger = require('../utils/logger');
const TTL = 12 * 3600;

async function scrapeSEBI(cin) {
  const cacheKey = `sebi:${cin}:data`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    // SEBI SCORES system (public enforcement orders)
    const res = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: `https://www.sebi.gov.in/enforcement/orders/`,
        render_js: false,
      },
      timeout: 20000,
    });

    const result = {
      enforcement_orders: [],
      active_debarment:   false,
      scraped_at:         new Date().toISOString(),
    };

    await setCached(cacheKey, result, TTL);
    return result;
  } catch (err) {
    logger.warn('SEBI scrape failed', { cin, error: err.message });
    return { enforcement_orders: [], active_debarment: false, error: err.message };
  }
}

module.exports = { scrapeSEBI };
