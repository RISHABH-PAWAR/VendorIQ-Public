const mongoose = require('mongoose');

// ── Sub-schemas ──────────────────────────────────────────────
const HardFlagSchema = new mongoose.Schema({
  code:     { type: String, required: true }, // e.g. 'STRUCK_OFF', 'DISQUALIFIED_DIN'
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM'], default: 'CRITICAL' },
  message:  { type: String, required: true },
}, { _id: false });

const KeyFlagSchema = new mongoose.Schema({
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
  message:  { type: String },
}, { _id: false });

const LocalChecksSchema = new mongoose.Schema({
  disqualified_dins: { type: [String], default: [] }, // DINs found in MCA disqualified list
  rbi_defaulter:     { type: Boolean, default: false },
  sfio_active:       { type: Boolean, default: false },
  sebi_debarred:     { type: Boolean, default: false },
  gem_blacklisted:   { type: Boolean, default: false },
  nclt_active:       { type: Boolean, default: false },
}, { _id: false });

const RawDataSchema = new mongoose.Schema({
  // Paid — Sandbox.co.in
  mca_data:       { type: mongoose.Schema.Types.Mixed, default: null },
  director_data:  { type: mongoose.Schema.Types.Mixed, default: null },
  gst_data:       { type: mongoose.Schema.Types.Mixed, default: null },
  charges_data:   { type: mongoose.Schema.Types.Mixed, default: null },
  pan_data:       { type: mongoose.Schema.Types.Mixed, default: null },
  // Free APIs
  gst_portal_data: { type: mongoose.Schema.Types.Mixed, default: null },
  news_rss:        { type: mongoose.Schema.Types.Mixed, default: null },
  news_gdelt:      { type: mongoose.Schema.Types.Mixed, default: null },
  exchange_data:   { type: mongoose.Schema.Types.Mixed, default: null },
  // Scrapers
  courts_data:    { type: mongoose.Schema.Types.Mixed, default: null },
  nclt_data:      { type: mongoose.Schema.Types.Mixed, default: null },
  sebi_data:      { type: mongoose.Schema.Types.Mixed, default: null },
  sfio_data:      { type: mongoose.Schema.Types.Mixed, default: null },
  // Local DB checks (instant lookups — no API call)
  local_checks:   { type: LocalChecksSchema, default: () => ({}) },
  // Metadata
  sources_available: { type: Number, default: 0 },  // Out of 13
  partial_report:    { type: Boolean, default: false }, // True if < 7 sources
}, { _id: false });

// ── Main Report Schema ───────────────────────────────────────
const ReportSchema = new mongoose.Schema({
  // ── Identity ──────────────────────────────────────────────
  report_id:   { type: String, unique: true, default: () => `rpt_${Date.now().toString(36)}` },
  client_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // ── Vendor ────────────────────────────────────────────────
  vendor_cin:   { type: String, required: true },
  vendor_gstin: { type: String },
  vendor_name:  { type: String },
  sector: {
    type: String,
    enum: ['manufacturing', 'pharma', 'fintech', 'realestate', 'it_services', 'fmcg', 'logistics', 'healthcare', null],
    default: null,
  },

  // ── Status ────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'collecting', 'scoring', 'generating', 'complete', 'failed'],
    default: 'pending',
    index: true,
  },
  error_message: { type: String },

  // ── VHS Score ─────────────────────────────────────────────
  vhs_score:   { type: Number, min: 0, max: 100 },
  risk_level:  { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] },
  recommendation: {
    type: String,
    enum: ['APPROVE', 'APPROVE_WITH_CONDITIONS', 'INVESTIGATE', 'REJECT'],
  },
  vhs_breakdown: {
    financial:  { type: Number, min: 0, max: 100 },
    legal:      { type: Number, min: 0, max: 100 },
    gst:        { type: Number, min: 0, max: 100 },
    directors:  { type: Number, min: 0, max: 100 },
    market:     { type: Number, min: 0, max: 100 },
  },
  hard_flags: { type: [HardFlagSchema], default: [] },

  // ── Data Quality ──────────────────────────────────────────
  confidence: {
    type: Number, min: 0, max: 100,
    // sources_available / 13 * 100
  },

  // ── Raw Data (all 13 sources + local checks) ──────────────
  raw_data: { type: RawDataSchema, default: () => ({}) },

  // ── AI Output ─────────────────────────────────────────────
  narrative:             { type: String },         // ~800 word board-ready analysis
  key_flags:             { type: [KeyFlagSchema], default: [] },
  similar_cases:         [{
    summary: String,
    outcome: String,
    source:  String,
  }],
  recommendation_reasons: { type: [String], default: [] },
  conditions:             { type: [String], default: [] }, // Approval conditions

  // ── PDF Delivery ──────────────────────────────────────────
  pdf_url:        { type: String },                // Pre-signed S3 URL
  pdf_s3_key:     { type: String },                // S3 object key
  pdf_expires_at: { type: Date },

  // ── Sharing ───────────────────────────────────────────────
  shareable_token: {
    type: String,
    default: () => `shr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    index: true,
  },

  // ── Billing ───────────────────────────────────────────────
  payment_id:      { type: String },
  amount_charged:  { type: Number, default: 200000 }, // Always 200000 paise = ₹2,000

  // ── Timestamps ────────────────────────────────────────────
  created_at:    { type: Date, default: Date.now },
  completed_at:  { type: Date },
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-delete
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// ── Compound indexes ──────────────────────────────────────────
ReportSchema.index({ client_id: 1, created_at: -1 });
ReportSchema.index({ report_id: 1 }, { unique: true });
ReportSchema.index({ vendor_cin: 1 });
ReportSchema.index({ shareable_token: 1 });
ReportSchema.index({ payment_id: 1 });

// ── CRITICAL: Tenant isolation query helper ────────────────────
// ALWAYS use this — never query reports without client_id
ReportSchema.query.byClient = function(clientId) {
  return this.where({ client_id: clientId });
};

// ── Virtuals ──────────────────────────────────────────────────
ReportSchema.virtual('is_complete').get(function() {
  return this.status === 'complete';
});

ReportSchema.virtual('sources_available').get(function() {
  return this.raw_data?.sources_available ?? 0;
});

module.exports = mongoose.model('Report', ReportSchema);
