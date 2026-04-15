'use strict';

/**
 * VendorIQ — News Collector
 * ==========================
 * Fetches 6 targeted Google News RSS queries for a company.
 * Deduplicates by URL. Adds basic sentiment tag.
 * Free — no API key required.
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { getCached, setCached } = require('../config/redis');
const logger = require('../utils/logger');

const TTL_NEWS = 3600; // 1 hour cache

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const NEGATIVE_KEYWORDS = [
  'fraud', 'scam', 'arrested', 'arrest', 'raid', 'cbi', 'enforcement directorate',
  'ed raid', 'income tax', 'money laundering', 'hawala', 'ponzi', 'cheating',
  'fir', 'chargesheet', 'default', 'insolvency', 'bankrupt', 'sebi', 'penalty',
  'court case', 'lawsuit', 'criminal', 'bribery', 'corruption',
];

const POSITIVE_KEYWORDS = [
  'award', 'won contract', 'expansion', 'growth', 'profit', 'revenue',
  'export award', 'ipo', 'acquisition', 'certified', 'partnership',
];

/**
 * @param {string} cin
 * @param {string} [companyName] — use actual name if available, else CIN
 */
async function fetchNewsCollector(cin, companyName = null) {
  const query = companyName || cin;
  const cacheKey = `news:rss:${cin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // 6 targeted RSS queries
  const searchQueries = [
    `"${query}"`,
    `"${query}" fraud OR scam OR raid`,
    `"${query}" court case OR lawsuit`,
    `"${query}" SEBI OR RBI OR ED`,
    `"${query}" insolvency OR default`,
    `"${query}" award OR contract OR expansion`,
  ];

  const articleMap = new Map(); // URL dedup

  await Promise.allSettled(searchQueries.map(async (q) => {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
      const res = await axios.get(rssUrl, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VendorIQ/1.0)' },
      });

      const parsed = xmlParser.parse(res.data);
      const items = parsed?.rss?.channel?.item || [];
      const itemArray = Array.isArray(items) ? items : [items];

      for (const item of itemArray) {
        const url = item.link || item.guid;
        if (!url || articleMap.has(url)) continue;

        const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
        const isNegative = NEGATIVE_KEYWORDS.some(kw => text.includes(kw));
        const isPositive = POSITIVE_KEYWORDS.some(kw => text.includes(kw));

        articleMap.set(url, {
          title:       item.title || '',
          url,
          source:      item.source?.['#text'] || item.source || 'Google News',
          published_at:item.pubDate ? new Date(item.pubDate).toISOString() : null,
          description: item.description || '',
          sentiment:   isNegative ? 'negative' : isPositive ? 'positive' : 'neutral',
        });
      }
    } catch (err) {
      logger.warn('RSS query failed', { query: q, error: err.message });
    }
  }));

  // Sort: negative first, then by date desc
  const articles = Array.from(articleMap.values())
    .sort((a, b) => {
      if (a.sentiment === 'negative' && b.sentiment !== 'negative') return -1;
      if (b.sentiment === 'negative' && a.sentiment !== 'negative') return 1;
      return new Date(b.published_at) - new Date(a.published_at);
    })
    .slice(0, 50); // Cap at 50 articles

  const result = {
    articles,
    total: articles.length,
    negative_count: articles.filter(a => a.sentiment === 'negative').length,
    positive_count: articles.filter(a => a.sentiment === 'positive').length,
    fetched_at: new Date().toISOString(),
  };

  await setCached(cacheKey, result, TTL_NEWS);
  logger.info('News collected', { cin, total: result.total, negative: result.negative_count });
  return result;
}

module.exports = { fetchNewsCollector };
