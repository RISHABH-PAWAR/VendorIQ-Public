'use strict';
/**
 * eCourts India Scraper
 * Uses ScrapingBee for CAPTCHA bypass (~5 credits per search)
 * Free tier: 1,000 credits = ~200 CIN searches/month
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { getCached, setCached } = require('../config/redis');
const logger = require('../utils/logger');

const TTL = 12 * 3600;

async function scrapeECourts(cin) {
  const cacheKey = `courts:${cin}:data`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: `https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index&app_token=`,
        render_js: true,
        premium_proxy: true,
        country_code: 'IN',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(res.data);
    // Parse case table — structure varies by court
    const cases = [];
    $('table.case_details tr').each((i, row) => {
      if (i === 0) return; // Skip header
      const cells = $(row).find('td');
      if (cells.length >= 4) {
        cases.push({
          case_number: $(cells[0]).text().trim(),
          case_type:   $(cells[1]).text().trim(),
          status:      $(cells[3]).text().trim(),
          is_active:   !$(cells[3]).text().toLowerCase().includes('disposed'),
        });
      }
    });

    const result = {
      total_cases_count:  cases.length,
      active_cases_count: cases.filter(c => c.is_active).length,
      criminal_cases_count: cases.filter(c => c.case_type?.toLowerCase().includes('criminal')).length,
      cases: cases.slice(0, 20), // Store first 20 for report
      scraped_at: new Date().toISOString(),
    };

    await setCached(cacheKey, result, TTL);
    return result;
  } catch (err) {
    logger.warn('eCourts scrape failed', { cin, error: err.message });
    return { total_cases_count: 0, active_cases_count: 0, criminal_cases_count: 0, cases: [], error: err.message };
  }
}

module.exports = { scrapeECourts };
