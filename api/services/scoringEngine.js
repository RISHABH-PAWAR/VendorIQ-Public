'use strict';

/**
 * VendorIQ — VHS (Vendor Health Score) Scoring Engine
 * =====================================================
 * VHS = (Financial × 0.30) + (Legal × 0.25) + (GST × 0.20) + (Directors × 0.15) + (Market × 0.10)
 *
 * 6 Hard Disqualifiers → instant VHS = 0, no further scoring
 * Risk Bands: 0-40 HIGH | 41-65 MEDIUM | 66-100 LOW
 *
 * NEVER change weights — hardcoded as named constants only.
 */

const logger = require('../utils/logger');

// ── Weights — NEVER change these values ───────────────────────
const W_FINANCIAL  = 0.30;
const W_LEGAL      = 0.25;
const W_GST        = 0.20;
const W_DIRECTORS  = 0.15;
const W_MARKET     = 0.10;

// ── Hard Disqualifier Codes ────────────────────────────────────
const HARD_DISQUALIFIERS = [
  'STRUCK_OFF',
  'DISQUALIFIED_DIN',
  'NCLT_CIRP',
  'SFIO_INVESTIGATION',
  'RBI_DEFAULTER',
  'SEBI_DEBARRED',
];

/**
 * Main entry point.
 * @param {object} rawData - Collected data from all 13 sources + local checks
 * @returns {object} { vhs_score, risk_level, recommendation, breakdown, hard_flags, key_flags, confidence }
 */
