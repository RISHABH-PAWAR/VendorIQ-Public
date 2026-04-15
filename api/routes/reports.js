'use strict';

/**
 * VendorIQ — Reports Routes
 * ==========================
 * GET  /api/reports                — list all reports for user
 * GET  /api/reports/:id            — get single report (auth)
 * GET  /api/reports/shared/:token  — get shared report (no auth)
 * POST /api/reports/:id/refresh-pdf— refresh expired S3 URL
 * GET  /api/reports/search         — Sandbox CIN typeahead
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { Report } = require('../models');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { refreshSignedUrl } = require('../services/s3Service');
const { createQueue } = require('../config/redis');
const logger = require('../utils/logger');

const reportQueue = createQueue('report');

// GET /search?q=query — Sandbox CIN typeahead (no auth required)
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { companies: [] } });
    }

    const cacheKey = `search:${q.toLowerCase()}`;
    const { getCached, setCached } = require('../config/redis');
    const cached = await getCached(cacheKey);
    if (cached) return res.json({ success: true, data: { companies: cached } });

    const sandboxRes = await axios.get('https://api.sandbox.co.in/companies/search', {
      params: { name: q },
      headers: { 'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-version': '1.0' },
      timeout: 8000,
    });

    const companies = (sandboxRes.data?.data || []).slice(0, 10).map(c => ({
      cin: c.cin || c.id,
      name: c.company_name || c.name,
      status: c.company_status || 'Active',
      type: c.company_type,
      state: c.registered_state,
    }));

    await setCached(cacheKey, companies, 3600);
    return res.json({ success: true, data: { companies } });
  } catch (err) {
    // Fallback: empty results rather than error (typeahead shouldn't block UI)
    logger.warn('Company search failed', { error: err.message });
    return res.json({ success: true, data: { companies: [] } });
  }
});

// GET /shared/:token — public shared report view (no auth)
router.get('/shared/:token', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const report = await Report.findOne({ shareable_token: req.params.token });
    if (!report || report.status !== 'complete') {
      return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND' } });
    }
    // Refresh PDF URL if expired
    if (report.pdf_s3_key && report.pdf_expires_at < new Date()) {
      const { url, expiresAt } = await refreshSignedUrl(report.pdf_s3_key);
      report.pdf_url = url;
      report.pdf_expires_at = expiresAt;
      await report.save();
    }
    return res.json({ success: true, data: { report: _sanitizeReport(report) } });
  } catch (err) { next(err); }
});

// GET / — list reports (auth required)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const query = { client_id: req.clientId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.risk_level) query.risk_level = req.query.risk_level;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('-raw_data -narrative')
        .lean(),
      Report.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: { reports, meta: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
});

// GET /:id — single report (auth required, tenant isolated)
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const report = await Report.findOne({
      report_id: req.params.id,
      client_id: req.clientId,           // CRITICAL: tenant isolation
    });
    if (!report) {
      return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND' } });
    }

    // Refresh PDF URL if expired
    if (report.pdf_s3_key && report.pdf_expires_at < new Date()) {
      try {
        const { url, expiresAt } = await refreshSignedUrl(report.pdf_s3_key);
        report.pdf_url = url;
        report.pdf_expires_at = expiresAt;
        await report.save();
      } catch (s3Err) {
        logger.warn('PDF URL refresh failed', { report_id: report.report_id, error: s3Err.message });
      }
    }

    return res.json({ success: true, data: { report: _sanitizeReport(report) } });
  } catch (err) { next(err); }
});

// POST /:id/refresh-pdf — regenerate expired S3 URL
router.post('/:id/refresh-pdf', authMiddleware, async (req, res, next) => {
  try {
    const report = await Report.findOne({ report_id: req.params.id, client_id: req.clientId });
    if (!report) return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND' } });
    if (!report.pdf_s3_key) return res.status(400).json({ success: false, error: { code: 'NO_PDF', message: 'No PDF available for this report' } });

    const { url, expiresAt } = await refreshSignedUrl(report.pdf_s3_key);
    report.pdf_url = url;
    report.pdf_expires_at = expiresAt;
    await report.save();

    return res.json({ success: true, data: { pdf_url: url, expires_at: expiresAt } });
  } catch (err) { next(err); }
});

// GET /:id/status — polling endpoint for processing page
router.get('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const report = await Report.findOne({ report_id: req.params.id, client_id: req.clientId })
      .select('status vhs_score risk_level recommendation confidence created_at completed_at');
    if (!report) return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND' } });
    return res.json({ success: true, data: { status: report.status, vhs_score: report.vhs_score, risk_level: report.risk_level, completed_at: report.completed_at } });
  } catch (err) { next(err); }
});


// ── GET /:id/graph — D3 director network data ─────────────────────────────
// Returns nodes (directors + companies) and links for force-directed graph.
// Nodes: { id, type: 'director'|'company', label, din?, cin?, vhs?, risk? }
// Links: { source, target, role?, designation? }
router.get('/:id/graph', authMiddleware, async (req, res, next) => {
  try {
    const report = await Report.findOne({
      report_id: req.params.id,
      client_id: req.clientId,
    }).select('vendor_cin vendor_name director_data vhs_score risk_level status');

    if (!report) {
      return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } });
    }
    if (report.status !== 'complete') {
      return res.status(409).json({ success: false, error: { code: 'NOT_READY', message: 'Report still processing' } });
    }

    const directors = report.director_data?.directors || [];
    const nodes = [];
    const links = [];
    const nodeIds = new Set();

    // Root company node
    const rootId = `company:${report.vendor_cin}`;
    nodes.push({
      id: rootId,
      type: 'company',
      label: report.vendor_name || report.vendor_cin,
      cin: report.vendor_cin,
      vhs: report.vhs_score,
      risk: report.risk_level,
      isRoot: true,
    });
    nodeIds.add(rootId);

    // Director nodes + their company associations
    for (const dir of directors) {
      if (!dir.din && !dir.name) continue;
      const dirId = `director:${dir.din || dir.name.replace(/\s+/g, '_')}`;

      if (!nodeIds.has(dirId)) {
        nodes.push({
          id: dirId,
          type: 'director',
          label: dir.name || dir.din,
          din: dir.din,
          designation: dir.designation,
          disqualified: dir.is_disqualified || false,
        });
        nodeIds.add(dirId);
      }

      // Link: director → root company
      links.push({
        source: dirId,
        target: rootId,
        role: dir.designation || 'Director',
        type: 'serves_as',
      });

      // Associated companies for each director
      const assoc = dir.company_associations || dir.other_companies || [];
      for (const co of assoc.slice(0, 8)) { // Cap at 8 per director
        if (!co.cin && !co.company_name) continue;
        const coId = `company:${co.cin || co.company_name.replace(/\s+/g, '_')}`;

        if (!nodeIds.has(coId)) {
          nodes.push({
            id: coId,
            type: 'company',
            label: co.company_name || co.cin,
            cin: co.cin,
            status: co.status,
          });
          nodeIds.add(coId);
        }

        // Link: director → associated company
        links.push({
          source: dirId,
          target: coId,
          role: co.designation || 'Director',
          type: 'associated',
        });
      }
    }

    return res.json({
      success: true,
      data: {
        nodes,
        links,
        meta: {
          total_nodes: nodes.length,
          total_links: links.length,
          director_count: directors.length,
          company_count: nodes.filter(n => n.type === 'company').length,
        },
      },
    });
  } catch (err) { next(err); }
});

function _sanitizeReport(report) {
  const obj = report.toObject ? report.toObject() : { ...report };
  // Don't expose raw_data to frontend — too large
  delete obj.raw_data;
  return obj;
}

module.exports = router;
