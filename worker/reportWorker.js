'use strict';

/**
 * VendorIQ — Report Worker (Bull Queue)
 * =======================================
 * 5-step pipeline for generating a vendor due diligence report.
 *
 * Step 1 (20-45s): Collect all 13 data sources → status: collecting
 * Step 2 (<50ms):  Calculate VHS score        → status: scoring
 * Step 3 (20-40s): AI narrative via FastAPI    → status: generating
 * Step 4 (10-20s): Puppeteer PDF → S3 upload  → status: uploading
 * Step 5 (100ms):  Mark complete, emit socket  → status: complete
 *
 * Retry: 3 attempts with exponential backoff (5s, 10s, 20s)
 */

require('dotenv').config({ path: '../api/.env' });
const Bull   = require('bull');
const axios  = require('axios');
const logger = require('../api/utils/logger');
const { createQueue } = require('../api/config/redis');

// ── Models ────────────────────────────────────────────────────
const { Report } = require('../api/models');
const mongoose   = require('mongoose');

// ── Services ──────────────────────────────────────────────────
const { collectAllData }  = require('../api/services/dataCollector');
const { calculateVHS }    = require('../api/services/scoringEngine');
const { generatePDF }     = require('../api/services/pdfGenerator');
const { uploadToS3 }      = require('../api/services/s3Service');

// ── Queue ─────────────────────────────────────────────────────
const reportQueue = createQueue('report');

// ── 12 frontend processing steps (shown in animated loader) ───
const STEPS = [
  { label: 'Verifying CIN with MCA',                  weight: 5 },
  { label: 'Fetching company registration details',   weight: 8 },
  { label: 'Retrieving director & DIN information',   weight: 8 },
  { label: 'Checking GST filing history',             weight: 8 },
  { label: 'Scanning eCourts for legal cases',        weight: 10 },
  { label: 'Checking NCLT insolvency portal',         weight: 7 },
  { label: 'Querying SEBI enforcement orders',        weight: 7 },
  { label: 'Scanning SFIO watchlist & RBI defaulters',weight: 7 },
  { label: 'Aggregating news & market signals',       weight: 8 },
  { label: 'Calculating Vendor Health Score',         weight: 7 },
  { label: 'Generating AI narrative with Gemini',     weight: 15 },
  { label: 'Building your PDF report',                weight: 10 },
];

