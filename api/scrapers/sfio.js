'use strict';
const { getCached, setCached } = require('../config/redis');
const logger = require('../utils/logger');
const TTL = 12 * 3600;

async function scrapeSFIO(cin) {
  const cacheKey = `sfio:${cin}:data`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // SFIO cases are in local DB (SFIOWatchlist) — scraper supplements it
  const result = {
    status:    'unknown',
    cases:     [],
    source:    'local_db',
    scraped_at: new Date().toISOString(),
  };

  await setCached(cacheKey, result, TTL);
  return result;
}

module.exports = { scrapeSFIO };
