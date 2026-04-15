const mongoose = require('mongoose');

const AlertHistorySchema = new mongoose.Schema({
  alert_id:          { type: String, default: () => `alt_${Date.now().toString(36)}` },
  sent_at:           { type: Date, default: Date.now },
  severity:          { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
  change_type:       { type: String }, // e.g. 'VHS_DROP', 'HARD_FLAG', 'COURT_CASE'
  change_description:{ type: String },
  vhs_before:        { type: Number },
  vhs_after:         { type: Number },
  channels_sent:     { type: [String], default: [] }, // ['whatsapp', 'email']
  report_id:         { type: String }, // Latest report ID at time of alert
}, { _id: false });

const VendorMonitorSchema = new mongoose.Schema({
  // ── Tenant isolation ────────────────────────────────────────
  client_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Vendor ──────────────────────────────────────────────────
  vendor_cin:  { type: String, required: true },
  vendor_name: { type: String },
  vendor_gstin:{ type: String },

  // ── State ────────────────────────────────────────────────────
  active:      { type: Boolean, default: true },
  last_checked: { type: Date },
  last_data_hash: { type: String },   // MD5 of collected data — detect changes
  last_vhs:    { type: Number },
  last_snapshot: { type: mongoose.Schema.Types.Mixed }, // Last raw_data snapshot for diff

  // ── Alert Config ─────────────────────────────────────────────
  alert_config: {
    whatsapp:          { type: Boolean, default: false },
    email:             { type: Boolean, default: true },
    min_vhs_drop:      { type: Number, default: 10 },    // Trigger if VHS drops by this much
    severity_threshold:{ type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    frequency:         { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
    whatsapp_number:   { type: String },   // Override per-monitor (falls back to user preference)
    alert_email:       { type: String },
  },

  // ── Alert History (last 100) ──────────────────────────────────
  alert_history: { type: [AlertHistorySchema], default: [], slice: 100 },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

VendorMonitorSchema.index({ client_id: 1, active: 1 });
VendorMonitorSchema.index({ active: 1, last_checked: 1 }); // For nightly cron
VendorMonitorSchema.index({ vendor_cin: 1 });
VendorMonitorSchema.index({ client_id: 1, vendor_cin: 1 }, { unique: true }); // One monitor per vendor per client

module.exports = mongoose.model('VendorMonitor', VendorMonitorSchema);