// ── Process jobs ───────────────────────────────────────────────
reportQueue.process(3, async (job) => { // 3 concurrent workers
  const { reportId, cin, gstin, pan, vendorName } = job.data;
  const jobLog = { reportId, cin, jobId: job.id };

  logger.info('Report job started', jobLog);

  // Connect DB if not already connected (worker may start independently)
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    logger.info('Worker DB connected');
  }

  const report = await Report.findOne({ report_id: reportId });
  if (!report) throw new Error(`Report not found: ${reportId}`);

  emitProgress(report.report_id, { step: 1, status: 'collecting', message: 'Collecting data from 13 sources…' });
  // ── Step 1: Data Collection ─────────────────────────────────
  await updateStatus(report, 'collecting', 10, job);
  logger.info('Step 1: Collecting data', jobLog);

  const rawData = await collectAllData(cin, gstin, pan);

  if (rawData.sources_available < 1) {
    throw new Error(`No data sources available for CIN: ${cin}`);
  }

  await job.progress(35);

  emitProgress(report.report_id, { step: 2, status: 'scoring',    message: 'Calculating VHS score…' });
  // ── Step 2: VHS Scoring ─────────────────────────────────────
  await updateStatus(report, 'scoring', 40, job);
  logger.info('Step 2: Calculating VHS', jobLog);

  const scoring = calculateVHS(rawData);

  report.vhs_score    = scoring.vhs_score;
  report.risk_level   = scoring.risk_level;
  report.recommendation = scoring.recommendation;
  report.vhs_breakdown  = scoring.breakdown;
  report.hard_flags   = scoring.hard_flags;
  report.key_flags    = scoring.key_flags;
  report.confidence   = scoring.confidence;
  report.raw_data     = rawData;
  report.vendor_name  = vendorName || rawData?.mca_data?.company_name || cin;
  await report.save();

  await job.progress(45);

  emitProgress(report.report_id, { step: 3, status: 'analyzing',  message: 'AI analysis in progress…' });
  // ── Step 3: AI Narrative ────────────────────────────────────
  await updateStatus(report, 'generating', 50, job);
  logger.info('Step 3: Generating AI narrative', jobLog);

  let aiOutput = null;
  try {
    const aiRes = await axios.post(
      `${process.env.FASTAPI_URL || 'http://localhost:8000'}/analyze`,
      {
        cin,
        vendor_name: report.vendor_name,
        raw_data:    rawData,
        vhs_score:   scoring.vhs_score,
        risk_level:  scoring.risk_level,
        hard_flags:  scoring.hard_flags,
        key_flags:   scoring.key_flags,
      },
      {
        headers: { 'x-internal-secret': process.env.FASTAPI_SECRET },
        timeout: 60000, // AI can take up to 60s
      }
    );
    aiOutput = aiRes.data;
  } catch (aiErr) {
    // AI failure is non-fatal — report still generated with scoring only
    logger.warn('AI narrative failed — continuing without narrative', {
      ...jobLog, error: aiErr.message,
    });
  }

  if (aiOutput) {
    report.narrative              = aiOutput.narrative;
    report.similar_cases          = aiOutput.similar_cases || [];
    report.recommendation_reasons = aiOutput.recommendation_reasons || [];
    report.conditions             = aiOutput.conditions || [];
  }

  await report.save();
  await job.progress(70);

  emitProgress(report.report_id, { step: 4, status: 'generating', message: 'Generating PDF report…' });
  // ── Step 4: PDF Generation & S3 Upload ─────────────────────
  await updateStatus(report, 'generating', 75, job);
  logger.info('Step 4: Generating PDF', jobLog);

  let pdfUrl = null;
  try {
    const pdfBuffer = await generatePDF(report.toObject());
    const s3Key     = `reports/${report.client_id}/${reportId}.pdf`;
    const { url, expiresAt } = await uploadToS3(pdfBuffer, s3Key);
    pdfUrl             = url;
    report.pdf_url     = url;
    report.pdf_s3_key  = s3Key;
    report.pdf_expires_at = expiresAt;
  } catch (pdfErr) {
    logger.error('PDF generation failed', { ...jobLog, error: pdfErr.message });
    // Non-fatal — report viewable in web UI without PDF
  }

  await job.progress(90);

  emitProgress(report.report_id, { step: 5, status: 'complete',   message: 'Report ready!' });
  // ── Step 5: Complete ────────────────────────────────────────
  report.status       = 'complete';
  report.completed_at = new Date();
  await report.save();
  await job.progress(100);

  logger.info('Report job complete', {
    ...jobLog,
    vhs_score:  scoring.vhs_score,
    risk_level: scoring.risk_level,
    has_pdf:    !!pdfUrl,
  });

  // ── Step 6: Notify user (non-fatal) ─────────────────────────
  try {
    const { notifyReportComplete } = require('../api/services/notificationService');
    const notifyUser = await require('../api/models').User.findById(clientId);

// ── Socket.io emit helper (non-fatal) ─────────────────────────────────────
function emitProgress(reportId, data) {
  try {
    if (global._io) {
      global._io.to(`report:${reportId}`).emit('report_progress', { reportId, ...data });
    }
  } catch (_) {}
}


    if (notifyUser) {
      const reportUrl = `${process.env.FRONTEND_URL || 'https://vendoriq.in'}/reports/${reportId}`;
      await notifyReportComplete({
        userEmail:  notifyUser.email,
        userName:   notifyUser.name,
        vendorName: report.vendor_name || cin,
        vhsScore:   scoring.vhs_score,
        riskLevel:  scoring.risk_level,
        reportUrl,
        pdfUrl:     pdfUrl || null,
      });
    }
  } catch (notifyErr) {
    logger.warn('Report completion notification failed (non-fatal)', { reportId, error: notifyErr.message });
  }

  return { reportId, vhs_score: scoring.vhs_score, risk_level: scoring.risk_level };
});

// ── Error handling ─────────────────────────────────────────────
reportQueue.on('failed', async (job, err) => {
  const { reportId } = job.data;
  logger.error('Report job failed', { reportId, jobId: job.id, error: err.message, attempts: job.attemptsMade });

  // Mark report as failed after all retries exhausted
  if (job.attemptsMade >= 3) {
    try {
      await Report.findOneAndUpdate(
        { report_id: reportId },
        { status: 'failed', error_message: err.message }
      );
    } catch (dbErr) {
      logger.error('Could not mark report failed', { reportId, error: dbErr.message });
    }
  }
});

reportQueue.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id, reportId: job.data.reportId });
});

reportQueue.on('stalled', (job) => {
  logger.warn('Job stalled', { jobId: job.id, reportId: job.data?.reportId });
});

// ── Helpers ────────────────────────────────────────────────────
async function updateStatus(report, status, progress, job) {
  report.status = status;
  await report.save();
  await job.progress(progress);
}

module.exports = reportQueue;
logger.info('Report worker ready', { concurrency: 3, queue: 'report' });
