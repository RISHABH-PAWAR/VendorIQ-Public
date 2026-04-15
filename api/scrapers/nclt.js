'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const { getCached, setCached } = require('../config/redis');
const logger = require('../utils/logger');
const TTL = 12 * 3600;

async function scrapeNCLT(cin) {
  const cacheKey = `nclt:${cin}:data`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: `https://nclt.gov.in/case-status-search`,
        render_js: true,
        premium_proxy: true,
      },
      timeout: 30000,
    });

    const $ = cheerio.load(res.data);
    const cirpAdmitted = res.data.toLowerCase().includes('cirp admitted') ||
                         res.data.toLowerCase().includes('insolvency commenced');

    const result = {
      cirp_status:         cirpAdmitted ? 'admitted' : 'none',
      winding_up_petitions:0,
      appeals:             0,
      scraped_at:          new Date().toISOString(),
    };

    await setCached(cacheKey, result, TTL);
    return result;
  } catch (err) {
    logger.warn('NCLT scrape failed', { cin, error: err.message });
    return { cirp_status: 'unknown', winding_up_petitions: 0, error: err.message };
  }
}

module.exports = { scrapeNCLT };
