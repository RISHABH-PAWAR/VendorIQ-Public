const mongoose = require('mongoose');

const AuditResultSchema = new mongoose.Schema({
  audit_id:    { type: String, required: true, index: true },
  client_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  report_id:   { type: String },   // Linked Report._id once generated

  // ── Vendor ──────────────────────────────────────────────────
  vendor_cin:  { type: String, required: true },
  vendor_name: { type: String },

  // ── Result ───────────────────────────────────────────────────
  status:      { type: String, enum: ['pending', 'complete', 'failed'], default: 'pending' },
  vhs_score:   { type: Number, min: 0, max: 100 },
  risk_level:  { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] },
  recommendation: { type: String, enum: ['APPROVE', 'APPROVE_WITH_CONDITIONS', 'INVESTIGATE', 'REJECT'] },
  hard_flags:  { type: [String], default: [] }, // Flag codes only for Excel export
  error_message: { type: String },

  // ── For Excel export ordering ─────────────────────────────────
  rank:        { type: Number }, // 1 = highest risk (rank by ascending vhs_score)

  processed_at: { type: Date },
  created_at:   { type: Date, default: Date.now },
});

AuditResultSchema.index({ audit_id: 1, vhs_score: 1 }); // For ranking/sorting
AuditResultSchema.index({ client_id: 1 });
AuditResultSchema.index({ audit_id: 1, vendor_cin: 1 });

module.exports = mongoose.model('AuditResult', AuditResultSchema);
