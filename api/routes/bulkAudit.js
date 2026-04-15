'use strict';

/**
 * VendorIQ — Bulk Audit Routes
 * ==============================
 * POST   /api/bulk-audit      — Upload CSV/Excel, queue all CINs
 * GET    /api/bulk-audit      — List user's bulk audit jobs
 * GET    /api/bulk-audit/:id  — Status + per-CIN results
 * DELETE /api/bulk-audit/:id  — Delete a batch
 *
 * Access: Pro + Enterprise only (starter blocked)
 * Limit:  50 CINs per batch
 * Format: CSV col1=CIN, col2=VendorName (optional)
 *         XLSX sheet1 col1=CIN, col2=Name
 */

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const logger   = require('../utils/logger');
const { BulkAudit, AuditResult } = require('../models');
const { authMiddleware }          = require('../middleware/auth');
const { createQueue }             = require('../config/redis');

const bulkQueue = createQueue('bulk-audit');
const MAX_CINS  = 50;

// ── Multer: memory storage, 5MB, CSV + XLSX only ──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xlsx'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV and XLSX files are accepted'));
  },
});

// ── Plan guard ────────────────────────────────────────────────────────────
function requireBulkAccess(req, res, next) {
  if (req.user?.subscription_tier === 'starter') {
    return res.status(403).json({
      success: false,
      error: { code: 'PLAN_LIMIT', message: 'Bulk audit requires Professional or Enterprise plan' },
    });
  }
  next();
}

// ── CIN validation ────────────────────────────────────────────────────────
const CIN_REGEX = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
function isValidCin(cin) {
  return typeof cin === 'string' && CIN_REGEX.test(cin.trim().toUpperCase());
}

// ── Parse file → [{cin, vendorName}] ─────────────────────────────────────
async function parseFile(file) {
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    const { parse } = require('csv-parse/sync');
    const rows = parse(file.buffer.toString('utf-8'), {
      columns: true, skip_empty_lines: true, trim: true,
    });
    return rows.map(r => ({
      cin:        (r.cin || r.CIN || Object.values(r)[0] || '').trim().toUpperCase(),
      vendorName: (r.vendor_name || r['Vendor Name'] || r.name || Object.values(r)[1] || '').trim(),
    }));
  }

  if (ext === 'xlsx') {
    // Use exceljs (no prototype pollution vulnerabilities unlike xlsx/SheetJS)
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer);
    const ws = wb.worksheets[0];
    const rows = [];
    ws.eachRow((row) => {
      rows.push(row.values.slice(1)); // exceljs rows are 1-indexed
    });
    const start = String(rows[0]?.[0] || '').toLowerCase().includes('cin') ? 1 : 0;
    return rows.slice(start).map(r => ({
      cin:        String(r[0] || '').trim().toUpperCase(),
      vendorName: String(r[1] || '').trim(),
    }));
  }

  throw new Error('Unsupported file format — use CSV or XLSX');
}

// ── POST / — upload + queue ───────────────────────────────────────────────
router.post('/', authMiddleware, requireBulkAccess, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Upload a CSV or XLSX file' } });
    }

    let rows;
    try { rows = await parseFile(req.file); }
    catch (e) { return res.status(400).json({ success: false, error: { code: 'PARSE_ERROR', message: e.message } }); }

    const valid   = rows.filter(r => isValidCin(r.cin));
    const invalid = rows.filter(r => !isValidCin(r.cin));

    if (valid.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_VALID_CINS', message: 'No valid CINs found. Column 1 must contain 21-character Indian CINs.', sample_invalid: invalid.slice(0, 3).map(r => r.cin) },
      });
    }

    const cins = valid.slice(0, MAX_CINS);

    const bulkAudit = new BulkAudit({
      client_id:       req.clientId,
      file_name:       req.file.originalname,
      total_count:     cins.length,
      completed_count: 0,
      failed_count:    0,
      status:          'processing',
      started_at:      new Date(),
    });
    await bulkAudit.save();

    await bulkQueue.addBulk(cins.map((row, index) => ({
      data: { bulkAuditId: bulkAudit._id.toString(), cin: row.cin, vendorName: row.vendorName, client_id: req.clientId, rowIndex: index },
      opts: { attempts: 2, backoff: { type: 'fixed', delay: 30000 }, jobId: `bulk_${bulkAudit._id}_${row.cin}`, timeout: 180000 },
    })));

    logger.info('Bulk audit queued', { bulkAuditId: bulkAudit._id, client_id: req.clientId, count: cins.length });

    return res.status(202).json({
      success: true,
      data: { bulk_audit_id: bulkAudit._id, total_count: cins.length, skipped: valid.length - cins.length, invalid_count: invalid.length, status: 'processing' },
    });
  } catch (err) { next(err); }
});

// ── GET / — list ──────────────────────────────────────────────────────────
router.get('/', authMiddleware, requireBulkAccess, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const [audits, total] = await Promise.all([
      BulkAudit.find({ client_id: req.clientId }).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).select('-results'),
      BulkAudit.countDocuments({ client_id: req.clientId }),
    ]);
    return res.json({ success: true, data: { audits, meta: { total, page, limit, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
});

// ── GET /:id — detail + progress ─────────────────────────────────────────
router.get('/:id', authMiddleware, requireBulkAccess, async (req, res, next) => {
  try {
    const bulkAudit = await BulkAudit.findOne({ _id: req.params.id, client_id: req.clientId });
    if (!bulkAudit) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bulk audit not found' } });

    const done    = (bulkAudit.completed_count || 0) + (bulkAudit.failed_count || 0);
    const percent = bulkAudit.total_count > 0 ? Math.round((done / bulkAudit.total_count) * 100) : 0;

    return res.json({ success: true, data: { bulk_audit: { ...bulkAudit.toObject(), progress_percent: percent } } });
  } catch (err) { next(err); }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireBulkAccess, async (req, res, next) => {
  try {
    const bulkAudit = await BulkAudit.findOne({ _id: req.params.id, client_id: req.clientId });
    if (!bulkAudit) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bulk audit not found' } });
    await AuditResult.deleteMany({ bulk_audit_id: bulkAudit._id, client_id: req.clientId });
    await bulkAudit.deleteOne();
    logger.info('Bulk audit deleted', { bulkAuditId: bulkAudit._id, client_id: req.clientId });
    return res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err) { next(err); }
});

module.exports = router;
