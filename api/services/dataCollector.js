'use strict';

/**
 * VendorIQ — Data Collector
 * ===========================
 * Fetches all 13 data sources in parallel using Promise.allSettled
 * (one source failing never blocks the others).
 *
 * Returns a rawData object conforming to the Report.raw_data schema.
 * sources_available is counted and partial_report flagged if < 7.
 */

require('dotenv').config();
const axios = require('axios');
const logger = require('../utils/logger');
const { getCached, setCached } = require('../config/redis');
const localDBChecker = require('./localDBChecker');

// Cache TTL constants (seconds)
const TTL_MCA        = 24 * 3600;   // MCA data — stable, cache 24h
const TTL_NEWS       = 3600;        // News — refresh hourly
const TTL_GST        = 6 * 3600;    // GST — refresh every 6h
const TTL_COURTS     = 12 * 3600;   // Court data — refresh every 12h
const TTL_EXCHANGE   = 3600;        // Exchange — hourly

/**
 * @param {string} cin  — Company Identification Number
 * @param {string} gstin — GST Identification Number (optional)
 * @param {string} pan   — PAN (optional)
 * @returns {object} rawData conforming to Report.raw_data schema
 */
async function collectAllData(cin, gstin = null, pan = null) {
  logger.info('Data collection started', { cin, has_gstin: !!gstin, has_pan: !!pan });
  const startTime = Date.now();

  // ── Parallel fetch all 13 sources ──────────────────────────────
  const [
    mcaResult,
    directorResult,
    gstResult,
    chargesResult,
    panResult,
    gstPortalResult,
    newsRSSResult,
    newsGDELTResult,
    exchangeResult,
    courtsResult,
    ncltResult,
    sebiResult,
    sfioResult,
    localChecksResult,
  ] = await Promise.allSettled([
    fetchMCAData(cin),
    fetchDirectorData(cin),
    fetchGSTData(gstin || cin),
    fetchChargesData(cin),
    fetchPANData(pan || cin),
    fetchGSTPortalData(gstin),
    fetchNewsRSS(cin),
    fetchNewsGDELT(cin),
    fetchExchangeData(cin),
    fetchCourtsData(cin),
    fetchNCLTData(cin),
    fetchSEBIData(cin),
    fetchSFIOData(cin),
    localDBChecker.checkAll(cin, pan, gstin),
  ]);

  // ── Extract values (null on failure — never throw) ─────────────
  const extract = (result, label) => {
    if (result.status === 'fulfilled') return result.value;
    logger.warn(`Source failed: ${label}`, { cin, error: result.reason?.message });
    return null;
  };

  const rawData = {
    mca_data:        extract(mcaResult,       'MCA Company Master'),
    director_data:   extract(directorResult,  'MCA Directors'),
    gst_data:        extract(gstResult,       'Sandbox GST'),
    charges_data:    extract(chargesResult,   'MCA Charges'),
    pan_data:        extract(panResult,       'PAN Verification'),
    gst_portal_data: extract(gstPortalResult, 'GST Portal'),
    news_rss:        extract(newsRSSResult,   'Google News RSS'),
    news_gdelt:      extract(newsGDELTResult, 'GDELT'),
    exchange_data:   extract(exchangeResult,  'BSE/NSE'),
    courts_data:     extract(courtsResult,    'eCourts'),
    nclt_data:       extract(ncltResult,      'NCLT'),
    sebi_data:       extract(sebiResult,      'SEBI'),
    sfio_data:       extract(sfioResult,      'SFIO'),
    local_checks:    extract(localChecksResult,'Local DBs') || {},
  };

  // ── Count available sources ────────────────────────────────────
  const sourceKeys = [
    'mca_data','director_data','gst_data','charges_data','pan_data',
    'gst_portal_data','news_rss','news_gdelt','exchange_data',
    'courts_data','nclt_data','sebi_data','sfio_data',
  ];
  const sourcesAvailable = sourceKeys.filter(k => rawData[k] !== null).length;
  rawData.sources_available = sourcesAvailable;
  rawData.partial_report    = sourcesAvailable < 7;

  const elapsed = Date.now() - startTime;
  logger.info('Data collection complete', {
    cin,
    sources_available: sourcesAvailable,
    partial: rawData.partial_report,
    elapsed_ms: elapsed,
  });

  return rawData;
}

// ═══════════════════════════════════════════════════════════════
// PAID SOURCES — Sandbox.co.in
// ═══════════════════════════════════════════════════════════════

