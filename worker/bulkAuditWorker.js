'use strict';

/**
 * VendorIQ — Bulk Audit Worker
 * ==============================
 * Consumes jobs from the 'bulk-audit' Bull queue.
 *
 * Job payload: { bulkAuditId, cin, vendorName, client_id, rowIndex }
 *
 * For each CIN:
 *   1. Collect data + score
 *   2. Save AuditResult to BulkAudit.results[]
 *   3. Update BulkAudit progress counters
 *   4. When last CIN done → mark BulkAudit complete + notify user
 */

require('dotenv').config({ path: '../api/.env' });

const mongoose = require('mongoose');
const logger   = require('../api/utils/logger');
const { createQueue }                      = require('../api/config/redis');
const { BulkAudit, AuditResult, User }     = require('../api/models');
const { collectData }                      = require('../api/services/dataCollector');
const { calculateVHS }                     = require('../api/services/scoringEngine');
const { notifyBulkAuditComplete }          = require('../api/services/notificationService');

const bulkQueue = createQueue('bulk-audit');

const CONCURRENCY = 3; // Don't hammer Sandbox API

bulkQueue.process(CONCURRENCY, async (job) => {
  const { bulkAuditId, cin, vendorName, client_id, rowIndex } = job.data;
  const jobLog = { bulkAuditId, cin, rowIndex, jobId: job.id };

  logger.info('Bulk audit CIN started', jobLog);
  await job.progress(10);

  // ── Load parent BulkAudit ──────────────────────────────────────────────
  const bulkAudit = await BulkAudit.findOne({ _id: bulkAuditId, client_id });
  if (!bulkAudit) {
    logger.warn('BulkAudit not found', jobLog);
    return { skipped: true };
  }

  let resultDoc;
  let success = false;

  try {
    // ── Collect + score ────────────────────────────────────────────────
    const rawData = await collectData(cin);
    await job.progress(70);
    const scoring = calculateVHS(rawData);
    await job.progress(85);

    // ── Save AuditResult ───────────────────────────────────────────────
    resultDoc = new AuditResult({
      bulk_audit_id: bulkAuditId,
      client_id,
      cin,
      vendor_name:    vendorName || rawData?.mca_data?.company_name || cin,
      row_index:      rowIndex,
      status:         'complete',
      vhs_score:      scoring.vhs_score,
      risk_level:     scoring.risk_level,
      recommendation: scoring.recommendation,
      hard_flags:     scoring.hard_flags,
      key_flags:      scoring.key_flags,
      vhs_breakdown:  scoring.breakdown,
      confidence:     scoring.confidence,
      sources_available: rawData.sources_available,
      partial_report: rawData.partial_report,
    });
    await resultDoc.save();
    success = true;

    // ── Update BulkAudit counters ──────────────────────────────────────
    await BulkAudit.findByIdAndUpdate(bulkAuditId, {
      $inc: { completed_count: 1 },
      $push: {
        results: {
          cin,
          vendor_name:    resultDoc.vendor_name,
          status:         'complete',
          vhs_score:      scoring.vhs_score,
          risk_level:     scoring.risk_level,
          audit_result_id: resultDoc._id,
          row_index:      rowIndex,
        },
      },
    });

    logger.info('Bulk CIN scored', { ...jobLog, vhs: scoring.vhs_score, risk: scoring.risk_level });

  } catch (err) {
    logger.error('Bulk CIN failed', { ...jobLog, error: err.message });

    // Save failed result
    resultDoc = new AuditResult({
      bulk_audit_id: bulkAuditId,
      client_id,
      cin,
      vendor_name: vendorName || cin,
      row_index:   rowIndex,
      status:      'failed',
      error_message: err.message,
    });
    await resultDoc.save().catch(() => {});

    await BulkAudit.findByIdAndUpdate(bulkAuditId, {
      $inc: { failed_count: 1 },
      $push: {
        results: {
          cin,
          vendor_name: vendorName || cin,
          status:      'failed',
          row_index:   rowIndex,
          error:       err.message,
        },
      },
    });
  }

  await job.progress(95);

  // ── Check if this was the LAST job for the batch ───────────────────────
  const updated = await BulkAudit.findById(bulkAuditId);
  if (!updated) return { success };

  const totalDone = (updated.completed_count || 0) + (updated.failed_count || 0);
  const isLast    = totalDone >= updated.total_count;

  if (isLast && updated.status !== 'complete') {
    updated.status      = 'complete';
    updated.finished_at = new Date();
    await updated.save();

    logger.info('Bulk audit batch complete', {
      bulkAuditId,
      total:     updated.total_count,
      completed: updated.completed_count,
      failed:    updated.failed_count,
    });

    // Notify user
    try {
      const user = await User.findById(client_id);
      if (user) {
        await notifyBulkAuditComplete({
          userEmail:   user.email,
          userName:    user.name,
          totalCins:   updated.total_count,
          completed:   updated.completed_count,
          failed:      updated.failed_count,
          downloadUrl: `${process.env.FRONTEND_URL || 'https://vendoriq.in'}/bulk-audit/${bulkAuditId}`,
        });
      }
    } catch (notifyErr) {
      logger.error('Bulk audit notification failed', { bulkAuditId, error: notifyErr.message });
    }
  }

  await job.progress(100);
  return { success, cin, vhs: resultDoc?.vhs_score, risk: resultDoc?.risk_level };
});

// ── Queue events ───────────────────────────────────────────────────────────

bulkQueue.on('completed', (job, result) => {
  logger.info('Bulk job completed', { jobId: job.id, cin: job.data.cin, ...result });
});

bulkQueue.on('failed', (job, err) => {
  logger.error('Bulk job failed', {
    jobId: job.id, cin: job.data?.cin,
    error: err.message, attempts: job.attemptsMade,
  });
});

// ── Start ──────────────────────────────────────────────────────────────────

async function startBulkWorker() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vendoriq', {
    serverSelectionTimeoutMS: 10000,
  });
  logger.info('Bulk audit worker ready', { concurrency: CONCURRENCY, queue: 'bulk-audit' });
}

startBulkWorker().catch(err => {
  logger.error('Bulk worker failed to start', { error: err.message });
  process.exit(1);
});

module.exports = { bulkQueue };
