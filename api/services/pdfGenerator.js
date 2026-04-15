'use strict';

/**
 * VendorIQ — PDF Generator (Puppeteer)
 * Generates a professional dark-themed PDF from a completed Report.
 * Pages: Cover → Score Breakdown → Flags & Directors → Narrative → Cases + Disclaimer
 * Returns: Buffer (PDF bytes) for S3 upload
 */

const puppeteer = require('puppeteer');
const logger    = require('../utils/logger');

const RISK_COLORS = {
  LOW:    { bg: '#16A34A', light: '#DCFCE7', text: '#14532D' },
  MEDIUM: { bg: '#F59E0B', light: '#FEF3C7', text: '#78350F' },
  HIGH:   { bg: '#DC2626', light: '#FEE2E2', text: '#7F1D1D' },
};

async function generatePDF(report) {
  const startTime = Date.now();
  logger.info('PDF generation started', { report_id: report.report_id });

  const html = buildHTML(report);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const elapsed = Date.now() - startTime;
    logger.info('PDF generated', {
      report_id: report.report_id,
      size_kb: Math.round(pdfBuffer.length / 1024),
      elapsed_ms: elapsed,
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}

function buildHTML(report) {
  const risk      = report.risk_level || 'HIGH';
  const vhs       = report.vhs_score ?? 0;
  const colors    = RISK_COLORS[risk] || RISK_COLORS.HIGH;
  const breakdown = report.vhs_breakdown || {};
  const hardFlags = report.hard_flags || [];
  const keyFlags  = report.key_flags  || [];
  const directors = report.raw_data?.director_data?.directors || [];
  const cases     = report.similar_cases || [];
  const narrative = report.narrative || 'Report narrative unavailable.';
  const conditions= report.conditions || [];
  const reasons   = report.recommendation_reasons || [];
  const generated = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
  const sources   = report.raw_data?.sources_available || 0;

  // VHS gauge needle
  const angle   = ((vhs / 100) * 180) - 90;
  const radians = angle * (Math.PI / 180);
  const nx = (100 + 80 * Math.cos(radians)).toFixed(1);
  const ny = (100 + 80 * Math.sin(radians)).toFixed(1);
  const largeArc = vhs > 50 ? 1 : 0;

  const scoreBar = (label, score, weight) => {
    const pct   = score ?? 0;
    const color = pct >= 66 ? '#16A34A' : pct >= 41 ? '#F59E0B' : '#DC2626';
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
        <span style="font-weight:600">${label}</span>
        <span style="color:#94a3b8">${(weight*100).toFixed(0)}% weight</span>
        <span style="font-weight:700;color:${color}">${pct}/100</span>
      </div>
      <div style="height:8px;background:#e2e8f0;border-radius:8px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:8px"></div>
      </div>
    </div>`;
  };

  const formatNarrative = (text) => {
    if (!text) return '<p>Narrative unavailable.</p>';
    let html = text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
    return html.split(/\n\n+/).filter(p=>p.trim()).map(p => {
      const t = p.trim();
      if (t.startsWith('<strong>') && !t.includes('</strong><')) {
        return `<h3 style="margin:16px 0 6px;font-size:13px;color:#0f172a">${t}</h3>`;
      }
      return `<p style="margin-bottom:12px">${t}</p>`;
    }).join('');
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#1e293b}
  .page{width:210mm;min-height:297mm;page-break-after:always}
  .page:last-child{page-break-after:auto}
  th{background:#f1f5f9;padding:7px 10px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#64748b}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}
  .badge{font-size:10px;padding:2px 8px;border-radius:100px;font-weight:600}
</style>
</head><body>

<!-- PAGE 1: COVER -->
<div class="page" style="background:linear-gradient(160deg,#0f172a,#1e293b);color:#fff;display:flex;flex-direction:column">
  <div style="padding:28px 36px 0;display:flex;justify-content:space-between;align-items:flex-start">
    <div style="font-size:18px;font-weight:700">Vendor<span style="color:#1A56DB">IQ</span></div>
    <div style="text-align:right;font-size:10px;color:#94a3b8;line-height:1.8">
      <div>VENDOR DUE DILIGENCE REPORT</div>
      <div>Generated: ${generated}</div>
      <div>Report ID: ${report.report_id || ''}</div>
      <div>Confidential</div>
    </div>
  </div>

  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 36px">
    <div style="font-size:26px;font-weight:700;text-align:center;margin-bottom:6px;line-height:1.2">${report.vendor_name || 'Unknown Company'}</div>
    <div style="font-size:12px;color:#94a3b8;margin-bottom:36px;font-family:monospace">CIN: ${report.vendor_cin || ''}</div>

    <!-- Gauge -->
    <div style="position:relative;width:200px;height:110px;margin-bottom:20px">
      <svg viewBox="0 0 200 110" width="200" height="110" style="overflow:visible">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" stroke-width="16" stroke-linecap="round"/>
        <path d="M 20 100 A 80 80 0 ${largeArc} 1 ${nx} ${ny}" fill="none" stroke="${colors.bg}" stroke-width="16" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);text-align:center">
        <div style="font-size:46px;font-weight:800;color:${colors.bg};line-height:1">${vhs}</div>
        <div style="font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase">VHS Score</div>
      </div>
    </div>

    <div style="padding:8px 28px;border-radius:100px;font-size:14px;font-weight:700;letter-spacing:1px;background:${colors.bg};color:#fff;margin-bottom:20px">${risk} RISK</div>

    <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 32px;text-align:center">
      <div style="font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Recommendation</div>
      <div style="font-size:18px;font-weight:700;color:${colors.bg}">${report.recommendation || 'INVESTIGATE'}</div>
    </div>
  </div>

  <div style="padding:20px 36px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;color:#64748b;font-size:10px">
    <span>VendorIQ · AI-Powered Vendor Due Diligence · vendoriq.in</span>
    <span>Confidence: ${report.confidence || 0}% (${sources}/13 sources)</span>
  </div>
</div>

<!-- PAGE 2: SCORE BREAKDOWN -->
<div class="page" style="padding:36px">
  <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1A56DB;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0">Score Breakdown</div>
  <div style="font-size:17px;font-weight:700;margin-bottom:20px">${report.vendor_name || ''} — Dimension Analysis</div>

  <div style="display:flex;gap:12px;margin-bottom:28px">
    ${[
      ['VHS Score', String(vhs), 'out of 100', colors.bg],
      ['Risk Level', risk, 'band', colors.bg],
      ['Confidence', `${report.confidence || 0}%`, `${sources}/13 sources`, '#1A56DB'],
      ['Data Flags', String(hardFlags.length + keyFlags.length), `${hardFlags.length} hard, ${keyFlags.length} soft`, hardFlags.length > 0 ? '#DC2626' : '#16A34A'],
    ].map(([lbl, val, sub, col]) => `
      <div style="flex:1;background:#f8fafc;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${lbl}</div>
        <div style="font-size:26px;font-weight:800;color:${col}">${val}</div>
        <div style="font-size:10px;color:#94a3b8">${sub}</div>
      </div>`).join('')}
  </div>

  ${scoreBar('Financial Health',    breakdown.financial,  0.30)}
  ${scoreBar('Legal & Compliance',  breakdown.legal,      0.25)}
  ${scoreBar('GST Compliance',      breakdown.gst,        0.20)}
  ${scoreBar('Director Quality',    breakdown.directors,  0.15)}
  ${scoreBar('Market Sentiment',    breakdown.market,     0.10)}

  ${conditions.length > 0 ? `
  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:14px;margin-top:20px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400E;margin-bottom:8px">Conditions for Approval</div>
    ${conditions.map(c => `<div style="font-size:12px;color:#78350F;margin-bottom:5px;padding-left:14px;position:relative"><span style="position:absolute;left:0;color:#F59E0B">→</span>${c}</div>`).join('')}
  </div>` : ''}
</div>

<!-- PAGE 3: FLAGS & DIRECTORS -->
<div class="page" style="padding:36px">
  ${hardFlags.length > 0 ? `
  <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1A56DB;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0">Hard Disqualifiers</div>
  ${hardFlags.map(f => `
    <div style="display:flex;gap:10px;padding:12px;border-radius:8px;margin-bottom:8px;background:#FEE2E2;border:1px solid #FCA5A5;align-items:flex-start">
      <span style="font-size:16px;flex-shrink:0">⛔</span>
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#7F1D1D;text-transform:uppercase">${f.code || ''}</div>
        <div style="font-size:12px;color:#1e293b;margin-top:2px">${f.message || ''}</div>
      </div>
    </div>`).join('')}
  <br>` : ''}

  ${keyFlags.length > 0 ? `
  <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1A56DB;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0">Risk Flags</div>
  ${keyFlags.slice(0, 8).map(f => `
    <div style="display:flex;gap:10px;padding:10px;border-radius:8px;margin-bottom:6px;background:#FEF3C7;border:1px solid #FDE68A;align-items:flex-start">
      <span style="font-size:14px;flex-shrink:0">⚠</span>
      <div style="font-size:12px;color:#1e293b">${f.message || f}</div>
    </div>`).join('')}
  <br>` : ''}

  <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1A56DB;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0">Director Information</div>
  ${directors.length > 0 ? `
  <table style="width:100%;border-collapse:collapse">
    <thead><tr><th>Name</th><th>DIN</th><th>Designation</th><th>Status</th></tr></thead>
    <tbody>
      ${directors.slice(0, 10).map(d => `<tr>
        <td>${d.name || '—'}</td>
        <td style="font-family:monospace;font-size:10px">${d.din || '—'}</td>
        <td>${d.designation || '—'}</td>
        <td>${d.cessation_date
          ? `<span class="badge" style="background:#FEE2E2;color:#7F1D1D">Resigned</span>`
          : `<span class="badge" style="background:#DCFCE7;color:#14532D">Active</span>`}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : '<p style="color:#64748b;font-size:12px">Director data unavailable.</p>'}
</div>

<!-- PAGE 4: NARRATIVE -->
<div class="page" style="padding:36px">
  <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1A56DB;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0">AI-Generated Analysis</div>
  <div style="font-size:12.5px;line-height:1.8;color:#334155">${formatNarrative(narrative)}</div>
</div>

<!-- PAGE 5: SIMILAR CASES + DISCLAIMER -->
<div class="page" style="padding:36px">
  ${cases.length > 0 ? `
  <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#1A56DB;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0">Comparable Risk Cases</div>
  ${cases.map((c, i) => `
    <div style="background:#f8fafc;border-left:3px solid #1A56DB;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1A56DB;margin-bottom:6px">Similar Case ${i+1}</div>
      <p style="font-size:12px;margin-bottom:6px">${c.summary || ''}</p>
      <div style="font-size:11px;color:#64748b;margin-bottom:3px"><strong>Outcome:</strong> ${c.outcome || ''}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:3px"><strong>Lesson:</strong> ${c.lesson || ''}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px">Source: ${c.source || ''}</div>
    </div>`).join('')}
  ` : ''}

  <div style="font-size:9px;color:#94a3b8;line-height:1.5;margin-top:${cases.length > 0 ? '8px' : '0'};padding-top:16px;border-top:1px solid #e2e8f0">
    <strong>DISCLAIMER:</strong> This report is generated by VendorIQ using publicly available data from MCA21, GST Portal, eCourts India, NCLT portal, SEBI enforcement records, SFIO watchlist, and RBI publications. The Vendor Health Score (VHS) is a proprietary algorithmic assessment and does not constitute legal advice, financial advice, or a credit rating. This report should be used as one input in a broader due diligence process. Report generated ${generated}. Report ID: ${report.report_id || 'N/A'} | Confidential — For Internal Use Only.
  </div>
</div>

</body></html>`;
}

module.exports = { generatePDF };