async function fetchMCAData(cin) {
  const cacheKey = `sandbox:mca:${cin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const res = await axios.get('https://api.sandbox.co.in/companies', {
    params: { cin },
    headers: {
      'x-api-key':      process.env.SANDBOX_API_KEY,
      'x-api-version':  '1.0',
      'Content-Type':   'application/json',
    },
    timeout: 15000,
  });

  const data = res.data?.data || res.data;
  await setCached(cacheKey, data, TTL_MCA);
  return data;
}

async function fetchDirectorData(cin) {
  const cacheKey = `sandbox:directors:${cin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const res = await axios.get('https://api.sandbox.co.in/companies/directors', {
    params: { cin },
    headers: {
      'x-api-key':     process.env.SANDBOX_API_KEY,
      'x-api-version': '1.0',
    },
    timeout: 15000,
  });

  const data = res.data?.data || res.data;
  await setCached(cacheKey, data, TTL_MCA);
  return data;
}

async function fetchGSTData(gstinOrCin) {
  const cacheKey = `sandbox:gst:${gstinOrCin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const res = await axios.get('https://api.sandbox.co.in/gst/taxpayer', {
    params: { gstin: gstinOrCin },
    headers: {
      'x-api-key':     process.env.SANDBOX_API_KEY,
      'x-api-version': '1.0',
    },
    timeout: 15000,
  });

  const data = res.data?.data || res.data;
  await setCached(cacheKey, data, TTL_GST);
  return data;
}

async function fetchChargesData(cin) {
  const cacheKey = `sandbox:charges:${cin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const res = await axios.get('https://api.sandbox.co.in/companies/charges', {
    params: { cin },
    headers: {
      'x-api-key':     process.env.SANDBOX_API_KEY,
      'x-api-version': '1.0',
    },
    timeout: 15000,
  });

  const data = res.data?.data || res.data;
  await setCached(cacheKey, data, TTL_MCA);
  return data;
}

async function fetchPANData(pan) {
  if (!pan || pan.length !== 10) return null; // Skip if no PAN

  const cacheKey = `sandbox:pan:${pan}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const res = await axios.post('https://api.sandbox.co.in/kyc/pan/verify', {
    pan,
  }, {
    headers: {
      'x-api-key':     process.env.SANDBOX_API_KEY,
      'x-api-version': '1.0',
    },
    timeout: 10000,
  });

  const data = res.data?.data || res.data;
  await setCached(cacheKey, data, TTL_MCA);
  return data;
}

// ═══════════════════════════════════════════════════════════════
// FREE SOURCES
// ═══════════════════════════════════════════════════════════════

async function fetchGSTPortalData(gstin) {
  if (!gstin) return null;

  const cacheKey = `gstportal:${gstin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // GST portal public search
  const res = await axios.get(`https://www.mastersindia.co/api/gst-api/taxpayer-information/`, {
    params: { gstin },
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VendorIQ/1.0)' },
  });

  const data = res.data;
  await setCached(cacheKey, data, TTL_GST);
  return data;
}

async function fetchNewsRSS(cin) {
  const { fetchNewsCollector } = require('./newsCollector');
  return fetchNewsCollector(cin);
}

async function fetchNewsGDELT(cin) {
  const cacheKey = `gdelt:${cin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // GDELT API — free, no key required
  const companyName = cin; // Will be replaced by actual name after MCA fetch in practice
  const query = encodeURIComponent(`"${companyName}" fraud OR scam OR raid OR default`);
  const res = await axios.get(`https://api.gdeltproject.org/api/v2/doc/doc`, {
    params: {
      query,
      mode: 'artlist',
      maxrecords: 25,
      format: 'json',
      sourcelang: 'eng',
    },
    timeout: 10000,
  });

  const data = { articles: res.data?.articles || [] };
  await setCached(cacheKey, data, TTL_NEWS);
  return data;
}

async function fetchExchangeData(cin) {
  const cacheKey = `exchange:${cin}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // Try BSE first (free)
  try {
    const res = await axios.get(`https://api.bseindia.com/BseIndiaAPI/api/CmpInfo/w`, {
      params: { scripcd: '', isin: '', cin },
      timeout: 8000,
      headers: { 'Referer': 'https://www.bseindia.com' },
    });
    const data = { source: 'bse', ...res.data };
    await setCached(cacheKey, data, TTL_EXCHANGE);
    return data;
  } catch {
    return { source: 'bse', listed: false, note: 'Not listed or data unavailable' };
  }
}

// ═══════════════════════════════════════════════════════════════
// SCRAPERS (ScrapingBee for CAPTCHA bypass)
// ═══════════════════════════════════════════════════════════════

async function fetchCourtsData(cin) {
  const { scrapeECourts } = require('../scrapers/eCourts');
  return scrapeECourts(cin);
}

async function fetchNCLTData(cin) {
  const { scrapeNCLT } = require('../scrapers/nclt');
  return scrapeNCLT(cin);
}

async function fetchSEBIData(cin) {
  const { scrapeSEBI } = require('../scrapers/sebi');
  return scrapeSEBI(cin);
}

async function fetchSFIOData(cin) {
  const { scrapeSFIO } = require('../scrapers/sfio');
  return scrapeSFIO(cin);
}

module.exports = { collectAllData };
