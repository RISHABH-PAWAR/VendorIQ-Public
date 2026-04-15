'use strict';

/**
 * VendorIQ — Local DB Checker
 * ============================
 * Performs instant O(1) lookups against 5 locally-cached government databases.
 * No API calls — all data is synced by cron jobs.
 *
 * Returns: LocalChecks object (matches Report.raw_data.local_checks schema)
 *
 * This is the layer that catches:
 *   STRUCK_OFF → from MCA data (not here, from Sandbox)
 *   DISQUALIFIED_DIN → DisqualifiedDIN collection ← here
 *   NCLT_CIRP → NCLTWatchlist (approximated) ← here
 *   SFIO_INVESTIGATION → SFIOWatchlist ← here
 *   RBI_DEFAULTER → WilfulDefaulter ← here
 *   SEBI_DEBARRED → SEBIDebarred ← here
 *   GEM_BLACKLISTED → GeMBlacklist ← here (affects Legal score)
 */

const {
  DisqualifiedDIN,
  WilfulDefaulter,
  SFIOWatchlist,
  SEBIDebarred,
  GeMBlacklist,
} = require('../models');
const logger = require('../utils/logger');

/**
 * Check all local DBs for a company.
 * @param {string} cin
 * @param {string|null} pan
 * @param {string|null} gstin
 * @param {string[]} directorDins - DINs from MCA director fetch
 * @returns {object} LocalChecks
 */
async function checkAll(cin, pan = null, gstin = null, directorDins = []) {
  const [
    disqDins,
    rbiDefaulter,
    sfioActive,
    sebiDebarred,
    gemBlacklisted,
  ] = await Promise.allSettled([
    checkDisqualifiedDINs(directorDins),
    checkRBIDefaulter(cin, pan),
    checkSFIO(cin, pan),
    checkSEBI(cin, pan),
    checkGeM(cin, gstin, pan),
  ]);

  const extract = (r, fallback) => r.status === 'fulfilled' ? r.value : fallback;

  const result = {
    disqualified_dins: extract(disqDins,     []),
    rbi_defaulter:     extract(rbiDefaulter, false),
    sfio_active:       extract(sfioActive,   false),
    sebi_debarred:     extract(sebiDebarred, false),
    gem_blacklisted:   extract(gemBlacklisted, false),
    nclt_active:       false, // Populated by NCLT scraper — not local DB
    checked_at:        new Date().toISOString(),
  };

  const flags = Object.entries(result)
    .filter(([k, v]) => k !== 'checked_at' && k !== 'nclt_active' && (Array.isArray(v) ? v.length > 0 : v === true))
    .map(([k]) => k);

  if (flags.length > 0) {
    logger.warn('Local DB flags found', { cin, flags });
  }

  return result;
}

async function checkDisqualifiedDINs(dins) {
  if (!dins || dins.length === 0) return [];
  const found = await DisqualifiedDIN.find({ din: { $in: dins } }).select('din director_name').lean();
  return found.map(d => d.din);
}

async function checkRBIDefaulter(cin, pan) {
  const conditions = [];
  if (cin) conditions.push({ cin });
  if (pan) conditions.push({ pan: pan.toUpperCase() });
  if (conditions.length === 0) return false;

  const found = await WilfulDefaulter.findOne({ $or: conditions }).lean();
  return !!found;
}

async function checkSFIO(cin, pan) {
  const conditions = [];
  if (cin) conditions.push({ cin, investigation_status: 'active' });
  if (pan) conditions.push({ pan: pan.toUpperCase(), investigation_status: 'active' });
  if (conditions.length === 0) return false;

  const found = await SFIOWatchlist.findOne({ $or: conditions }).lean();
  return !!found;
}

async function checkSEBI(cin, pan) {
  const conditions = [];
  if (cin) conditions.push({ cin, is_active: true });
  if (pan) conditions.push({ pan: pan.toUpperCase(), is_active: true });
  if (conditions.length === 0) return false;

  const found = await SEBIDebarred.findOne({ $or: conditions }).lean();
  return !!found;
}

async function checkGeM(cin, gstin, pan) {
  const conditions = [];
  if (cin)   conditions.push({ cin, is_active: true });
  if (gstin) conditions.push({ gstin, is_active: true });
  if (pan)   conditions.push({ pan: pan.toUpperCase(), is_active: true });
  if (conditions.length === 0) return false;

  const found = await GeMBlacklist.findOne({ $or: conditions }).lean();
  return !!found;
}

module.exports = { checkAll };