function calculateVHS(rawData) {
  logger.info('VHS calculation started', { cin: rawData?.mca_data?.cin });

  // ── Step 1: Hard disqualifier check (instant VHS = 0) ─────────
  const hard_flags = checkHardDisqualifiers(rawData);
  if (hard_flags.length > 0) {
    logger.warn('Hard disqualifier triggered — VHS = 0', {
      cin: rawData?.mca_data?.cin,
      flags: hard_flags.map(f => f.code),
    });
    return {
      vhs_score:    0,
      risk_level:   'HIGH',
      recommendation: 'REJECT',
      breakdown:    { financial: 0, legal: 0, gst: 0, directors: 0, market: 0 },
      hard_flags,
      key_flags:    [],
      confidence:   calcConfidence(rawData),
    };
  }

  // ── Step 2: Score all 5 dimensions ────────────────────────────
  const financial  = scoreFinancial(rawData);
  const legal      = scoreLegal(rawData);
  const gst        = scoreGST(rawData);
  const directors  = scoreDirectors(rawData);
  const market     = scoreMarket(rawData);

  // ── Step 3: Weighted composite ────────────────────────────────
  const raw = (
    (financial.score  * W_FINANCIAL) +
    (legal.score      * W_LEGAL) +
    (gst.score        * W_GST) +
    (directors.score  * W_DIRECTORS) +
    (market.score     * W_MARKET)
  );

  const vhs_score = Math.round(Math.min(100, Math.max(0, raw)));
  const risk_level = getRiskLevel(vhs_score);
  const confidence = calcConfidence(rawData);

  // ── Step 4: Collect non-fatal key flags ───────────────────────
  const key_flags = [
    ...financial.flags,
    ...legal.flags,
    ...gst.flags,
    ...directors.flags,
    ...market.flags,
  ].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  const result = {
    vhs_score,
    risk_level,
    recommendation: getRecommendation(vhs_score, key_flags),
    breakdown: {
      financial:  Math.round(financial.score),
      legal:      Math.round(legal.score),
      gst:        Math.round(gst.score),
      directors:  Math.round(directors.score),
      market:     Math.round(market.score),
    },
    hard_flags:  [], // No hard disqualifiers triggered
    key_flags,
    confidence,
  };

  logger.info('VHS calculation complete', {
    cin: rawData?.mca_data?.cin,
    vhs_score,
    risk_level,
    confidence,
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// HARD DISQUALIFIER CHECKS
// ═══════════════════════════════════════════════════════════════

function checkHardDisqualifiers(rawData) {
  const flags = [];

  // 1. STRUCK_OFF — Company status from MCA
  const status = rawData?.mca_data?.company_status?.toLowerCase?.() || '';
  if (status.includes('struck off') || status.includes('struck_off') || status === 'dissolved') {
    flags.push({ code: 'STRUCK_OFF', severity: 'CRITICAL', message: 'Company is struck off from MCA records' });
  }

  // 2. DISQUALIFIED_DIN — Any director in local DIN disqualification list
  const disqDins = rawData?.local_checks?.disqualified_dins || [];
  if (disqDins.length > 0) {
    flags.push({
      code: 'DISQUALIFIED_DIN',
      severity: 'CRITICAL',
      message: `${disqDins.length} director(s) have disqualified DINs under Section 164(2)`,
    });
  }

  // 3. NCLT_CIRP — Active insolvency proceedings
  const ncltActive = rawData?.local_checks?.nclt_active ||
    rawData?.nclt_data?.cirp_status === 'admitted';
  if (ncltActive) {
    flags.push({ code: 'NCLT_CIRP', severity: 'CRITICAL', message: 'Active NCLT CIRP insolvency proceedings' });
  }

  // 4. SFIO_INVESTIGATION — Active fraud investigation
  const sfioActive = rawData?.local_checks?.sfio_active ||
    rawData?.sfio_data?.status === 'active';
  if (sfioActive) {
    flags.push({ code: 'SFIO_INVESTIGATION', severity: 'CRITICAL', message: 'Active SFIO fraud investigation' });
  }

  // 5. RBI_DEFAULTER — Wilful defaulter
  const rbiDefaulter = rawData?.local_checks?.rbi_defaulter;
  if (rbiDefaulter) {
    flags.push({ code: 'RBI_DEFAULTER', severity: 'CRITICAL', message: 'Listed as RBI wilful defaulter' });
  }

  // 6. SEBI_DEBARRED — Active debarment order
  const sebiDebarred = rawData?.local_checks?.sebi_debarred;
  if (sebiDebarred) {
    flags.push({ code: 'SEBI_DEBARRED', severity: 'CRITICAL', message: 'Active SEBI debarment order' });
  }

  return flags;
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION SCORERS  (each returns { score: 0-100, flags: [] })
// ═══════════════════════════════════════════════════════════════

function scoreFinancial(rawData) {
  let score = 70; // Start neutral — no news is good news for private cos
  const flags = [];

  const mca = rawData?.mca_data || {};
  const charges = rawData?.charges_data || {};

  // Age penalty/bonus
  const incorporationDate = mca?.date_of_incorporation
    ? new Date(mca.date_of_incorporation)
    : null;
  if (incorporationDate) {
    const ageYears = (Date.now() - incorporationDate) / (365.25 * 24 * 3600 * 1000);
    if (ageYears < 1) {
      score -= 25;
      flags.push({ severity: 'HIGH', message: 'Company incorporated less than 1 year ago' });
    } else if (ageYears < 2) {
      score -= 15;
      flags.push({ severity: 'MEDIUM', message: 'Company is less than 2 years old — limited track record' });
    } else if (ageYears >= 10) {
      score += 10; // Established company bonus
    }
  }

  // Charges (secured creditors) — support both field name conventions
  const openCharges = charges?.open_charges_count ?? charges?.open_charges ?? 0;
  const satisfiedCharges = charges?.satisfied_charges_count ?? charges?.satisfied_charges ??
    Math.max(0, (charges?.total_charges ?? 0) - openCharges);
  if (openCharges > 10) {
    score -= 20;
    flags.push({ severity: 'HIGH', message: `${openCharges} open charges registered — high debt burden` });
  } else if (openCharges > 5) {
    score -= 10;
    flags.push({ severity: 'MEDIUM', message: `${openCharges} open charges registered` });
  } else if (openCharges > 0) {
    score -= 5;
  }

  // Charge satisfaction ratio (healthy = mostly satisfied)
  const totalCharges = openCharges + satisfiedCharges;
  if (totalCharges > 0) {
    const satisfactionRate = satisfiedCharges / totalCharges;
    if (satisfactionRate > 0.8) score += 5; // Good repayment history
  }

  // Authorized vs paid-up capital
  const authorisedCapital = mca?.authorised_capital || 0;
  const paidUpCapital = mca?.paid_up_capital || 0;
  if (paidUpCapital > 0 && paidUpCapital < 100000) { // < ₹1 lakh
    score -= 15;
    flags.push({ severity: 'MEDIUM', message: `Very low paid-up capital: ₹${(paidUpCapital/100).toLocaleString('en-IN')}` });
  }

  return { score: clamp(score), flags };
}

function scoreLegal(rawData) {
  let score = 75;
  const flags = [];

  const courts = rawData?.courts_data || {};
  const nclt = rawData?.nclt_data || {};
  const sebi = rawData?.sebi_data || {};

  // eCourts cases — support both field name conventions
  const activeCases   = courts?.active_cases_count ?? courts?.pending_cases  ?? rawData?.legal_data?.pending_cases ?? 0;
  const totalCases    = courts?.total_cases_count  ?? courts?.court_cases    ?? rawData?.legal_data?.court_cases   ?? 0;
  const criminalCases = courts?.criminal_cases_count ?? 0;

  if (activeCases > 20) {
    flags.push({ severity: 'HIGH', message: `${activeCases} active court cases — significant litigation exposure` });
  } else if (activeCases > 10) {
    score -= 20;
    flags.push({ severity: 'HIGH', message: `${activeCases} active court cases` });
  } else if (activeCases > 5) {
    score -= 12;
    flags.push({ severity: 'MEDIUM', message: `${activeCases} active court cases` });
  } else if (activeCases > 0) {
    score -= 5;
  }

  // Criminal cases are worse than civil
  if (criminalCases > 0) {
    score -= Math.min(25, criminalCases * 8);
    flags.push({ severity: 'HIGH', message: `${criminalCases} criminal case(s) found` });
  }

  // NCLT (non-CIRP) — winding up petitions, appeals
  const ncltPetitions = nclt?.winding_up_petitions ?? 0;
  if (ncltPetitions > 0) {
    score -= 20;
    flags.push({ severity: 'HIGH', message: `${ncltPetitions} NCLT winding-up petition(s) pending` });
  }

  // GeM blacklist
  if (rawData?.local_checks?.gem_blacklisted) {
    score -= 25;
    flags.push({ severity: 'HIGH', message: 'Blacklisted on Government e-Marketplace (GeM)' });
  }

  return { score: clamp(score), flags };
}

function scoreGST(rawData) {
  let score = 70;
  const flags = [];

  const gst = rawData?.gst_data || rawData?.gst_portal_data || {};

  // GST registration status
  const gstStatus = gst?.gstin_status?.toLowerCase?.() || '';
  if (gstStatus === 'cancelled' || gstStatus === 'suspended') {
    score -= 40;
    flags.push({ severity: 'HIGH', message: `GST registration is ${gstStatus}` });
    return { score: clamp(score), flags };
  }

  // Filing compliance — handle both filing_history array and summary fields
  const filings = gst?.filing_history || [];
  const last12 = filings.slice(0, 12);
  
  // Also check summary-level fields (from Sandbox API response)
  const filingStatus = gst?.return_filing_status?.toLowerCase?.() || '';
  const pendingReturns = gst?.pending_returns ?? 0;
  const lastFiledDate = gst?.last_filed ? new Date(gst.last_filed) : null;
  const daysSinceLastFiling = lastFiledDate
    ? (Date.now() - lastFiledDate.getTime()) / (24 * 3600 * 1000)
    : null;

  // Use filing_history if rich enough, else fall back to summary fields
  if (last12.length > 0) {
    const filed = last12.filter(f => f.filed).length;
    const complianceRate = filed / last12.length;

    if (complianceRate >= 0.95) {
      score += 15; // Excellent filer
    } else if (complianceRate >= 0.80) {
      score += 5;
    } else if (complianceRate >= 0.60) {
      score -= 15;
      flags.push({ severity: 'MEDIUM', message: `GST compliance rate: ${Math.round(complianceRate * 100)}% in last 12 months` });
    } else {
      score -= 30;
      flags.push({ severity: 'HIGH', message: `Poor GST compliance: only ${Math.round(complianceRate * 100)}% returns filed` });
    }

    // Late filing check
    const late = last12.filter(f => f.filed && f.days_late > 30).length;
    if (late > 3) {
      score -= 10;
      flags.push({ severity: 'LOW', message: `${late} returns filed more than 30 days late` });
    }
  } else {
    // No detailed filing history — use summary fields
    if (filingStatus === 'irregular') {
      score -= 20;
      flags.push({ severity: 'MEDIUM', message: 'GST return filing is irregular' });
    } else if (filingStatus === 'none' || filingStatus === 'never filed') {
      score -= 35;
      flags.push({ severity: 'HIGH', message: 'No GST returns ever filed' });
    } else if (filingStatus === 'regular') {
      score += 10; // Confirmed regular filer
    }

    if (pendingReturns >= 6) {
      score -= 20;
      flags.push({ severity: 'HIGH', message: `${pendingReturns} GST returns pending — serious non-compliance` });
    } else if (pendingReturns >= 3) {
      score -= 12;
      flags.push({ severity: 'MEDIUM', message: `${pendingReturns} GST returns pending` });
    } else if (pendingReturns > 0) {
      score -= 5;
      flags.push({ severity: 'LOW', message: `${pendingReturns} GST return(s) pending` });
    }

    if (daysSinceLastFiling !== null && daysSinceLastFiling > 90) {
      score -= 10;
      flags.push({ severity: 'MEDIUM', message: `Last GST filing was ${Math.round(daysSinceLastFiling)} days ago` });
    }

    if (!filingStatus && pendingReturns === 0 && !lastFiledDate) {
      // No GST data at all — minor penalty (common for small private cos)
      score -= 5;
    }
  }

  // PAN verified
  const panVerified = rawData?.pan_data?.status?.toLowerCase?.() === 'valid' ||
                      rawData?.pan_data?.valid === true;
  if (!panVerified && rawData?.pan_data !== null) {
    score -= 10;
    flags.push({ severity: 'MEDIUM', message: 'PAN verification failed or mismatched' });
  }

  return { score: clamp(score), flags };
}

function scoreDirectors(rawData) {
  let score = 75;
  const flags = [];

  const directors = rawData?.director_data?.directors || [];

  if (directors.length === 0) {
    return { score: clamp(score), flags }; // No data — no penalty
  }

  // Single director company (higher key-man risk)
  if (directors.length === 1) {
    score -= 10;
    flags.push({ severity: 'LOW', message: 'Single director — key-man concentration risk' });
  }

  // Director age check (very young directors in high-stakes roles)
  const youngDirectors = directors.filter(d => {
    if (!d.date_of_birth) return false;
    const age = (Date.now() - new Date(d.date_of_birth)) / (365.25 * 24 * 3600 * 1000);
    return age < 25;
  });
  if (youngDirectors.length > 0) {
    score -= 8;
    flags.push({ severity: 'LOW', message: `${youngDirectors.length} director(s) under 25 years old` });
  }

  // Multiple directorships (shell company indicator if > 20 companies)
  const highDirectors = directors.filter(d => (d.number_of_directorships || 0) > 20);
  if (highDirectors.length > 0) {
    score -= 15;
    flags.push({ severity: 'MEDIUM', message: `${highDirectors.length} director(s) with 20+ other directorships — possible shell company indicator` });
  }

  // Resigned directors in last 6 months (red flag)
  const recentResignations = directors.filter(d => {
    if (!d.cessation_date) return false;
    const resignedDaysAgo = (Date.now() - new Date(d.cessation_date)) / (24 * 3600 * 1000);
    return resignedDaysAgo <= 180;
  });
  if (recentResignations.length > 1) {
    score -= 15;
    flags.push({ severity: 'MEDIUM', message: `${recentResignations.length} directors resigned in last 6 months` });
  }

  return { score: clamp(score), flags };
}

function scoreMarket(rawData) {
  let score = 65; // Start conservative — negative news is common
  const flags = [];

  const news = [
    ...(rawData?.news_rss?.articles || []),
    ...(rawData?.news_gdelt?.articles || []),
  ];

  if (news.length === 0) {
    return { score: clamp(score), flags }; // No news = no market signal
  }

  // Sentiment analysis via keyword matching
  const negativeKeywords = [
    'fraud', 'scam', 'arrested', 'raid', 'cbi', 'enforcement directorate', 'ed raid',
    'income tax raid', 'money laundering', 'hawala', 'ponzi', 'cheating case',
    'fir filed', 'chargesheet', 'default', 'insolvency', 'bankrupt',
    'sebi notice', 'penalty imposed',
  ];
  const positiveKeywords = [
    'award', 'contract won', 'expansion', 'growth', 'profit', 'revenue increase',
    'ipo', 'acquisition', 'partnership', 'certified', 'export award',
  ];

  let negCount = 0;
  let posCount = 0;

  for (const article of news) {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    const hasNegative = negativeKeywords.some(kw => text.includes(kw));
    const hasPositive = positiveKeywords.some(kw => text.includes(kw));
    if (hasNegative) negCount++;
    if (hasPositive) posCount++;
  }

  if (negCount >= 5) {
    score -= 30;
    flags.push({ severity: 'HIGH', message: `${negCount} negative news articles found — fraud/legal keywords detected` });
  } else if (negCount >= 2) {
    score -= 15;
    flags.push({ severity: 'MEDIUM', message: `${negCount} negative news articles found` });
  } else if (negCount === 1) {
    score -= 7;
    flags.push({ severity: 'LOW', message: '1 negative news article found — review recommended' });
  }

  if (posCount >= 3) {
    score += 10;
  } else if (posCount >= 1) {
    score += 5;
  }

  return { score: clamp(score), flags };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(score) {
  return Math.max(0, Math.min(100, score));
}

function getRiskLevel(vhs) {
  if (vhs >= 66) return 'LOW';
  if (vhs >= 41) return 'MEDIUM';
  return 'HIGH';
}

function getRecommendation(vhs, keyFlags) {
  const hasCritical = keyFlags.some(f => f.severity === 'CRITICAL');
  const hasHigh = keyFlags.some(f => f.severity === 'HIGH');

  if (vhs >= 80) return 'APPROVE';
  if (vhs >= 66) return hasCritical ? 'INVESTIGATE' : (hasHigh ? 'APPROVE_WITH_CONDITIONS' : 'APPROVE');
  if (vhs >= 41) return 'INVESTIGATE';
  return 'REJECT';
}

function calcConfidence(rawData) {
  const sources = rawData?.sources_available ?? 0;
  return Math.round((Math.min(sources, 13) / 13) * 100);
}

function severityOrder(severity) {
  return { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[severity] ?? 4;
}

module.exports = { calculateVHS };
