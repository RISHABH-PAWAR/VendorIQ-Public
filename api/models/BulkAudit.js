const mongoose = require('mongoose');

const BulkAuditSchema = new mongoose.Schema({
  audit_id:    { type: String, unique: true, default: () => `ba_${Date.now().toString(36)}` },
  client_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Input ───────────────────────────────────────────────────
  total_count:   { type: Number, required: true },
  input_csv_key:   { type: String },  // S3 key of uploaded CSV

  // ── Progress ─────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['queued', 'processing', 'complete', 'failed', 'partial'],
    default: 'queued',
  },
  completed_count: { type: Number, default: 0 },
  failed_count:    { type: Number, default: 0 },
  error_message:   { type: String },

  // ── Output ───────────────────────────────────────────────────
  excel_url:    { type: String },  // Pre-signed S3 URL for Excel download
  excel_s3_key: { type: String },
  excel_expires_at: { type: Date },

  // ── Billing ──────────────────────────────────────────────────
  payment_id:    { type: String },
  amount_charged:{ type: Number }, // In paise

  // ── Summary (populated on complete) ──────────────────────────
  summary: {
    high_risk:   { type: Number, default: 0 },
    medium_risk: { type: Number, default: 0 },
    low_risk:    { type: Number, default: 0 },
    avg_vhs:     { type: Number },
  },

  started_at:   { type: Date },
  completed_at: { type: Date },
  created_at:   { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

BulkAuditSchema.index({ audit_id: 1 }, { unique: true });
BulkAuditSchema.index({ client_id: 1, created_at: -1 });

module.exports = mongoose.model('BulkAudit', BulkAuditSchema);
